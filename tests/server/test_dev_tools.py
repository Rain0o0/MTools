import asyncio
import logging
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from mtools.adapters.ai_connection import CodexConnector
from mtools.adapters.mcp_server import McpGateway
from mtools.bootstrap.app import create_app
from mtools.bootstrap.config import Settings
from mtools.bootstrap.tools import assemble_tools
from mtools.platform.execution import ToolRuntime


@pytest.mark.parametrize(
    ("tool_id", "operation", "parameters", "expected"),
    [
        (
            "text-diff",
            "compare",
            {"old_text": "a\nb\n", "new_text": "a\n中文\n"},
            {"identical": False, "added_lines": 1, "removed_lines": 1},
        ),
        (
            "json-lines",
            "convert",
            {"text": '[{"中文":true},2]'},
            {"text": '{"中文":true}\n2\n', "records": 2},
        ),
        (
            "json-lines",
            "convert",
            {"text": '\n{"中文":true}\n\n2\n', "direction": "jsonl-to-json"},
            {"text": '[\n  {\n    "中文": true\n  },\n  2\n]', "records": 2},
        ),
        (
            "text-codec",
            "transform",
            {"text": "中文", "action": "base64-encode"},
            {"text": "5Lit5paH"},
        ),
        (
            "text-codec",
            "transform",
            {"text": "5Lit5paH", "action": "base64-decode"},
            {"text": "中文"},
        ),
        (
            "text-codec",
            "transform",
            {"text": "中 +/", "action": "url-encode"},
            {"text": "%E4%B8%AD%20%2B%2F"},
        ),
        (
            "text-codec",
            "transform",
            {"text": "%E4%B8%AD+", "action": "url-decode"},
            {"text": "中+"},
        ),
        (
            "text-codec",
            "transform",
            {"text": "abc", "action": "sha256"},
            {"text": "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"},
        ),
    ],
)
def test_http_and_mcp_same_results(
    authenticated: TestClient,
    tmp_path: Path,
    tool_id: str,
    operation: str,
    parameters: dict[str, object],
    expected: dict[str, object],
) -> None:
    response = authenticated.post(
        f"/api/v1/tools/{tool_id}/operations/{operation}/execute", json={"parameters": parameters}
    )
    assert response.status_code == 200
    assert response.json().items() >= expected.items()
    registry = assemble_tools(Settings(data_dir=tmp_path))
    gateway = McpGateway(ToolRuntime(registry, logging.getLogger("dev-tools-test")))
    result = asyncio.run(
        gateway.call(f"mtools_{tool_id.replace('-', '_')}__{operation}_v1", parameters)
    )
    assert not result.isError and result.structuredContent == response.json()


@pytest.mark.parametrize(
    ("tool_id", "operation", "parameters", "code"),
    [
        ("text-diff", "compare", {"old_text": "x\n" * 2001, "new_text": ""}, "TOO_MANY_LINES"),
        ("json-lines", "convert", {"text": "{}"}, "ARRAY_REQUIRED"),
        ("json-lines", "convert", {"text": '[{"a":1,"a":2}]'}, "INVALID_JSON"),
        ("json-lines", "convert", {"text": "[1e999]"}, "INVALID_JSON"),
        ("json-lines", "convert", {"text": '["\\ud800"]'}, "INVALID_JSON"),
        ("json-lines", "convert", {"text": "[" + ",".join(["0"] * 2001) + "]"}, "TOO_MANY_RECORDS"),
        (
            "json-lines",
            "convert",
            {"text": "1\nprivate-sentinel", "direction": "jsonl-to-json"},
            "INVALID_JSON",
        ),
        (
            "text-codec",
            "transform",
            {"text": "private-sentinel", "action": "base64-decode"},
            "INVALID_ENCODING",
        ),
        (
            "text-codec",
            "transform",
            {"text": "/w==", "action": "base64-decode"},
            "INVALID_ENCODING",
        ),
        ("text-codec", "transform", {"text": "%FF", "action": "url-decode"}, "INVALID_ENCODING"),
        ("text-codec", "transform", {"text": "%X0", "action": "url-decode"}, "INVALID_ENCODING"),
    ],
)
def test_boundaries_and_safe_errors(
    authenticated: TestClient,
    tool_id: str,
    operation: str,
    parameters: dict[str, object],
    code: str,
) -> None:
    result = authenticated.post(
        f"/api/v1/tools/{tool_id}/operations/{operation}/execute", json={"parameters": parameters}
    )
    assert result.status_code == 422
    assert result.json()["error"]["code"] == code
    assert "private-sentinel" not in result.text


