import argparse
import ctypes
import hashlib
import sys
import tomllib
from ctypes import wintypes
from pathlib import Path


def main() -> None:
    """比较 Windows 实际提取的程序/窗口图标像素，防止打包后回退默认图标。"""
    if sys.platform != "win32":
        raise RuntimeError("图标验收需要 Windows")
    parser = argparse.ArgumentParser()
    parser.add_argument("--pid", type=int)
    parser.add_argument("--directory", type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    version = tomllib.loads((root / "pyproject.toml").read_text("utf-8"))["project"]["version"]
    directory = args.directory or root / f"dist/desktop/v{version}/MTools"
    user, gdi, shell = ctypes.windll.user32, ctypes.windll.gdi32, ctypes.windll.shell32
    user.LoadImageW.argtypes = [
        wintypes.HINSTANCE,
        wintypes.LPCWSTR,
        wintypes.UINT,
        ctypes.c_int,
        ctypes.c_int,
        wintypes.UINT,
    ]
    user.LoadImageW.restype = wintypes.HANDLE
    user.DestroyIcon.argtypes = [wintypes.HANDLE]
    user.SendMessageW.argtypes = [wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM]
    user.SendMessageW.restype = ctypes.c_void_p
    gdi.CreateCompatibleDC.argtypes = [wintypes.HDC]
    gdi.CreateCompatibleDC.restype = wintypes.HDC
    gdi.CreateDIBSection.argtypes = [
        wintypes.HDC,
        ctypes.c_void_p,
        wintypes.UINT,
        ctypes.POINTER(ctypes.c_void_p),
        wintypes.HANDLE,
        wintypes.DWORD,
    ]
    gdi.CreateDIBSection.restype = wintypes.HBITMAP
    gdi.SelectObject.argtypes = [wintypes.HDC, wintypes.HANDLE]
    gdi.SelectObject.restype = wintypes.HANDLE
    gdi.DeleteObject.argtypes = [wintypes.HANDLE]
    gdi.DeleteDC.argtypes = [wintypes.HDC]
    user.DrawIconEx.argtypes = [
        wintypes.HDC,
        ctypes.c_int,
        ctypes.c_int,
        wintypes.HANDLE,
        ctypes.c_int,
        ctypes.c_int,
        wintypes.UINT,
        wintypes.HBRUSH,
        wintypes.UINT,
    ]
    shell.ExtractIconExW.argtypes = [
        wintypes.LPCWSTR,
        ctypes.c_int,
        ctypes.POINTER(wintypes.HANDLE),
        ctypes.POINTER(wintypes.HANDLE),
        wintypes.UINT,
    ]

    def pixels(icon: int, size: int) -> bytes:
        header = (ctypes.c_int32 * 10)(
            40, size, -size, 1 | (32 << 16), 0, size * size * 4, 0, 0, 0, 0
        )
        pointer = ctypes.c_void_p()
        dc = gdi.CreateCompatibleDC(None)
        bitmap = gdi.CreateDIBSection(dc, header, 0, ctypes.byref(pointer), None, 0)
        previous = gdi.SelectObject(dc, bitmap)
        try:
            ctypes.memset(pointer, 0, size * size * 4)
            if not user.DrawIconEx(dc, 0, 0, icon, size, size, 0, None, 3):
                raise RuntimeError("无法读取实际图标")
            return ctypes.string_at(pointer, size * size * 4)
        finally:
            gdi.SelectObject(dc, previous)
            gdi.DeleteObject(bitmap)
            gdi.DeleteDC(dc)

    reference = user.LoadImageW(None, str(root / "assets/mtools.ico"), 1, 32, 32, 0x10)
    if not reference:
        raise RuntimeError("参考图标无法加载")
    try:
        expected = pixels(reference, 32)
        for name in ("MTools.exe", "MToolsAI.exe"):
            path = directory / name
            large, small = wintypes.HANDLE(), wintypes.HANDLE()
            if not shell.ExtractIconExW(str(path), 0, ctypes.byref(large), ctypes.byref(small), 1):
                raise RuntimeError(f"程序没有可提取图标：{name}")
            try:
                assert pixels(large.value or 0, 32) == expected, f"{name} 图标与 M 标识不一致"
            finally:
                user.DestroyIcon(large)
                user.DestroyIcon(small)
        if args.pid:
            expected_windows = {expected}
            for size in (16, 24, 48, 64, 128, 256):
                candidate = user.LoadImageW(
                    None, str(root / "assets/mtools.ico"), 1, size, size, 0x10
                )
                try:
                    expected_windows.add(pixels(candidate, 32))
                finally:
                    user.DestroyIcon(candidate)
            found: list[int] = []
            callback_type = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
            user.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
            user.IsWindowVisible.argtypes = [wintypes.HWND]
            user.EnumWindows.argtypes = [callback_type, wintypes.LPARAM]

            def observe(hwnd: int, parameter: int) -> bool:
                pid = wintypes.DWORD()
                user.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                if pid.value == args.pid and user.IsWindowVisible(hwnd):
                    handle = user.SendMessageW(hwnd, 0x7F, 1, 0)
                    if handle:
                        found.append(handle)
                return True

            callback = callback_type(observe)
            user.EnumWindows(callback, 0)
            assert found and any(pixels(handle, 32) in expected_windows for handle in found), (
                f"运行窗口图标待核验: count={len(found)}, hashes="
                f"{[hashlib.sha256(pixels(handle, 32)).hexdigest()[:16] for handle in found]}"
            )
        print(f"Windows EXE/window icons match MTools: {hashlib.sha256(expected).hexdigest()[:16]}")
    finally:
        user.DestroyIcon(reference)


if __name__ == "__main__":
    main()
