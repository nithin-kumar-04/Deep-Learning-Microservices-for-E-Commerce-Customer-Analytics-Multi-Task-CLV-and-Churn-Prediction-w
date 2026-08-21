import pandas as pd
import numpy as np

def load_and_clean_data(filepath: str) -> pd.DataFrame:
    """
    Loads the Online Retail dataset, cleans it, and returns the processed DataFrame.
    """
    print(f"Loading data from {filepath}...")
    df = pd.read_excel(filepath)
    
    print(f"Original shape: {df.shape}")
    
    # 1. Remove rows with missing CustomerID
    df = df.dropna(subset=['CustomerID'])
    
    # 2. Convert CustomerID to integer (since it's a float by default with NaNs)
    df['CustomerID'] = df['CustomerID'].astype(int)
    
    # 3. Filter out cancelled orders (Quantity < 0) and missing descriptions
    df = df[df['Quantity'] > 0]
    df = df.dropna(subset=['Description'])
    
    # 4. Remove rows where UnitPrice < 0 (if any)
    df = df[df['UnitPrice'] >= 0]
    
    # 5. Create TotalSales column
    df['TotalSales'] = df['Quantity'] * df['UnitPrice']
    
    # Cast StockCode to string to prevent PyArrow ArrowTypeError on mixed types
    df['StockCode'] = df['StockCode'].astype(str)
    
    # 6. Filter for UK only (optional, can be done later, but requested for basket analysis)
    # df = df[df['Country'] == 'United Kingdom']
    
    print(f"Cleaned shape: {df.shape}")
    return df

def save_clean_data(df: pd.DataFrame, out_path: str):
    print(f"Saving cleaned data to {out_path}...")
    df.to_parquet(out_path, index=False)
    print("Done.")

if __name__ == "__main__":
    raw_path = "data/Online Retail.xlsx"
    clean_path = "data/cleaned_retail.parquet"
    
    clean_df = load_and_clean_data(raw_path)
    save_clean_data(clean_df, clean_path)
