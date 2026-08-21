import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from sklearn.preprocessing import StandardScaler
import os
from datetime import timedelta

class CustomerDataset(Dataset):
    def __init__(self, features, clv_labels, churn_labels):
        self.features = torch.tensor(features, dtype=torch.float32)
        self.clv_labels = torch.tensor(clv_labels, dtype=torch.float32).unsqueeze(1)
        self.churn_labels = torch.tensor(churn_labels, dtype=torch.float32).unsqueeze(1)

    def __len__(self):
        return len(self.features)

    def __getitem__(self, idx):
        return self.features[idx], self.clv_labels[idx], self.churn_labels[idx]

class MultiTaskCLVChurn(nn.Module):
    def __init__(self, input_dim):
        super(MultiTaskCLVChurn, self).__init__()
        # Shared layers
        self.shared = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 16),
            nn.ReLU()
        )
        
        # Head 1: CLV Regression (Continuous)
        self.clv_head = nn.Sequential(
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, 1),
            nn.ReLU() # CLV can't be negative
        )
        
        # Head 2: Churn Classification (Probability)
        self.churn_head = nn.Sequential(
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, 1)
        )

    def forward(self, x):
        shared_rep = self.shared(x)
        clv_pred = self.clv_head(shared_rep)
        churn_logits = self.churn_head(shared_rep)
        return clv_pred, churn_logits

def prepare_mtl_data(df: pd.DataFrame):
    print("Preparing RFM features for Multi-Task DL model...")
    # Time split: use first 9 months for features, last 3 months for labels
    cutoff_date = df['InvoiceDate'].max() - timedelta(days=90)
    
    # Feature Data (Before Cutoff)
    feature_df = df[df['InvoiceDate'] < cutoff_date]
    rfm_features = feature_df.groupby('CustomerID').agg({
        'InvoiceDate': lambda x: (cutoff_date - x.max()).days,
        'InvoiceNo': 'nunique',
        'TotalSales': 'sum'
    }).rename(columns={'InvoiceDate': 'Recency', 'InvoiceNo': 'Frequency', 'TotalSales': 'Monetary'})
    
    # Label Data (After Cutoff)
    label_df = df[df['InvoiceDate'] >= cutoff_date]
    future_spend = label_df.groupby('CustomerID')['TotalSales'].sum()
    
    # Merge
    mtl_data = rfm_features.join(future_spend.rename('Future_CLV'), how='left').fillna(0)
    
    # Churn Label: 1 if they spent 0 in the last 90 days, else 0
    mtl_data['Churn'] = (mtl_data['Future_CLV'] == 0).astype(int)
    
    # Filter negatives
    mtl_data = mtl_data[mtl_data['Monetary'] > 0]
    
    # Scale Features
    scaler = StandardScaler()
    X = scaler.fit_transform(mtl_data[['Recency', 'Frequency', 'Monetary']])
    y_clv = mtl_data['Future_CLV'].values
    y_churn = mtl_data['Churn'].values
    
    return mtl_data.index.values, X, y_clv, y_churn, scaler, mtl_data

def train_mtl_model(X, y_clv, y_churn, epochs=15, batch_size=256):
    print(f"Training MTL Model for {epochs} epochs...")
    dataset = CustomerDataset(X, y_clv, y_churn)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    model = MultiTaskCLVChurn(input_dim=X.shape[1])
    
    # Two loss functions
    criterion_clv = nn.MSELoss()
    criterion_churn = nn.BCEWithLogitsLoss()
    
    optimizer = torch.optim.Adam(model.parameters(), lr=0.005)
    
    model.train()
    for epoch in range(epochs):
        total_loss = 0
        for features, clv_labels, churn_labels in dataloader:
            optimizer.zero_grad()
            
            clv_preds, churn_logits = model(features)
            
            # Combine losses (we weight CLV loss lower because MSE scales large)
            loss_clv = criterion_clv(clv_preds, clv_labels) * 0.0001
            loss_churn = criterion_churn(churn_logits, churn_labels)
            
            loss = loss_clv + loss_churn
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            
        print(f"Epoch {epoch+1}/{epochs} - MTL Loss: {total_loss/len(dataloader):.4f}")
        
    return model

def precompute_clv_churn(model, customer_ids, X, mtl_data):
    print("Precomputing DL CLV & Churn predictions for zero-lag UI...")
    model.eval()
    with torch.no_grad():
        features = torch.tensor(X, dtype=torch.float32)
        clv_preds, churn_logits = model(features)
        
        churn_probs = torch.sigmoid(churn_logits).squeeze().numpy()
        clv_preds = clv_preds.squeeze().numpy()
        
    df_preds = pd.DataFrame({
        'CustomerID': customer_ids,
        'DL_Predicted_CLV_90d': clv_preds,
        'DL_Churn_Probability': churn_probs,
        'Historical_Spend': mtl_data['Monetary'].values,
        'Historical_Orders': mtl_data['Frequency'].values,
        'Recency_Days': mtl_data['Recency'].values
    })
    
    # Assign a Segment Badge based on RFM + DL Predictions
    def assign_segment(row):
        if row['DL_Predicted_CLV_90d'] > df_preds['DL_Predicted_CLV_90d'].quantile(0.75) and row['DL_Churn_Probability'] < 0.3:
            return "Champion"
        elif row['DL_Predicted_CLV_90d'] > df_preds['DL_Predicted_CLV_90d'].quantile(0.75) and row['DL_Churn_Probability'] > 0.5:
            return "At-Risk VIP"
        elif row['Historical_Spend'] < df_preds['Historical_Spend'].quantile(0.25) and row['DL_Churn_Probability'] > 0.7:
            return "Hibernating"
        elif row['Recency_Days'] < 30 and row['Historical_Orders'] == 1:
            return "New Customer"
        else:
            return "Regular"
            
    df_preds['Segment_Badge'] = df_preds.apply(assign_segment, axis=1)
    
    return df_preds

import pickle

if __name__ == "__main__":
    df = pd.read_parquet("data/cleaned_retail.parquet")
    customer_ids, X, y_clv, y_churn, scaler, mtl_data = prepare_mtl_data(df)
    
    model = train_mtl_model(X, y_clv, y_churn, epochs=15)
    
    os.makedirs("artifacts", exist_ok=True)
    torch.save(model.state_dict(), "artifacts/dl_clv_churn.pt")
    with open("artifacts/scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)
    
    preds_df = precompute_clv_churn(model, customer_ids, X, mtl_data)
    preds_df.to_parquet("data/dl_clv_predictions.parquet", index=False)
    print("DL predictions saved to data/dl_clv_predictions.parquet")
