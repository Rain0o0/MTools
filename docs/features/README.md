---
doc_id: FEATURE-INDEX
title: 功能索引
kind: index
status: active
updated: 2026-10-15
tags: [features, tools, current-facts]
---

# 功能索引

| feature_id / tool_id | 功能 | 实现状态 | 支持形态与入口 |
| --- | --- | --- | --- |
| platform-shell / — | 平台前后端框架 | implemented | Windows 桌面、源码浏览器、Docker；[功能](platform-shell/overview.md)、[使用](platform-shell/usage.md) |
| json-formatter / json-formatter | JSON 格式化 | implemented | Windows 桌面、源码浏览器、Docker、MCP；[功能](json-formatter/overview.md)、[使用](json-formatter/usage.md) |
| text-diff / text-diff | 文本差异 | implemented | Windows 桌面、源码浏览器、Docker、MCP；[功能](text-diff/overview.md)、[使用](text-diff/usage.md) |
| json-lines / json-lines | JSON / JSONL 转换 | implemented | Windows 桌面、源码浏览器、Docker、MCP；[功能](json-lines/overview.md)、[使用](json-lines/usage.md) |
| text-codec / text-codec | 编码与摘要 | implemented | Windows 桌面、源码浏览器、Docker、MCP；[功能](text-codec/overview.md)、[使用](text-codec/usage.md) |
| ai-interop / — | 统一 AI 工具接口 | implemented | stdio：源码、Windows 目录包、Docker；[功能](ai-interop/overview.md)、[使用](ai-interop/usage.md) |

文件服务、长任务和 AI 副作用授权尚未实现。待实施内容见 [路线图](../project/roadmap.md)。

新增功能时在 docs/features/{feature_id}/ 建立 overview.md、usage.md，并在本页登记：稳定 feature_id、tool_id（平台功能可无）、中文名称、implementation、支持形态、文档入口和相关共享能力。

只有实际实现并完成相应验证的功能才标 implemented；支持形态同时说明已验证/未验证。按功能维护当前文档，不按每次更新复制新版本目录。

使用 [功能模板](../templates/feature.md) 与 [使用指南模板](../templates/guide.md)。复杂功能再按内容拆文档，索引链接到有效入口。
