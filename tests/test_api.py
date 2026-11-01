import io

import pytest

from api import APP_VERSION


def test_health_reports_models_and_version(client):
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["version"] == APP_VERSION
    assert body["models_loaded"] is True
    assert "x-process-time-ms" in response.headers


def test_root_and_version(client):
    root = client.get("/")
    assert root.status_code == 200
    assert root.json()["service"] == "Velora API"

    version = client.get("/version")
    assert version.status_code == 200
    assert version.json() == {"name": "Velora", "version": APP_VERSION}


@pytest.mark.parametrize(
    "path",
    ["/segments", "/business_overview", "/product_analytics", "/at_risk_customers"],
)
def test_protected_endpoints_reject_bad_key(client, path):
    response = client.get(path, headers={"X-API-Key": "wrong-key"})
    assert response.status_code == 403
    assert response.json()["detail"] == "Could not validate credentials"


def test_predict_clv(client, auth_headers):
    response = client.post(
        "/predict/clv",
        json={"recency": 30, "frequency": 8, "monetary": 2500},
        headers=auth_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert 0.0 <= body["churn_probability"] <= 1.0
    assert body["predicted_clv_90d"] >= 0.0


def test_explain_contributions(client, auth_headers):
    response = client.post(
        "/explain",
        json={"recency": 30, "frequency": 8, "monetary": 2500},
        headers=auth_headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body["contributions"]) == {"Recency", "Frequency", "Monetary"}
    assert 0.0 <= body["prediction"] <= 1.0


def test_at_risk_customers(client, auth_headers, at_risk_customers):
    assert isinstance(at_risk_customers, list)
    assert at_risk_customers, "expected precomputed at-risk customers"

    customer = at_risk_customers[0]
    assert {"id", "churnRisk", "clv", "recency", "freq", "status"} <= set(customer)
    assert 0.0 <= customer["churnRisk"] <= 1.0


def test_customer_rfm(client, auth_headers, first_customer_id):
    response = client.get(f"/customer/{first_customer_id}/rfm", headers=auth_headers)

    assert response.status_code == 200
    assert set(response.json()) == {"recency", "frequency", "monetary"}


def test_recommendations(client, auth_headers, first_customer_id):
    response = client.get(f"/recommend/{first_customer_id}", headers=auth_headers)

    assert response.status_code == 200
    recommendations = response.json()["recommendations"]
    assert len(recommendations) == 5
    assert [rec["rank"] for rec in recommendations] == [1, 2, 3, 4, 5]


def test_recommendations_unknown_customer(client, auth_headers):
    response = client.get("/recommend/999999999", headers=auth_headers)
    assert response.status_code == 404


def test_segments(client, auth_headers):
    response = client.get("/segments", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body["summary"]) == 4
    assert 0 < len(body["scatter"]) <= 500
    assert "max-age=300" in response.headers["cache-control"]


def test_business_overview(client, auth_headers):
    response = client.get("/business_overview", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["historical_monthly"]
    assert body["forecast_90d"] > 0
    assert body["total_historical"] > 0


def test_product_analytics(client, auth_headers):
    response = client.get("/product_analytics", headers=auth_headers)

    assert response.status_code == 200
    products = response.json()["top_products"]
    assert len(products) == 20
    assert {"stock_code", "description", "revenue", "quantity", "buyers"} <= set(products[0])


def test_batch_predict_roundtrip(client, auth_headers):
    csv_bytes = (
        "CustomerID,Recency,Frequency,Monetary\n"
        "12345,10,5,500\n"
        "13000,120,2,80\n"
    ).encode("utf-8")

    response = client.post(
        "/batch_predict",
        files={"file": ("batch.csv", io.BytesIO(csv_bytes), "text/csv")},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "Predicted_CLV_90d" in response.text
    assert "Churn_Probability" in response.text


def test_generate_email_uses_brand(client, auth_headers, first_customer_id):
    response = client.post(f"/generate_email/{first_customer_id}", headers=auth_headers)

    assert response.status_code == 200
    assert "Velora" in response.json()["email_template"]
