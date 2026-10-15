import threading
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import webview
from mtools.adapters.desktop import run_desktop
from mtools.bootstrap.config import Settings


def main() -> None:
    """在真实 WebView2 中点击、执行并验证关闭，不向产品加入测试接口。"""
    completed = threading.Event()
    succeeded = threading.Event()
    original = webview.create_window
    windows: list[Any] = []

    def create(*args: Any, **kwargs: Any) -> Any:
        window: Any = original(*args, **kwargs)
        windows.append(window)

        def observe(request: Any) -> None:
            query = urlsplit(str(request.url)).query
            if query == "desktop_smoke=passed":
                succeeded.set()
                completed.set()

        def exercise() -> None:
            window.run_js("""
                let phase = 0;
                const timer = setInterval(() => {
                    const buttons = [...document.querySelectorAll('button')];
                    const sample = buttons.find(b => b.textContent.trim() === '填入示例');
                    if (!phase) {
                        const card = document.querySelector('.card-link');
                        if (card) { card.click(); phase = 1; }
                    } else if (phase === 1 && sample) {
                        sample.click(); phase = 2;
                    } else if (phase === 2) {
                        const run = buttons.find(b => b.textContent.includes('格式化 JSON'));
                        if (run && !run.disabled) { run.click(); phase = 3; }
                    } else if (phase === 3 &&
                        document.querySelector('#json-output')?.value.includes('MTools')) {
                        clearInterval(timer);
                        const origin = location.origin;
                        setTimeout(() => {
                            if (location.origin === origin)
                                fetch('/health/live?desktop_smoke=passed');
                        }, 400);
                        location.href = 'https://navigation-blocked.invalid/';
                    }
                }, 100);
            """)

        window.events.request_sent += observe
        window.events.loaded += exercise
        return window

    def stop() -> None:
        completed.wait(40)
        if windows:
            windows[0].destroy()

    webview.create_window = create
    watchdog = threading.Thread(target=stop, daemon=True)
    watchdog.start()
    try:
        run_desktop(Settings(data_dir=Path(".runtime/desktop-smoke").resolve()))
    finally:
        webview.create_window = original
        completed.set()
    if not succeeded.is_set():
        raise SystemExit("Desktop WebView2 smoke failed")
    print("Desktop WebView2: real page, sample, operation and window shutdown passed")


if __name__ == "__main__":
    main()
