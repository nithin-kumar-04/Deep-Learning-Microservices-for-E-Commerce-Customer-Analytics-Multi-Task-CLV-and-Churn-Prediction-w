import subprocess
import sys

scripts = [
    "src/dl_recommender.py",
    "src/dl_clv_churn.py"
]

for script in scripts:
    print(f"=============================")
    print(f"Running PyTorch script {script}...")
    result = subprocess.run([sys.executable, script])
    if result.returncode != 0:
        print(f"Error running {script}. Exiting.")
        sys.exit(1)

print("=============================")
print("Deep Learning Pipeline complete!")
