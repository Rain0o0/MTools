---
doc_id: GUIDE-source
title: 源码安装、运行与检查
kind: guide
status: active
updated: 2026-10-15
tags: [source, setup, development, validation]
---

# 源码安装、运行与检查

## 环境与版本

源码默认桌面目标为 Windows；本轮实际使用 Windows、Python 3.13.15、uv 0.12.6、Node 24.12.0、pnpm 11.22.0。Python 限定 3.13 系列，Node 限定 >=24.12.0 <25，pnpm 固定 11.22.0。运行不依赖 Git；源码目录可解压到其他位置，程序不依赖 F: 盘或当前工作目录。

Python 依赖由 uv.lock 精确锁定，前端由 pnpm-lock.yaml 精确锁定。主要版本为 FastAPI 0.143.1、Pydantic 2.14.1、Uvicorn 0.54.0、React 19.3.1、Vite 8.3.4、TypeScript 5.9.3。TypeScript 保持 5.x 以兼容 openapi-typescript 7.13.0；不直接升级到 7.x。本轮新增 MCP 1.30.0、pywebview 6.2.1，桌面构建组 PyInstaller 6.22.3。完整依赖以锁文件为准。

官方兼容性参考：[Python 3.13](https://www.python.org/downloads/release/python-3130/)、[Node 发布周期](https://nodejs.org/en/about/previous-releases)、[Vite 8 的 Node 约束](https://vite.dev/blog/announcing-vite8.html)、[FastAPI 发布说明](https://fastapi.tiangolo.com/release-notes/)。版本实际以本轮包仓库解析、锁定和本地构建结果为准。

## 安装与普通运行

以下 PowerShell 7 命令在仓库根目录执行。首次安装需要网络；后续运行核心工具不需要第三方网络服务。

```powershell
uv python install 3.13
uv sync --frozen
pnpm --dir apps/web install --frozen-lockfile
pnpm --dir apps/web build
uv run --frozen mtools
```

默认打开独立桌面窗口，关闭窗口回收本实例随机端口服务，不打开普通浏览器。构建桌面程序和窗口验收见 [桌面指南](desktop.md)。显式运行 `uv run --frozen mtools serve` 才提供 [浏览器开发服务](http://127.0.0.1:8000)，用 Ctrl+C 停止；该模式占用固定 8000，冲突时报错，不结束其他进程。生产前端与 API 同源，深层路由刷新可用，不启用多 worker。

uv 安装 Python 可能提示 minor link 已存在，先执行 `uv python find 3.13` 确认解释器是否就绪；实际环境已成功用此解释器创建隔离环境。uv 跨磁盘缓存可能回退复制，不影响安装；可按需设置 `$env:UV_LINK_MODE='copy'`。

数据默认由 platformdirs 放入当前用户 MTools 数据目录，包含 logs/、preferences.json，桌面另有 webview/ 缓存，与源码和 dist 分离。配置列表、目录与端口调整见 [配置说明](configuration.md)。普通 `.env` 不自动加载。

## 前后端开发

先完成安装，在两个 PowerShell 终端的仓库根目录分别运行：

```powershell
./scripts/dev.ps1
```

```powershell
./scripts/dev.ps1 -Web
```

打开 [前端开发页面](http://127.0.0.1:5173)。Vite 仅绑定回环地址，/api 和 /health 代理到 8000；后端脚本明确允许 5173 来源，不需要 CORS。前端热更新由 Vite 提供，后端修改后用 Ctrl+C 停止并重启；普通运行方式仍使用已构建 dist。

## 契约更新

公开模型更改后，在根目录执行，提交生成源和产物：

```powershell
uv run --frozen python scripts/export_openapi.py
pnpm --dir apps/web generate
```

OpenAPI 是响应类型和浏览器运行时校验器的共同来源。generated 文件不手动修改。schema 校验器在构建前生成，生产 CSP 不需要 unsafe-eval。工具清单仍由每个工具的 manifest.json 单一维护。

## 检查

首次浏览器测试先安装 Chromium：

```powershell
pnpm --dir apps/web exec playwright install chromium
```

统一检查入口在根目录运行：

```powershell
./scripts/check.ps1
```

脚本遇到非零退出立即失败，依次执行 Ruff 格式/静态检查、mypy、pytest、OpenAPI 同步、文档与编码检查、前端生成同步、ESLint、Prettier、TypeScript/构建和 Playwright。浏览器测试使用构建后的真实服务与随机会话，固定 8765 端口，测试日志进入 .runtime/e2e；占用端口会报错，不复用用户服务。

单项命令：`uv run --frozen pytest -q`、`uv run --frozen mypy`、`pnpm --dir apps/web lint`、`pnpm --dir apps/web test:e2e`。浏览器测试需要先构建，统一入口已包含构建。实际证据见 [本轮记录](../worklog/2026/10/2026-10-15-03-desktop-mcp.md)。

## 排错、清理与授权边界

前端未构建时服务返回 503/FRONTEND_NOT_BUILT，执行 build 后重启服务。401 表示服务重启或会话过期，重新连接或再次明确执行；403 检查 Origin、CSRF、代理和端口配置；413 减少输入；422 根据工具提示修正参数；504 减少输入后重试。日志使用诊断编号关联，正文和令牌不进入常规日志。

可重新生成的 .venv、apps/web/node_modules、apps/web/dist、测试输出和 .runtime 不属于源码。停止服务后，按需要仅清理这些明确目录，不删除用户数据目录。当前持久数据为日志和版本化 preferences.json，桌面另有 WebView 缓存；不需要数据库迁移。迁移至未来持久化版本前另行建立备份恢复方案。

项目未选定许可证，不因框架初始化自动授予项目许可证。主要直接运行依赖使用 MIT/BSD 等许可证，Python 与 Node 运行时有各自许可证；精确信息可通过已锁包的 metadata/package.json 检查。正式分发前仍需汇总完整传递依赖与运行时许可材料，见 [路线图](../project/roadmap.md)。
