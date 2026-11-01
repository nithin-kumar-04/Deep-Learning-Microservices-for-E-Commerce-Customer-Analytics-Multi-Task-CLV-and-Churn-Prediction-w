"""Download the UCI Online Retail dataset used to train the models."""

import urllib.request
from pathlib import Path

URL = "https://archive.ics.uci.edu/ml/machine-learning-databases/00352/Online%20Retail.xlsx"
DEST = Path("data/Online Retail.xlsx")


def main() -> None:
    if DEST.exists():
        size_mb = DEST.stat().st_size / 1_048_576
        print(f"{DEST} already exists ({size_mb:.1f} MB). Delete it to re-download.")
        return

    DEST.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {URL} ...")
    urllib.request.urlretrieve(URL, DEST)
    print(f"Saved {DEST} ({DEST.stat().st_size / 1_048_576:.1f} MB).")


if __name__ == "__main__":
    main()
