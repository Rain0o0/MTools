import ctypes
import secrets
import socket
import sys
import threading
import time
from importlib import import_module
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import uvicorn

from mtools.bootstrap.app import create_app
from mtools.bootstrap.config import Settings


class DesktopService:
    """持有随机端口和本实例服务线程，关闭时仅回收自身资源。"""

    def __init__(self, settings: Settings) -> None:
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        for _ in range(64):
            try:
                self.socket.bind(("127.0.0.1", 49152 + secrets.randbelow(16384)))
                break
            except OSError:
                continue
        else:
            self.socket.close()
            raise RuntimeError("无法分配本机工作端口，请稍后重新打开 MTools")
        self.port = self.socket.getsockname()[1]
        self.origin = f"http://127.0.0.1:{self.port}"
        self.token = secrets.token_urlsafe(32)
        self.settings = settings.model_copy(
            update={
                "host": "127.0.0.1",
                "port": self.port,
                "mode": "desktop",
                "allowed_hosts": ["127.0.0.1"],
                "allowed_origins": [self.origin],
            }
        )
        self.server = uvicorn.Server(
            uvicorn.Config(
                create_app(self.settings, desktop_token=self.token),
                host="127.0.0.1",
                port=self.port,
                access_log=False,
                log_config=None,
                log_level="warning",
                timeout_graceful_shutdown=8,
            )
        )
        self.thread = threading.Thread(target=self.server.run, kwargs={"sockets": [self.socket]})

    def start(self) -> None:
        self.thread.start()
        deadline = time.monotonic() + 15
        probe = threading.Event()
        while not self.server.started:
            if not self.thread.is_alive() or time.monotonic() > deadline:
                self.close()
                raise RuntimeError("MTools 启动未完成，请检查应用目录是否可写后重新打开")
            probe.wait(0.03)

    def close(self) -> None:
        self.server.should_exit = True
        if self.thread.ident is not None:
            self.thread.join(timeout=12)
        self.socket.close()
        if self.thread.is_alive():
            raise RuntimeError("MTools 正在结束处理中工作，请稍后再打开")

    def trusted_url(self, url: str) -> bool:
        candidate = urlsplit(url)
        return f"{candidate.scheme}://{candidate.netloc}" == self.origin


def run_desktop(settings: Settings) -> None:
    """在 Windows WebView2 窗口内运行同一前端，不启动常规浏览器。"""
    if sys.platform != "win32":
        raise RuntimeError("此桌面版本目前支持 Windows，请使用已验证的运行环境")
    import webview

    if not (settings.web_dir / "index.html").is_file():
        raise RuntimeError("软件界面文件不完整，请重新安装或完成桌面构建")
    service = DesktopService(settings)
    try:
        service.start()
        window = webview.create_window(
            "MTools",
            service.origin,
            width=1280,
            height=850,
            min_size=(720, 540),
            text_select=True,
            zoomable=True,
        )
        if window is None:
            raise RuntimeError("无法创建应用窗口，请检查 Windows WebView2 运行环境")

        def protect_request(request: Any) -> None:
            if service.trusted_url(str(request.url)):
                request.headers["X-MTools-Desktop"] = service.token

        def protect_navigation() -> None:
            native: Any = window.native

            def navigate(sender: Any, event: Any) -> None:
                if not service.trusted_url(str(event.Uri)):
                    event.Cancel = True

            def new_window(sender: Any, event: Any) -> None:
                event.Handled = True

            def bind() -> None:
                icon_root = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parents[5]))
                icon = icon_root / (
                    "branding/mtools.ico" if getattr(sys, "frozen", False) else "assets/mtools.ico"
                )
                if icon.is_file():
                    native.Icon = import_module("System.Drawing").Icon(str(icon))
                core = native.webview.CoreWebView2
                core.NavigationStarting += navigate
                core.NewWindowRequested += new_window

            native.Invoke(import_module("System").Action(bind))

        window.events.request_sent += protect_request
        window.events.loaded += protect_navigation
        webview.settings["ALLOW_DOWNLOADS"] = True
        webview.settings["ALLOW_FILE_URLS"] = False
        webview.settings["OPEN_EXTERNAL_LINKS_IN_BROWSER"] = False
        webview.settings["OPEN_DEVTOOLS_IN_DEBUG"] = False
        profile = settings.data_dir / "webview"
        profile.mkdir(parents=True, exist_ok=True)
        webview.start(
            gui="edgechromium", debug=False, private_mode=False, storage_path=str(profile)
        )
    finally:
        service.close()


def show_startup_error(message: str) -> None:
    if sys.platform == "win32":
        ctypes.windll.user32.MessageBoxW(0, message, "MTools 无法打开", 0x10)
    else:
        print(message, file=sys.stderr)


def bundled_web_dir() -> Path | None:
    if getattr(sys, "frozen", False):
        bundle: Any = sys
        return Path(bundle._MEIPASS) / "web"
    return None
