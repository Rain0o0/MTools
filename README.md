# MTools

MTools 是一款本地运行的工具箱，提供文本、JSON、图片、音频和视频处理，并支持通过 MCP 连接 AI 客户端。项目面向 Windows 桌面使用，也可从源码运行或通过 Docker 在浏览器中使用。

## 开始使用

### Windows 桌面

从项目的 GitHub Releases 下载 Windows 目录包，解压后运行 `MTools.exe`。请保留解压目录中的全部文件。媒体编辑需要 FFmpeg；语音转录和配音可能需要额外模型或网络服务。

### 从源码运行

需要 Python 3.13、uv、Node.js 24 和 pnpm 11。在项目根目录运行：

```powershell
uv sync --frozen
pnpm --dir apps/web install --frozen-lockfile
pnpm --dir apps/web build
uv run --frozen mtools
```

默认启动桌面窗口。运行 `uv run --frozen mtools serve` 可使用浏览器模式，然后访问 http://127.0.0.1:8000。

### Docker

需要 Docker Compose。在项目根目录运行：

```powershell
docker compose up -d --build
```

然后打开 http://127.0.0.1:18743。停止服务运行 `docker compose down`。

## 第一步

打开 MTools 后，从工具目录搜索或选择一个工具；例如选择“JSON 格式化”，粘贴 JSON 并查看结果。媒体处理可导入文件后选择操作并导出结果。AI 客户端连接步骤见[AI 接入指南](docs/features/ai-interop/usage.md)。

更多安装和配置说明见[使用指南](docs/guides/README.md)，功能列表见[功能索引](docs/features/README.md)，版本变化见[变更日志](CHANGELOG.md)。

## 开发与版本

开发者：版本号需同步 Python、前端和锁文件；每次迭代更新变更日志、运行检查，并提交到本地 Git。