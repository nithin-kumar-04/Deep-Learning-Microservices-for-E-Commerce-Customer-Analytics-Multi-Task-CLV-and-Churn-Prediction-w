from fastapi import FastAPI, UploadFile, File, HTTPException, Security, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
import torch
import pandas as pd
import numpy as np
import pickle
import io
import os
import boto3
from functools import lru_cache
from itertools import combinations
from math import factorial

# Import model architectures
from src.dl_clv_churn import MultiTaskCLVChurn
from src.dl_recommender import NCFRecommender

app = FastAPI(title="E-Commerce ML API", version="1.0")

# Security
API_KEY = os.environ.get("API_KEY", "default-secret-key")
api_key_header = APIKeyHeader(name="X-API-Key")

def get_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Could not validate credentials")
    return api_key

# Enable CORS for Next.js frontend
allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Configurable via environment variable
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
background_data = None
top_at_risk_cache = []

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
    global clv_model, rec_model, scaler, user_mapping, item_mapping, item_to_desc, background_data, top_at_risk_cache
    
    # Check and download artifacts from S3 if needed
    download_from_s3("artifacts/scaler.pkl")
    download_from_s3("artifacts/dl_clv_churn.pt")
    download_from_s3("data/cleaned_retail.parquet")
    download_from_s3("artifacts/dl_recommender.pt")
    download_from_s3("artifacts/background.npy")
    
    # 1. Load Scaler
    if os.path.exists("artifacts/scaler.pkl"):
        with open("artifacts/scaler.pkl", "rb") as f:
            scaler = pickle.load(f)
            
    # 2. Reconstruct DL CLV Model (Needs correct input dim. Scaler has 3 features)
    clv_model = MultiTaskCLVChurn(input_dim=3)
    if os.path.exists("artifacts/dl_clv_churn.pt"):
        clv_model.load_state_dict(torch.load("artifacts/dl_clv_churn.pt", map_location=torch.device('cpu')))
    clv_model.eval()
    
    # Load Background Data for Explanations
    if not os.path.exists("artifacts/background.npy"):
        try:
            print("Generating background.npy from training data...")
            from src.dl_clv_churn import prepare_mtl_data
            if os.path.exists("data/cleaned_retail.parquet"):
                df_bg = pd.read_parquet("data/cleaned_retail.parquet")
                _, X_bg, _, _, _, _ = prepare_mtl_data(df_bg)
                np.random.seed(42)
                indices = np.random.choice(len(X_bg), size=min(200, len(X_bg)), replace=False)
                background_data = X_bg[indices]
                np.save("artifacts/background.npy", background_data)
        except Exception as e:
            print("Failed to generate background.npy:", e)
    else:
        background_data = np.load("artifacts/background.npy")
    
    # 3. Read mapping artifacts (from parquet or create a dedicated mapping artifact).
    # For a robust API, we read the cleaned data to reconstruct mappings if they weren't saved separately.
    if os.path.exists("data/cleaned_retail.parquet"):
        df = pd.read_parquet("data/cleaned_retail.parquet")
        interactions = df[['CustomerID', 'StockCode', 'Description']].drop_duplicates()
        user_mapping = {id: idx for idx, id in enumerate(interactions['CustomerID'].unique())}
        item_mapping = {id: idx for idx, id in enumerate(interactions['StockCode'].unique())}
        item_to_desc = interactions.set_index('StockCode')['Description'].to_dict()
        
        rec_model = NCFRecommender(len(user_mapping), len(item_mapping))
        if os.path.exists("artifacts/dl_recommender.pt"):
            rec_model.load_state_dict(torch.load("artifacts/dl_recommender.pt", map_location=torch.device('cpu')))
        rec_model.eval()
        
        # Precompute At-Risk Customers
        try:
            from src.dl_clv_churn import prepare_mtl_data
            user_ids, X_full, _, _, _, mtl_data = prepare_mtl_data(df)
            features_full = torch.tensor(X_full, dtype=torch.float32)
            with torch.no_grad():
                clv_preds, churn_logits = clv_model(features_full)
                churn_probs = torch.sigmoid(churn_logits).squeeze().numpy()
                clv_preds = clv_preds.squeeze().numpy()
            
            mtl_data['Churn_Risk'] = churn_probs
            mtl_data['Predicted_CLV'] = clv_preds
            mtl_data['CustomerID'] = user_ids
            top_risk = mtl_data.sort_values(by="Churn_Risk", ascending=False).head(50)
            
            top_at_risk_cache.clear()
            for _, row in top_risk.iterrows():
                status = "Critical" if row['Churn_Risk'] > 0.8 else ("High Risk" if row['Churn_Risk'] > 0.5 else "Medium Risk")
                top_at_risk_cache.append({
                    "id": str(int(row['CustomerID'])),
                    "churnRisk": float(row['Churn_Risk']),
                    "clv": float(row['Predicted_CLV']),
                    "recency": int(row['Recency']),
                    "freq": int(row['Frequency']),
                    "status": status
                })
        except Exception as e:
            print("Failed to precompute at risk customers:", e)

