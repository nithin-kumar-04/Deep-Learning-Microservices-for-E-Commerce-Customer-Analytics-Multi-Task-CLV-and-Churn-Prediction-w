import pytest
import pandas as pd
import os

from src.data_prep import load_and_clean_data

@pytest.fixture(scope="module")
def cleaned_data():
    # Only run the test if the data exists, to save time on setup
    filepath = "data/Online Retail.xlsx"
    if not os.path.exists(filepath):
        pytest.skip(f"Dataset not found at {filepath}")
    
    df = load_and_clean_data(filepath)
    return df

def test_no_missing_customer_ids(cleaned_data):
    """Verify that there are no missing CustomerIDs after cleaning."""
    assert cleaned_data['CustomerID'].isnull().sum() == 0, "Found null CustomerIDs!"

def test_no_negative_quantities(cleaned_data):
    """Verify that there are no negative quantities (cancelled orders)."""
    assert (cleaned_data['Quantity'] <= 0).sum() == 0, "Found zero or negative quantities!"

def test_no_negative_unit_price(cleaned_data):
    """Verify that there are no negative unit prices."""
    assert (cleaned_data['UnitPrice'] < 0).sum() == 0, "Found negative Unit Prices!"

def test_totalsales_calculation(cleaned_data):
    """Verify TotalSales is calculated correctly."""
    # Check a small sample
    sample = cleaned_data.head()
    for _, row in sample.iterrows():
        assert row['TotalSales'] == row['Quantity'] * row['UnitPrice']
