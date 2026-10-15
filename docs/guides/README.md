---
doc_id: GUIDE-INDEX
title: 使用手册索引
kind: index
status: active
updated: 2026-10-15
tags: [guides, usage, setup]
---

# 使用手册索引

当前手册与实现边界：

| 手册 | 内容 | 状态 |
| --- | --- | --- |
| [源码指南](source.md) | 环境、锁定安装、开发/普通运行、检查、停止、排错 | 已实现 |
| [配置说明](configuration.md) | 字段、默认值、覆盖顺序、会话、数据目录 | 已实现 |
| [桌面软件](desktop.md) | Windows 打开/退出、目录包、WebView2、构建 | 本机成品已验证 |
| [AI 连接](../features/ai-interop/usage.md) | 连接配置、工具范围、排错与真实 MCP 验收 | 三种入口已验证 |
| [Docker 使用](docker.md) | 多阶段构建、Compose、卷、重启与停止 | 容器运行已验证 |

当前持久化运行日志和主题，桌面另有 WebView 缓存；无业务数据库或任务产物。未来引入持久业务数据时建立独立备份恢复手册，不预建空文档。

单工具用户说明放在对应功能目录的 usage.md，经 [功能索引](../features/README.md) 查找；这里避免复制。使用 [指南模板](../templates/guide.md)，真实命令必须注明适用环境与工作目录。
