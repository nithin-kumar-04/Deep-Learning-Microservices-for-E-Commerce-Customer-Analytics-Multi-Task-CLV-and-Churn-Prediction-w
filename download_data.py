import urllib.request
import zipfile
import os

url = "https://archive.ics.uci.edu/ml/machine-learning-databases/00352/Online%20Retail.xlsx"
filepath = "data/Online Retail.xlsx"

print(f"Downloading dataset from {url}...")
urllib.request.urlretrieve(url, filepath)
print("Download complete.")
