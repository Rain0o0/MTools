---
doc_id: PROJECT-STATUS
title: 项目当前状态
kind: status
status: active
updated: 2026-10-15
tags: [project, status, implementation]
---

# 项目当前状态

## 已交付

- 模块化 FastAPI + React/TypeScript/Vite，共享工具注册、会话/CSRF、统一错误、安全日志及健康检查。
- Windows 默认独立桌面窗口与双入口目录包 MTools.exe/MToolsAI.exe；随机回环端口及原生凭据保护，退出回收服务。
- 用户导向目录、整卡进入、标签筛选、状态解释、帮助/隐私弹窗、AI 助手与文件持久主题。
- JSON 格式化/校验/压缩、复制/下载；界面与 MCP 共用正式输入输出模型与 ToolRuntime。
- 官方 MCP stdio、自动工具发现、结构化结果、安全错误及副作用默认拒绝；每项新操作必须通过 AI 接入规范。
- 锁文件、OpenAPI/前端类型/预编译校验器生成、统一检查、Windows 打包与 Docker 多阶段构建。
- 项目入口、专项规范、功能/使用文档、ADR、问题清单和日期记录。

## 实现和验证边界

| 内容 | 当前状态 |
| --- | --- |
| Windows 源码桌面与 WebView2 | 已实现并实际操作验证，包括外部导航限制与退出 |
| Windows x64 目录包 | 已构建并验证真实操作、复制、配置及退出；无需宿主 Python/Node |
| 源码浏览器开发服务 | 显式 serve，5 项 Chromium 交互测试 |
| Linux Docker | 已构建/启动，非 root/只读、下载、刷新、主题/日志持久化及停止验证 |
| MCP stdio | 源码、Windows 成品、Linux 容器均完成真实 SDK 客户端验证 |
| 自动后端验收 | 24 项通过，包含凭据、生命周期、持久主题、禁用、参数预算与伪造授权 |
| 长任务、上传/产物、数据库 | 未实现；不虚报可用 |
| AI 写入/删除/外发授权 | 未实现，默认拒绝；当前仅只读 JSON 操作 |
| 正式发行、安装器、签名、许可汇总 | 未完成；本地构建未对外发布 |
| 干净 Windows 机器、macOS/Linux 桌面、第三方 AI 客户端设置 | 未执行，不声明支持验收 |

验证证据见 [桌面与 MCP 工作记录](../worklog/2026/10/2026-10-15-03-desktop-mcp.md)，历史框架记录仅代表当时状态。未完成工作在 [路线图](roadmap.md)，已确认缺陷在 [当前问题](../issues/open.md)。
