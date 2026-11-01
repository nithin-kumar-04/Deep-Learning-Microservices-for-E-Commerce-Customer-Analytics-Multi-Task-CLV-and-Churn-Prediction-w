"""Run the data preparation and model training pipeline end to end."""

import subprocess
import sys
import time
from pathlib import Path

CLEAN_DATA = Path("data/cleaned_retail.parquet")
MODEL_SCRIPTS = [
    "src/dl_recommender.py",
    "src/dl_clv_churn.py",
]


def run(script: str) -> None:
    print("=" * 40)
    print(f"Running {script} ...")
    started = time.perf_counter()
    result = subprocess.run([sys.executable, script])
    elapsed = time.perf_counter() - started
    if result.returncode != 0:
        print(f"Error running {script}. Exiting.")
        sys.exit(result.returncode)
    print(f"Finished {script} in {elapsed:.1f}s")


def main() -> None:
    if not CLEAN_DATA.exists():
        print("Cleaned data not found; preparing it first.")
        run("src/data_prep.py")

    for script in MODEL_SCRIPTS:
        run(script)

    print("=" * 40)
    print("Pipeline complete. Artifacts are in artifacts/.")


if __name__ == "__main__":
    main()