@app.get("/health")
def health_check():
    """Health check for AWS Load Balancer."""
    return {"status": "healthy"}

class CLVRequest(BaseModel):
    recency: float
    frequency: float
    monetary: float

@lru_cache(maxsize=1024)
def _predict_clv_cached(recency: float, frequency: float, monetary: float):
    x_scaled = scaler.transform([[recency, frequency, monetary]])
    features = torch.tensor(x_scaled, dtype=torch.float32)
    
    with torch.no_grad():
        clv_pred, churn_logits = clv_model(features)
        churn_prob = torch.sigmoid(churn_logits).item()
        clv = clv_pred.item()
        
    return {
        "churn_probability": float(churn_prob),
        "predicted_clv_90d": float(clv)
    }

@app.post("/predict/clv")
def predict_clv(req: CLVRequest, api_key: str = Depends(get_api_key)):
    """Predicts Churn Probability and 90-Day CLV for a single user's RFM inputs."""
    if scaler is None or clv_model is None:
        raise HTTPException(status_code=500, detail="Model artifacts not loaded.")
        
    return _predict_clv_cached(req.recency, req.frequency, req.monetary)

def shapley_exact(predict_fn, x, background):
    """x: (3,) scaled features. background: (n,3) sample of scaled training rows.
    predict_fn: (n,3) -> (n,) churn probability."""
    d = len(x)
    phi = np.zeros(d)

    def v(S):
        Xb = background.copy()
        for j in S:
            Xb[:, j] = x[j]
        return predict_fn(Xb).mean()

    for i in range(d):
        others = [j for j in range(d) if j != i]
        for r in range(d):
            for S in combinations(others, r):
                w = factorial(len(S)) * factorial(d - len(S) - 1) / factorial(d)
                phi[i] += w * (v(S + (i,)) - v(S))
    return phi

@app.post("/explain")
def explain_clv(req: CLVRequest, api_key: str = Depends(get_api_key)):
    if scaler is None or clv_model is None or background_data is None:
        raise HTTPException(status_code=500, detail="Model artifacts not loaded.")

    x_scaled = scaler.transform([[req.recency, req.frequency, req.monetary]])[0]
    
    def predict_fn(xb):
        features = torch.tensor(xb, dtype=torch.float32)
        with torch.no_grad():
            _, churn_logits = clv_model(features)
            churn_probs = torch.sigmoid(churn_logits).squeeze().numpy()
            # If batch size is 1, ensure it's still an array
            if churn_probs.ndim == 0:
                churn_probs = np.array([churn_probs])
        return churn_probs
        
    base_value = predict_fn(background_data).mean()
    prediction = predict_fn(np.array([x_scaled]))[0]
    
    phi = shapley_exact(predict_fn, x_scaled, background_data)
    
    return {
        "base_value": float(base_value),
        "prediction": float(prediction),
        "contributions": {
            "Recency": float(phi[0]),
            "Frequency": float(phi[1]),
            "Monetary": float(phi[2])
        }
    }

@lru_cache(maxsize=1024)
def _recommend_cached(customer_id: int):
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

@app.get("/recommend/{customer_id}")
def recommend(customer_id: int, api_key: str = Depends(get_api_key)):
    """Returns top 5 NCF recommendations for a customer."""
    if rec_model is None or user_mapping is None:
        raise HTTPException(status_code=500, detail="Recommender model not loaded.")
        
    if customer_id not in user_mapping:
        raise HTTPException(status_code=404, detail="Customer not found in embedding matrix.")
        
    return _recommend_cached(customer_id)

@app.post("/batch_predict")
async def batch_predict(file: UploadFile = File(...), api_key: str = Depends(get_api_key)):
    """Processes a CSV of Customer RFM features and returns predictions."""
    contents = await file.read()
    
    # Security: File size limit checking
    MAX_FILE_SIZE = 5 * 1024 * 1024 # 5 MB
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 5MB.")
        
    # Security Warning: scaler.pkl is loaded using pickle.load() at startup. 
    # Ensure the S3 bucket is tightly access-controlled, as pickle deserialization 
    # can execute arbitrary code if the file is tampered with.
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
    from fastapi.responses import Response
    return Response(
        content=stream.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=batch_predictions.csv"}
    )

@app.get("/at_risk_customers")
def at_risk_customers(api_key: str = Depends(get_api_key)):
    """Returns the precomputed list of top at-risk customers."""
    return top_at_risk_cache
