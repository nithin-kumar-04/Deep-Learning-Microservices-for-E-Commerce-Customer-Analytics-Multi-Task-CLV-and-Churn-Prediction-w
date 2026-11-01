import os

# Configure the app before importing it so the test key is used everywhere.
os.environ.setdefault("API_KEY", "test-api-key")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:3000")

import pytest
from fastapi.testclient import TestClient

from api import APP_VERSION, app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def auth_headers():
    return {"X-API-Key": os.environ["API_KEY"]}


@pytest.fixture(scope="session")
def at_risk_customers(client, auth_headers):
    response = client.get("/at_risk_customers", headers=auth_headers)
    assert response.status_code == 200
    return response.json()


@pytest.fixture(scope="session")
def first_customer_id(at_risk_customers):
    if not at_risk_customers:
        pytest.skip("No at-risk customers were precomputed")
    return at_risk_customers[0]["id"]


def pytest_report_header(config):
    return f"Velora API {APP_VERSION}"
