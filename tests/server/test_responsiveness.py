import json
import threading
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient
from mtools.adapters.desktop import DesktopBridge


def test_desktop_bridge_exposes_dialog_without_native_window_graph(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    webview = pytest.importorskip("webview")
    from webview.util import inject_pywebview

    native = SimpleNamespace(
        create_file_dialog=lambda *args, **kwargs: [r"C:\测试\视频.mp4"],
        native_action=lambda: None,
    )
    bridge = DesktopBridge(native)
    assert bridge.select_media_file("video") == r"C:\测试\视频.mp4"
    with pytest.raises(ValueError):
        bridge.select_media_file("unknown")
    scripts: list[str] = []
    loaded = threading.Event()
    window: Any = SimpleNamespace(
        _js_api=bridge,
        _functions={},
        _expose_lock=threading.Lock(),
        run_js=scripts.append,
        events=SimpleNamespace(
            before_load=threading.Event(), _pywebviewready=threading.Event(), loaded=loaded
        ),
    )
    monkeypatch.setattr(webview.util, "load_js_files", lambda *args: ("", "%(functions)s"))
    inject_pywebview("edgechromium", window)
    assert loaded.wait(2)
    functions = json.loads(scripts[-1])
    assert functions == [{"func": "select_media_file", "params": ["kind"]}]


@pytest.mark.parametrize("method", ["PUT", "PATCH"])
def test_slow_preference_save_does_not_block_other_requests(
    authenticated: TestClient,
    monkeypatch: pytest.MonkeyPatch,
    method: str,
) -> None:
    app: Any = authenticated.app
    store = app.state.preferences
    original = store.save
    entered, release = threading.Event(), threading.Event()

    def save(value: Any) -> None:
        entered.set()
        assert release.wait(5)
        original(value)

    monkeypatch.setattr(store, "save", save)
    with ThreadPoolExecutor(max_workers=2) as pool:
        saving = pool.submit(
            authenticated.request, method, "/api/v1/preferences", json={"theme": "dark"}
        )
        try:
            assert entered.wait(2)
            health = pool.submit(authenticated.get, "/health/live")
            assert health.result(timeout=1).status_code == 200
            assert not saving.done()
        finally:
            release.set()
        assert saving.result(timeout=2).status_code == 200


def test_slow_tool_reassembly_does_not_block_other_requests(
    authenticated: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from mtools.bootstrap import tools

    entered, release = threading.Event(), threading.Event()
    original = tools.assemble_tools

    def assemble(*args: Any) -> Any:
        entered.set()
        assert release.wait(5)
        return original(*args)

    monkeypatch.setattr(tools, "assemble_tools", assemble)
    with ThreadPoolExecutor(max_workers=2) as pool:
        checking = pool.submit(authenticated.post, "/api/v1/media/environment/check")
        try:
            assert entered.wait(3)
            health = pool.submit(authenticated.get, "/health/live")
            assert health.result(timeout=1).status_code == 200
            assert authenticated.post("/api/v1/media/environment/check").status_code == 429
            assert not checking.done()
        finally:
            release.set()
        assert checking.result(timeout=2).status_code == 200
