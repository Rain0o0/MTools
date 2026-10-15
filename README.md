# MTools

一个可持续扩展、支持模块复用的工具箱项目。目标是在桌面内嵌网页中使用，也能从源码运行或通过 Docker 在浏览器中使用。

## 当前状态

2026-10-15：Windows 独立桌面软件、FastAPI/React 共享核心和统一 MCP 已实现，提供工具目录、搜索分类、设置、帮助与 JSON 格式化。卡片、标签、状态、隐私与帮助可直接操作，主题保存到应用数据目录。

Windows 目录包与 Docker 已在本机完成真实运行验证；文件上传、持久长任务和 AI 写入授权尚未实现。具体实现状态以 [项目现状](docs/project/status.md) 和 [功能索引](docs/features/README.md) 为准。

## 快速启动

使用 Python 3.13、uv、Node 24.12+（24 系列）与 pnpm 11.22.0，在仓库根目录执行：

```powershell
uv sync --frozen
pnpm --dir apps/web install --frozen-lockfile
pnpm --dir apps/web build
uv run --frozen mtools
```

命令直接打开 MTools 独立窗口，在目录选择“JSON 格式化”。已构建的 Windows 程序位于 dist/desktop/MTools/MTools.exe，保持整个目录完整；[桌面指南](docs/guides/desktop.md) 说明打包与运行条件。[AI 接入](docs/features/ai-interop/usage.md) 也可在软件“AI 助手”页面获取。完整步骤、开发模式和验证入口见 [源码指南](docs/guides/source.md)。

## 从哪里开始

| 需求 | 入口 |
| --- | --- |
| AI/开发者进入项目 | [AGENTS.md](AGENTS.md) |
| 查找专项规范与记录 | [文档总索引](docs/README.md) |
| 理解分层与默认技术路线 | [架构规范](docs/standards/architecture.md) |
| 增加工具或复用已有能力 | [工具接入规范](docs/standards/tool-development.md) |
| 查看近期实施建议 | [待实施路线](docs/project/roadmap.md) |
| 查找当前缺陷 | [当前问题](docs/issues/open.md) |
| 查看更新 | [变更日志](CHANGELOG.md) |

## 技术方向

- 后端 Python + FastAPI，前端 React + TypeScript + Vite，按功能组织模块。
- 本机默认使用 pywebview/WebView2 独立窗口；Docker 提供网页与后端，不依赖桌面图形环境。
- 首期采用受信任工具随应用构建的方式，新增工具允许重新构建和重启。运行时安装第三方插件不属于首期承诺。
- 复用依赖稳定契约和共享能力；桌面专属能力通过运行环境适配器实现。
- 精确版本、启动和检查命令见源码指南，配置与数据路径见 [配置说明](docs/guides/configuration.md)。

## 文档约定

当前事实按功能维护，变更事实按日期维护。已修复问题从当前问题清单删除；历史变更只保留必要摘要和验证结果。中文文档采用 UTF-8。

## 使用与交付

源码、桌面与 Docker 使用说明在 [使用手册索引](docs/guides/README.md)。浏览器开发服务显式运行 uv run --frozen mtools serve；Docker 保留浏览器使用方式。新增工具须遵守 [MCP 规范](docs/standards/mcp.md)，每项操作都需可由 AI 调用。

项目尚未指定许可证；首次对外分发前需确定代码及第三方依赖的授权条件。
