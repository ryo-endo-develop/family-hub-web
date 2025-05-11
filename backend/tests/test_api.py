from fastapi.testclient import TestClient


def test_read_main(client: TestClient):
    """
    ルートエンドポイントのテスト
    """
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to SyncFam API"}


def test_docs_endpoint(client: TestClient):
    """
    Swagger UIのエンドポイントのテスト
    """
    response = client.get("/api/v1/docs")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
