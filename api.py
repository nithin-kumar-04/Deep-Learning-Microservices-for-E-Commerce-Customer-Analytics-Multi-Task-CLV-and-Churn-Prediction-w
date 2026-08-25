from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import pandas as pd
import numpy as np
import pickle
import io
import os
import boto3

# Import model architectures
from src.dl_clv_churn import MultiTaskCLVChurn
from src.dl_recommender import NCFRecommender

app = FastAPI(title="E-Commerce ML API", version="1.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, replace with the AWS Amplify domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Globals for loaded artifacts
clv_model = None
rec_model = None
scaler = None
user_mapping = None
item_mapping = None
item_to_desc = None

def download_from_s3(file_path: str):
    """Downloads a file from S3 if S3_BUCKET_NAME is set and file doesn't exist."""
    bucket_name = os.environ.get("S3_BUCKET_NAME")
    if bucket_name and not os.path.exists(file_path):
        print(f"Downloading {file_path} from S3 bucket {bucket_name}...")
        s3 = boto3.client('s3')
        # Ensure directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        try:
            s3.download_file(bucket_name, file_path, file_path)
            print(f"Successfully downloaded {file_path}")
        except Exception as e:
            print(f"Failed to download {file_path} from S3: {e}")

@app.on_event("startup")
def load_artifacts():
    global clv_model, rec_model, scaler, user_mapping, item_mapping, item_to_desc
    
    # Check and download artifacts from S3 if needed
    download_from_s3("artifacts/scaler.pkl")
    download_from_s3("artifacts/dl_clv_churn.pt")
    download_from_s3("data/cleaned_retail.parquet")
    download_from_s3("artifacts/dl_recommender.pt")
    
    # 1. Load Scaler
    if os.path.exists("artifacts/scaler.pkl"):
        with open("artifacts/scaler.pkl", "rb") as f:
            scaler = pickle.load(f)
            
    # 2. Reconstruct DL CLV Model (Needs correct input dim. Scaler has 3 features)
    clv_model = MultiTaskCLVChurn(input_dim=3)
    if os.path.exists("artifacts/dl_clv_churn.pt"):
        clv_model.load_state_dict(torch.load("artifacts/dl_clv_churn.pt", map_location=torch.device('cpu')))
    clv_model.eval()
    
    # 3. Read mapping artifacts (from parquet or create a dedicated mapping artifact).
    # For a robust API, we read the cleaned data to reconstruct mappings if they weren't saved separately.
    if os.path.exists("data/cleaned_retail.parquet"):
        df = pd.read_parquet("data/cleaned_retail.parquet")
        interactions = df[['CustomerID', 'StockCode', 'Description']].drop_duplicates()
        user_mapping = {id: idx for idx, id in enumerate(interactions['CustomerID'].unique())}
        item_mapping = {id: idx for idx, id in enumerate(interactions['StockCode'].unique())}
        item_to_desc = interactions.set_index('StockCode')['Description'].to_dict()
        
        # 4. Reconstruct NCF Model
        rec_model = NCFRecommender(len(user_mapping), len(item_mapping))
        if os.path.exists("artifacts/dl_recommender.pt"):
            rec_model.load_state_dict(torch.load("artifacts/dl_recommender.pt", map_location=torch.device('cpu')))
        rec_model.eval()

class CLVRequest(BaseModel):
    recency: float
    frequency: float
    monetary: float

@app.post("/predict/clv")
def predict_clv(req: CLVRequest):
    """Predicts Churn Probability and 90-Day CLV for a single user's RFM inputs."""
    if scaler is None or clv_model is None:
        raise HTTPException(status_code=500, detail="Model artifacts not loaded.")
        
    x_scaled = scaler.transform([[req.recency, req.frequency, req.monetary]])
    features = torch.tensor(x_scaled, dtype=torch.float32)
    
    with torch.no_grad():
        clv_pred, churn_logits = clv_model(features)
        churn_prob = torch.sigmoid(churn_logits).item()
        clv = clv_pred.item()
        
    return {
        "churn_probability": float(churn_prob),
        "predicted_clv_90d": float(clv)
    }

@app.get("/recommend/{customer_id}")
def recommend(customer_id: int):
    """Returns top 5 NCF recommendations for a customer."""
    if rec_model is None or user_mapping is None:
        raise HTTPException(status_code=500, detail="Recommender model not loaded.")
        
    if customer_id not in user_mapping:
        raise HTTPException(status_code=404, detail="Customer not found in embedding matrix.")
        
    u_idx = user_mapping[customer_id]
    
    with torch.no_grad():
        user_emb = rec_model.user_embedding(torch.tensor([u_idx]))
        all_items = torch.arange(len(item_mapping))
        item_emb = rec_model.item_embedding(all_items)
        
        scores = torch.matmul(user_emb, item_emb.T)
        top5_scores, top5_indices = torch.topk(scores, 5, dim=1)
        
        # Min-Max Scaling
        min_scores = top5_scores.min(dim=1, keepdim=True)[0]
        max_scores = top5_scores.max(dim=1, keepdim=True)[0]
        top5_affinity = 0.75 + 0.23 * ((top5_scores - min_scores) / (max_scores - min_scores + 1e-8))
        
        inv_item_mapping = {v: k for k, v in item_mapping.items()}
        
        recs = []
        for rank, (i_idx, affinity) in enumerate(zip(top5_indices[0].tolist(), top5_affinity[0].tolist())):
            stock_code = inv_item_mapping[i_idx]
            recs.append({
                "rank": rank + 1,
                "stock_code": stock_code,
                "description": item_to_desc.get(stock_code, "Unknown"),
                "affinity_score": float(affinity)
            })
            
    return {"customer_id": customer_id, "recommendations": recs}

@app.post("/batch_predict")
async def batch_predict(file: UploadFile = File(...)):
    """Processes a CSV of Customer RFM features and returns predictions."""
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
    
    required_cols = ['CustomerID', 'Recency', 'Frequency', 'Monetary']
    if not all(col in df.columns for col in required_cols):
        raise HTTPException(status_code=400, detail=f"CSV must contain {required_cols}")
        
    X = scaler.transform(df[['Recency', 'Frequency', 'Monetary']])
    features = torch.tensor(X, dtype=torch.float32)
    
    with torch.no_grad():
        clv_preds, churn_logits = clv_model(features)
        churn_probs = torch.sigmoid(churn_logits).squeeze().numpy()
        clv_preds = clv_preds.squeeze().numpy()
        
    df['Predicted_CLV_90d'] = clv_preds
    df['Churn_Probability'] = churn_probs
    
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    
    return {"filename": "batch_predictions.csv", "csv_data": stream.getvalue()}

