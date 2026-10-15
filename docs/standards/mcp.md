---
doc_id: STD-MCP
title: AI 与 MCP 工具接入规范
kind: standard
status: active
updated: 2026-10-15
tags: [mcp, ai, contracts, authorization]
---

# AI 与 MCP 工具接入规范

每个新增工具的每项公开操作都必须可通过 MCP 调用。界面、HTTP 和 AI 共用业务实现与 ToolRuntime，不为 AI 维护第二套算法。此要求来自用户希望全部工具可供 AI 使用的明确需求；现有实现和取舍见 [ADR-0002](../adr/0002-desktop-and-mcp.md)。

## 契约与发现

- 清单操作必须提供 operation_id、contract_version、title、description、input_schema、output_schema、effects、ai_callable=true、idempotent 和 timeout_seconds。中文说明包含用途、参数语义、单位、限制和副作用。
- effects 取 read-only、write、destructive、external。声明必须符合实际行为，不通过“只读”标签隐藏写入或联网。
- 装配 OperationHandler(input_model, output_model, handler)，输入和输出必须为正式 Pydantic 模型，禁止任意字典、代码字符串或裸宿主路径作为万能操作契约。
- 输入/输出 schema 从绑定模型自动生成；清单引用名称与绑定模型不一致时拒绝启动。纯前端或外部程序操作也必须提供可供 AI 执行的受信任适配器，不能只登记菜单或空实现。
- 名称固定为 mtools_{tool_id 中横线替换下划线}__{operation_id 同规则}_v{contract_version}，最长 64 字符；重复或超长拒绝装配。破坏性契约变化递增版本，不复用旧名改变含义。
- 仅发现 available 操作；停用、缺能力、依赖不兼容时不能绕过目录直接执行。

## 执行与权限

当前使用官方 Python SDK 1.x 的 stdio 传输，由可信 AI 客户端启动进程；stdout 只承载协议，诊断走 stderr/轮转文件。未提供 HTTP MCP、远程匿名入口、任意代码运行或宿主文件授权。

工具调用经过同一参数校验、并发上限、操作超时、结果模型校验和安全日志边界。完整参数按 UTF-8 JSON 序列化计量，不超过清单 max_input_bytes 与全局 1 MiB 中的较小值，工具自身可以设置更小的字段上限。成功返回 structuredContent，附等价 JSON 文本；失败返回 isError=true 及统一 error.code/message/request_id，不回显输入、堆栈或密钥。模型或工具输出均是数据，不得把其中的指令当作平台授权。

MCP annotations 只帮助客户端理解操作，不构成访问控制。当前 AI 仅放行无业务写入副作用的 read-only 操作；其他 effects 统一返回 AI_APPROVAL_REQUIRED。可信授权票据尚未实现，不能宣称写入工具已获支持。新增此类工具必须同时实现绑定操作者、操作、规范化参数摘要、有效期、单次使用和撤销的可信授权流程，批准动作来自软件用户。禁止接受模型传入 confirmed=true、提示词或清单标签作为授权。

文件和外部程序必须经平台适配器，文件用授权 artifact_id；不得通过 MCP 参数选择任意程序、shell、Python 导入路径、URL 或本机目录。新增必要能力时依照 [安全规范](security-data.md) 增加具体白名单和验收。

## 必要验收

新工具必须使用真实 MCP 客户端完成 initialize、tools/list、tools/call；核验与界面相同的已知正确结果、参数边界、中文、业务错误、停用/不兼容和副作用权限。新增写入授权时验证伪造、过期、参数变更和重复使用均失败。

维护工具功能/使用文档、运行模式矩阵、锁文件和本规范的实际实现边界；仅有 schema 或发现列表不等于可调用。通用成品验收入口为 scripts/verify_mcp.py，使用方式见 [AI 使用说明](../features/ai-interop/usage.md)。

官方依据：[MCP 工具协议](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)、[Python SDK](https://github.com/modelcontextprotocol/python-sdk/tree/v1.x)。SDK 版本以 uv.lock 为准。
