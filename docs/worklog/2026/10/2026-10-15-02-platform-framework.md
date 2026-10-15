---
doc_id: LOG-20261015-02
title: 前后端框架与首个真实工具
kind: worklog
status: active
date: 2026-10-15
updated: 2026-10-15
related: [platform-shell, json-formatter, ADR-0001]
tags: [worklog, backend, frontend, framework, validation]
---

# 前后端框架与首个真实工具

## 背景与验收路径

用户要求参照已有文档完成整体前后端框架并遵守技术规范。初始目录仅有规范，无 Git 仓库或应用代码；本轮不初始化 Git，不提交、推送或发布。

实施路径：建立公共契约与安全边界 → 可信工具装配与真实 JSON 操作 → 中文前端工作区与生成契约 → 源码/Docker 定义 → 集成、浏览器和文档验证。工具选择 JSON 格式化，输入输出明确、无需外部依赖或宿主权限，能验证完整平台链路。桌面壳与持久任务保留原路线。

## 实际变化

- 建立 Python 3.13 / uv 项目、FastAPI 工厂及生命周期、CLI、类型化配置、JSON 轮转日志、统一错误、健康检查、同源 SPA 与 API。
- 以 Cookie/CSRF 和明确 Host/Origin 限制保护本机会话，拒绝跨站驱动；请求体、会话数、工具输入输出及结构深度均有限制。
- 实现单一工具清单、注册状态、依赖版本/循环检查及禁用隔离，工具业务无 HTTP 依赖。
- 实现 React 导航、目录、搜索分类、JSON 双栏、参数与结果、下载/复制、明暗主题、窄屏导航和错误恢复；长任务入口说明未实现状态。
- 从 OpenAPI 生成 TypeScript 及预编译响应校验器，兼容严格 CSP；保留强类型工具执行路由，不用任意动态导入。
- 固定前后端依赖与包管理器版本，增加源码/开发/检查脚本、多阶段 Dockerfile、Compose 安全与数据卷定义。
- 补齐功能、使用、环境和配置文档，维护索引、状态、路线、变更日志；修正规范中“当前没有代码”的过时状态，未放宽技术约束。

## 验证环境与已知边界

工作目录为仓库根目录，前端命令在 apps/web。Windows 源码环境，Python 3.13.15、uv 0.12.6、Node 24.12.0、pnpm 11.22.0。最初尝试 TypeScript 7.0.2，实测与 openapi-typescript 的编译器 API 不兼容，按 peer 契约锁回 5.9.3，非屏蔽报错。

Python 安装下载完成后 minor link 提示异常，`uv python find 3.13` 与实际环境创建确认解释器可用；跨盘缓存回退复制属于安装提示。pytest 的 Starlette TestClient 提示 httpx 兼容适配器未来弃用，当前测试正常执行，未屏蔽警告。

本机 Docker Linux 引擎未运行，故仅静态检查 Compose；容器构建、运行、卷权限/持久化及停止未执行。桌面 WebView 与打包未执行；多用户、远程暴露、长任务、文件服务、业务持久化不在本轮实现范围。

## 最终验收结果

根目录 `./scripts/check.ps1` 完整执行成功，脚本对每个子命令检查退出码，未跳过失败项。

| 检查 | 实际结果 |
| --- | --- |
| uv sync --frozen；pnpm --dir apps/web install --frozen-lockfile | 锁定安装成功，Python 32 个包；前端 peer 检查无冲突 |
| Ruff check、Ruff format --check | 通过 |
| mypy | 23 个 Python 源文件检查通过 |
| pytest -q | 19 项通过；保留 1 条 Starlette/httpx 上游弃用警告 |
| OpenAPI --check、前端 generate:check | API、TypeScript 与响应校验器同步 |
| ESLint、Prettier、TypeScript 和生产 build | 全部通过；工具页面独立懒加载产物 |
| Playwright + 真实 Uvicorn 服务 | 4 项通过，包含搜索/执行/错误恢复/下载/刷新、主题/多尺寸、会话恢复、异常响应校验与停用工具 |
| 文档脚本 | 99 份文本 UTF-8/LF、正式文档元数据/ID 和相对链接检查通过 |
| uv build | sdist 与 wheel 构建成功，检查 wheel 包含工具 manifest.json |
| pnpm audit --prod | 当前锁定生产依赖未报告已知漏洞；不是未来或完整供应链安全保证 |
| docker compose config --quiet | Compose 定义静态检查通过 |
| UI 截图 | 实际查看浅色/深色目录、390 px 窄屏工作区；截图已归档 |

浏览器测试在 Chromium 156 执行，1280×800、900×600、390×844 验证主要操作可见且无横向溢出。测试数据只用内置示例，下载校验真实 suggestedFilename。会话失效时输入保留，下一次明确提交恢复，不自动重放操作。输入深度限制 64 层、流式输出限制与操作入口一致性均有回归验证。

界面附件见 [截图索引](../../../assets/platform-shell/README.md)。目前尚未执行独立干净机器、源码目录含中文/空格、其他浏览器及真实 200% 浏览器缩放验收；实现未硬编码仓库绝对路径，但不把代码审查当作这些环境的实际通过证据。

源码浏览器的首期框架及真实工具已完成，从路线图移除 P1；Docker 剩余构建与成品运行验收、桌面壳、持久任务和首次发行继续保留在当前路线。项目状态、功能/指南/日期索引、变更日志与相关规范已同步。没有已确认未修复的软件缺陷，不新增空问题条目。
