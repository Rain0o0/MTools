---
doc_id: FEAT-ai-interop
title: 统一 AI 工具接口
kind: feature
status: active
implementation: implemented
feature_id: ai-interop
updated: 2026-10-15
tags: [ai, mcp, registry, contracts]
---

# 统一 AI 工具接口

通过官方 MCP stdio 协议将受信任注册器中的可用操作交给 AI 客户端。McpGateway 自动生成名称、输入/输出 JSON Schema、用途和行为提示；ToolRuntime 与界面共用参数、业务、超时、并发、错误与输出验证。无额外 AI 服务、账号或 API 密钥，不自动向第三方发送内容。

当前提供 mtools_json_formatter__format_v1、mtools_text_diff__compare_v1、mtools_json_lines__convert_v1、mtools_text_codec__transform_v1 四项只读操作；参数见对应 [工具文档](../README.md)，直接传参数对象，不包 HTTP 的 parameters/contract_version。成功有 structuredContent 和等价 JSON 文本；失败 isError=true，文本中含 error 与 request_id。支持初始化、工具发现和调用，不提供额外资源目录、提示词库或 HTTP MCP。

新增工具在 bootstrap/tools.py 绑定 OperationHandler 与正式模型；不需要为每个工具手工编写 MCP 路由。声明 ai_callable 必须为 true；清单引用模型名与绑定模型不一致或操作名冲突时拒绝装配。完整规则见 [MCP 规范](../../standards/mcp.md)。

仅 available 操作被发现；停用操作不可调用。当前仅放行 read-only，write/destructive/external 默认 AI_APPROVAL_REQUIRED，可信用户授权尚未实现。annotations 不代替服务校验。输入、结果和协议原文不进入常规日志；结果会交给发起调用的 AI 客户端，其数据处理由用户自行选择的客户端决定。

软件“AI 助手”提供实际当前环境的连接配置：源码解释器、桌面 MToolsAI.exe 或 Docker 容器 stdio 命令。配置展示是接入信息，不表示已连接、已安装客户端或模型可用。Docker 配置供同一 Docker 宿主使用，重建容器后重新生成。

真实 SDK 客户端已验证源码、Windows 打包程序和 Linux Docker 的发现、中文结果及错误脱敏；自动测试还覆盖禁用与伪造授权阻断。Codex 通过本机 CLI 的固定 mtools 条目快捷注册，仅桌面受控请求可写入；不会接受任意命令参数或覆盖不同的同名配置。已用真实 Codex CLI 的独立配置目录验证添加、幂等与冲突保护，没有修改日常 Codex 配置；未验证模型在会话内主动选用工具。连接测试 POST /api/v1/ai/test 使用真实 stdio 客户端 initialize、tools/list 和已知示例调用，10 秒总体上限，同一时间只允许一次；不调用模型，不消耗模型 token。发现集合须与当前可用目录一致。Codex 状态 GET /api/v1/ai/codex；添加 POST /api/v1/ai/codex/connect 额外要求 desktop 模式及原生凭据，继承会话/CSRF，固定名称 mtools。容器仅提供宿主专用配置及容器内传输测试。配置已添加与工具测试通过不代表 Codex 会话已刷新。操作步骤见 [使用](usage.md)。
