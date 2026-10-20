# 从源码运行

需要 Python 3.13、uv、Node.js 24 和 pnpm 11。在仓库根目录打开 PowerShell，运行：

```powershell
uv sync --frozen
pnpm --dir apps/web install --frozen-lockfile
pnpm --dir apps/web build
uv run --frozen mtools
```

默认打开 MTools 桌面窗口。需要浏览器时运行 `uv run --frozen mtools serve`，再访问 http://127.0.0.1:8000。首次安装依赖需要网络。

图片、音频和视频处理需要 FFmpeg。语音转录与配音按页面提示配置所需模型或网络服务。用户数据和媒体任务保存在本机 MTools 数据目录。