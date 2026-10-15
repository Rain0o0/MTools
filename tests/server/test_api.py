from pathlib import Path
from typing import cast

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from mtools.bootstrap.app import create_app
from mtools.bootstrap.config import Settings

EXECUTE = "/api/v1/tools/json-formatter/operations/format/execute"


def test_bootstrap_origin_host_and_session_boundaries(client: TestClient) -> None:
    assert client.get("/health/ready").status_code == 200
    assert client.get("/api/v1/tools").status_code == 401
    assert client.post("/api/v1/session").status_code == 403
    assert (
        client.post("/api/v1/session", headers={"Origin": "https://untrusted.invalid"}).status_code
        == 403
    )
    assert client.get("/health/live", headers={"Host": "rebind.invalid"}).status_code == 400
    response = client.post("/api/v1/session", headers={"Origin": "http://127.0.0.1:8000"})
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "SameSite=strict" in response.headers["set-cookie"]
    assert response.headers["cache-control"] == "no-store"
    assert client.get("/api/v1/tools").status_code == 200
    denied = client.post(EXECUTE, json={"parameters": {"text": "{}"}})
    assert denied.status_code == 403
    assert denied.json()["error"]["code"] == "CSRF_FAILED"


def test_catalog_contract_and_real_operation(authenticated: TestClient) -> None:
    response = authenticated.get("/api/v1/tools?limit=1")
    entry = response.json()["items"][0]
    assert entry["manifest"]["tool_id"] == "json-formatter"
    assert entry["available_operations"] == ["format"]
    assert entry["status"] == "available"
    assert len(authenticated.get("/api/v1/tools?cursor=1").json()["items"]) == 3
    assert authenticated.get("/api/v1/tools?cursor=4").json()["items"] == []
    assert authenticated.get("/api/v1/tools?limit=101").status_code == 422
    capabilities = authenticated.get("/api/v1/capabilities").json()
    assert capabilities["jobs_supported"] is False
    result = authenticated.post(
        EXECUTE,
        json={
            "contract_version": 1,
            "parameters": {"text": '{"中文":true,"b":2}', "compact": True, "sort_keys": True},
        },
    )
    assert result.status_code == 200
    assert result.json()["text"] == '{"b":2,"中文":true}'
    assert result.json()["output_bytes"] == len(result.json()["text"].encode("utf-8"))
    assert result.headers["x-request-id"]


@pytest.mark.parametrize("text", ["{", "NaN", "Infinity", '{"a":1,"a":2}', "1e9999", '"\\ud800"'])
def test_invalid_json_has_safe_error(authenticated: TestClient, text: str) -> None:
    result = authenticated.post(EXECUTE, json={"parameters": {"text": text}})
    assert result.status_code == 422
    payload = result.json()
    assert payload["error"]["code"] == "INVALID_JSON"
    assert payload["request_id"] == result.headers["x-request-id"]
    assert "Traceback" not in result.text


def test_schema_errors_do_not_echo_input(authenticated: TestClient) -> None:
    response = authenticated.post(
        EXECUTE,
        json={
            "contract_version": 2,
            "parameters": {"text": "private-input", "indent": 3},
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "private-input" not in response.text


def test_json_depth_and_output_budgets(authenticated: TestClient) -> None:
    too_deep = "[" * 65 + "0" + "]" * 65
    response = authenticated.post(EXECUTE, json={"parameters": {"text": too_deep}})
    assert response.json()["error"]["code"] == "JSON_TOO_DEEP"
    broad = "[" * 64 + ",".join(["0"] * 5000) + "]" * 64
    response = authenticated.post(EXECUTE, json={"parameters": {"text": broad, "indent": 4}})
    assert response.json()["error"]["code"] == "OUTPUT_TOO_LARGE"
    response = authenticated.post(EXECUTE, json={"parameters": {"text": broad, "compact": True}})
    assert response.status_code == 200
    response = authenticated.post(EXECUTE, json={"parameters": {"text": '"[[[\\"[]"'}})
    assert response.status_code == 200
    assert (
        authenticated.post(EXECUTE, json={"parameters": {"text": "x" * 100001}}).status_code == 422
    )


def test_csrf_origin_and_size(authenticated: TestClient) -> None:
    assert (
        authenticated.post(
            EXECUTE,
            json={"parameters": {"text": "{}"}},
            headers={
                "Origin": "https://untrusted.invalid",
            },
        ).status_code
        == 403
    )
    assert (
        authenticated.get("/api/v1/tools", headers={"Sec-Fetch-Site": "same-site"}).status_code
        == 403
    )
    response = authenticated.post(EXECUTE, content=b"x" * 1_048_577)
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "REQUEST_TOO_LARGE"


def test_disabled_tool_and_unknown_routes(tmp_path: Path) -> None:
    settings = Settings(data_dir=tmp_path, disabled_tools=["json-formatter"])
    with TestClient(create_app(settings), base_url="http://127.0.0.1:8000") as client:
        response = client.post("/api/v1/session", headers={"Origin": "http://127.0.0.1:8000"})
        client.headers["X-CSRF-Token"] = response.json()["csrf_token"]
        assert client.get("/api/v1/tools").json()["items"][0]["status"] == "disabled"
        assert client.post(EXECUTE, json={"parameters": {"text": "{}"}}).status_code == 503
        assert client.get("/health/ready").status_code == 200
        assert client.get("/api/v1/missing").status_code == 404
        assert client.get("/api/v1/tools/missing").status_code == 404


def test_session_capacity_and_server_restart(tmp_path: Path) -> None:
    app = create_app(Settings(data_dir=tmp_path, max_sessions=1))
    with TestClient(app, base_url="http://127.0.0.1:8000") as first:
        assert (
            first.post("/api/v1/session", headers={"Origin": "http://127.0.0.1:8000"}).status_code
            == 200
        )
        cookie = first.cookies.get("mtools_session")
        first.cookies.clear()
        assert (
            first.post("/api/v1/session", headers={"Origin": "http://127.0.0.1:8000"}).status_code
            == 429
        )
    with TestClient(app, base_url="http://127.0.0.1:8000") as second:
        second.cookies.set("mtools_session", cookie or "", path="/api/")
        assert second.get("/api/v1/tools").status_code == 401


def test_spa_deep_route_and_missing_asset(tmp_path: Path) -> None:
    web_dir = tmp_path / "web"
    web_dir.mkdir()
    (web_dir / "index.html").write_text('<html lang="zh-CN">工具箱</html>', encoding="utf-8")
    with TestClient(
        create_app(Settings(data_dir=tmp_path / "data", web_dir=web_dir)),
        base_url="http://127.0.0.1:8000",
    ) as client:
        assert "工具箱" in client.get("/tools/json-formatter").text
        assert client.get("/assets/missing.js").status_code == 404
        assert client.get("/api/missing").status_code == 401


def test_logs_exclude_user_input(authenticated: TestClient) -> None:
    authenticated.post(EXECUTE, json={"parameters": {"text": '"private-body-sentinel"'}})
    logger = cast(FastAPI, authenticated.app).state.logger
    for handler in logger.handlers:
        handler.flush()
    file_handler = logger.handlers[1]
    content = Path(file_handler.baseFilename).read_text("utf-8")
    assert "private-body-sentinel" not in content
    assert "tool_execute" in content
