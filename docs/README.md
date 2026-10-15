---
doc_id: DOC-INDEX
title: 文档总索引
kind: index
status: active
updated: 2026-10-15
tags: [index, navigation, ai-retrieval]
---

# 文档总索引

开发入口是 [AGENTS.md](../AGENTS.md)。按任务选择下列文档，避免一次读取全部规范。路径使用英文语义命名，内容使用中文。

## 当前事实与入口

| 文档 | 职责 |
| --- | --- |
| [项目现状](project/status.md) | 实际已交付内容、实现边界、验证状态 |
| [待实施路线](project/roadmap.md) | 尚未完成的阶段与验收标准 |
| [功能索引](features/README.md) | 按 feature_id/tool_id 定位当前功能说明 |
| [使用手册索引](guides/README.md) | 源码、桌面、Docker 使用说明入口 |
| [桌面软件](guides/desktop.md) | Windows 默认独立窗口、成品构建、运行条件 |
| [AI 连接](features/ai-interop/usage.md) | MCP stdio 接入、范围与排错 |
| [Git 与版本迭代](guides/versioning.md) | 每批递增 minor、版本同步、提交检查与本地标签 |
| [源码运行](guides/source.md) | 锁定安装、普通/开发启动、统一检查 |
| [平台框架](features/platform-shell/overview.md) | 实际契约、安全、模块与扩展边界 |
| [当前问题](issues/open.md) | 仅存仍未解决且有事实依据的问题 |
| [变更日志](../CHANGELOG.md) | 用户可感知的变化与版本说明 |

## 专项规范

| doc_id | 文档 | 读取时机 |
| --- | --- | --- |
| STD-ARCH | [架构](standards/architecture.md) | 分层、结构、技术选择、共享能力 |
| STD-BACKEND | [后端](standards/backend.md) | API、业务、任务、存储 |
| STD-FRONTEND | [前端](standards/frontend.md) | 前端模块、状态、路由、数据接入 |
| STD-UI | [UI](standards/ui.md) | 视觉、布局、交互、可访问性 |
| STD-MCP | [MCP/AI](standards/mcp.md) | 每项工具操作接入、schema、权限与真实客户端验收 |
| STD-TOOL | [工具接入](standards/tool-development.md) | 新工具、工具契约、跨工具协作 |
| STD-TEST | [测试](standards/testing.md) | 按风险设计验证与验收 |
| STD-SECURITY | [安全与数据](standards/security-data.md) | 权限、文件、进程、网络、隐私 |
| STD-DELIVERY | [交付](standards/delivery.md) | 源码、桌面、Docker、升级回退 |
| STD-DOCS | [文档管理](standards/documentation.md) | 分类、元数据、清理、归档与检索 |
| STD-WORKFLOW | [开发流程](standards/workflow.md) | 从需求到验收、变更同步 |

## 决策与日期记录

| 文档 | 职责 |
| --- | --- |
| [ADR 索引](adr/README.md) | 重大设计决定与替代关系 |
| [ADR-0002 桌面与 MCP](adr/0002-desktop-and-mcp.md) | 默认入口、共享执行、权限与兼容性 |
| [2026-10-15 工具与 Codex](worklog/2026/10/2026-10-15-04-product-tools.md) | 0.2.0、紧凑目录、新工具、常用、图标与版本迭代 |
| [2026-10-15 桌面与 MCP](worklog/2026/10/2026-10-15-03-desktop-mcp.md) | 桌面成品、Docker 运行、统一 AI 与交互验证 |
| [ADR-0001 默认架构](adr/0001-modular-local-web-toolbox.md) | 初始技术路线、收益和局限 |
| [工作记录索引](worklog/README.md) | 按年/月/日期查变更与验证证据 |
| [2026-10-15 规范建立](worklog/2026/10/2026-10-15-01-project-conventions.md) | 首次交付记录 |
| [2026-10-15 框架实现](worklog/2026/10/2026-10-15-02-platform-framework.md) | 前后端、真实工具与验证记录 |

## 创建文档的模板

- [功能文档](templates/feature.md)：一个功能的当前设计、行为、接口和限制。
- [使用指南](templates/guide.md)：面向用户的已验证操作说明。
- [工作记录](templates/worklog.md)：一批变更、实际检查和文档维护。
- [架构决策](templates/adr.md)：背景、方案、后果与替代关系。
- [问题条目](templates/issue.md)：复制到当前问题清单，修复验证后删除。

## 检索顺序

1. 查本索引或功能索引，按稳定 ID 找到当前事实。
2. 用关键词、接口名、模块名、tool_id 搜索相关文档。
3. 需要了解原因时读对应 ADR；需要追溯某次变化时读工作记录。
4. 历史记录中的旧行为不能覆盖当前功能文档；若当前文档与代码不一致，核验后修正文档并记录差异。

所有目录索引随内容增删同步维护；模板、规划和历史记录不应被标记为已实现功能。