def test_diff_empty_and_final_newline(authenticated: TestClient) -> None:
    url = "/api/v1/tools/text-diff/operations/compare/execute"
    result = authenticated.post(url, json={"parameters": {"old_text": "", "new_text": ""}}).json()
    assert result == {"text": "", "identical": True, "added_lines": 0, "removed_lines": 0}
    changed = authenticated.post(
        url, json={"parameters": {"old_text": "a", "new_text": "a\n"}}
    ).json()
    assert not changed["identical"] and "No newline at end of file" in changed["text"]


def test_preference_partial_updates_keep_other_values(authenticated: TestClient) -> None:
    assert (
        authenticated.patch(
            "/api/v1/preferences", json={"favorite_tools": ["text-diff"]}
        ).status_code
        == 200
    )
    result = authenticated.patch("/api/v1/preferences", json={"theme": "dark"}).json()
    assert result["favorite_tools"] == ["text-diff"]
    result = authenticated.patch("/api/v1/preferences", json={"favorite_tools": []}).json()
    assert result["theme"] == "dark" and result["favorite_tools"] == []
    assert (
        authenticated.patch(
            "/api/v1/preferences", json={"favorite_tools": ["bad/path"]}
        ).status_code
        == 422
    )


def test_real_connection_test_endpoint(authenticated: TestClient) -> None:
    response = authenticated.post("/api/v1/ai/test")
    assert response.status_code == 200, response.text
    catalog = authenticated.get("/api/v1/tools").json()["items"]
    assert response.json()["tool_count"] == sum(
        len(item["available_operations"]) for item in catalog
    )
    assert len(response.json()["tested_operations"]) == 4
    assert authenticated.post("/api/v1/ai/codex/connect").status_code == 403


def test_codex_real_cli_isolated_configuration(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("CODEX_HOME", str(tmp_path))
    config_file = tmp_path / "config.toml"
    config_file.write_text('[mcp_servers.keep]\ncommand = "preserved"\n', encoding="utf-8")
    connector = CodexConnector(Settings(data_dir=tmp_path, mode="desktop"))
    if connector.executable() is None:
        pytest.skip("此环境未安装 Codex CLI")
    with TestClient(
        create_app(connector.settings, desktop_token="test-native-token"),
        base_url="http://127.0.0.1:8000",
    ) as client:
        client.headers.update(
            {"X-MTools-Desktop": "test-native-token", "Origin": "http://127.0.0.1:8000"}
        )
        session = client.post("/api/v1/session").json()
        client.headers["X-CSRF-Token"] = session["csrf_token"]
        assert client.get("/api/v1/ai/codex").json()["configured"] is False
        connected = client.post("/api/v1/ai/codex/connect")
        assert connected.status_code == 200, connected.text
        assert connected.json()["matching"] is True
        assert "preserved" in config_file.read_text("utf-8")
        assert client.post("/api/v1/ai/codex/connect").status_code == 200
        old = config_file.read_text("utf-8")
        config_file.write_text(
            re.sub(r"(\[mcp_servers\.mtools\]\s*\ncommand = )[^\n]+", r'\1"different"', old),
            encoding="utf-8",
        )
        conflict = client.post("/api/v1/ai/codex/connect")
        assert conflict.status_code == 409
        assert '"different"' in config_file.read_text("utf-8")
