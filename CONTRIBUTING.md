# Contributing

Thanks for improving Velora. This project combines a PyTorch/FastAPI backend with a Next.js dashboard.

## Setup

```bash
# Python 3.11 (on Windows, use a short venv path — see the README)
python -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt

# Dashboard
cd frontend
npm ci
```

## Before opening a pull request

```bash
ruff check .
pytest

cd frontend
npm run lint
npm run build
```

CI runs the same checks (`.github/workflows/ci.yml`), so a green local run should match GitHub.

## Conventions

- Keep changes focused: one feature or fix per pull request.
- Use imperative commit messages (`add batch validation`, `fix churn threshold`).
- Add or update tests when changing the API, model architectures, or data pipeline.
- Do not commit `node_modules/`, `venv/`, `.env` files, Terraform binaries, or model checkpoints outside `artifacts/`.
- Never commit real API keys or AWS credentials.

## Project layout

| Path | Purpose |
|---|---|
| `api.py` | FastAPI service and startup precomputation |
| `src/` | Data preparation and PyTorch models |
| `tests/` | Pytest unit and API tests |
| `frontend/` | Next.js 16 dashboard (static export) |
| `terraform/` | AWS infrastructure (EC2 + S3) |
| `Dockerfile`, `docker-compose.yml` | Containerized API + dashboard |
