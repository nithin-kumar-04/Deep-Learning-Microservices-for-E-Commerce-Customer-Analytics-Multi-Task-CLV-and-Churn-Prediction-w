import pandas as pd

from src.data_prep import load_and_clean_data, save_clean_data


def test_load_and_clean_data_filters_and_enriches(tmp_path):
    raw = pd.DataFrame(
        {
            "InvoiceNo": ["1", "2", "3", "4"],
            "StockCode": ["A", "B", "C", "D"],
            "Description": ["Item A", "Item B", "Cancelled", None],
            "Quantity": [2, 1, -5, 3],
            "InvoiceDate": pd.to_datetime(["2011-01-01", "2011-01-02", "2011-01-03", "2011-01-04"]),
            "UnitPrice": [1.5, 2.0, 9.0, 4.0],
            "CustomerID": [1001.0, 1002.0, 1001.0, None],
            "Country": ["United Kingdom"] * 4,
        }
    )
    raw_path = tmp_path / "raw.xlsx"
    raw.to_excel(raw_path, index=False)

    cleaned = load_and_clean_data(str(raw_path))

    assert len(cleaned) == 2
    assert (cleaned["Quantity"] > 0).all()
    assert cleaned["CustomerID"].dtype.kind in {"i", "u"}
    assert cleaned["Description"].notna().all()
    assert (cleaned["TotalSales"] == cleaned["Quantity"] * cleaned["UnitPrice"]).all()
    assert cleaned["StockCode"].map(type).eq(str).all()


def test_save_clean_data_writes_parquet(tmp_path):
    df = pd.DataFrame({"CustomerID": [1], "TotalSales": [9.99]})
    out_path = tmp_path / "cleaned.parquet"

    save_clean_data(df, str(out_path))

    assert out_path.exists()
    assert pd.read_parquet(out_path).iloc[0]["CustomerID"] == 1
