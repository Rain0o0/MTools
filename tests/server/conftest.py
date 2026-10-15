from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from mtools.bootstrap.app import create_app
from mtools.bootstrap.config import Settings


@pytest.fixture
def client(tmp_path: Path) -> Iterator[TestClient]:
    with TestClient(
        create_app(Settings(data_dir=tmp_path)), base_url="http://127.0.0.1:8000"
    ) as value:
        yield value


@pytest.fixture
def authenticated(client: TestClient) -> TestClient:
    response = client.post("/api/v1/session", headers={"Origin": "http://127.0.0.1:8000"})
    assert response.status_code == 200
    client.headers["X-CSRF-Token"] = response.json()["csrf_token"]
    return client
