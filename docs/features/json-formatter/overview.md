---
doc_id: FEAT-json-formatter
title: JSON 格式化功能
kind: feature
status: active
implementation: implemented
feature_id: json-formatter
tool_id: json-formatter
updated: 2026-10-15
tags: [json, formatter, validation]
---

# JSON 格式化功能

首个真实工具，用于验证目录、契约、安全边界、业务执行和前端结果的完整链路。Windows 桌面、源码浏览器、Linux Docker 和 MCP 已使用同一业务实现完成实际操作验证。

后端 tools/tool_json_formatter/ 内独立维护清单、schemas.py 和纯业务 service.py。前端 tools/json-formatter/page.tsx 只依赖共享 HTTP 客户端，无跨工具内部导入，无网络或宿主文件权限要求。

## 操作契约

POST /api/v1/tools/json-formatter/operations/format/execute。请求 contract_version=1，parameters 包含：

| 字段 | 规则 |
| --- | --- |
| text | 必填字符串，最多 100000 字符、400000 UTF-8 字节；空文本不合法 |
| indent | 2 或 4，默认 2；compact=true 时忽略 |
| sort_keys | 默认 false，启用时按键名排序 |
| compact | 默认 false，启用时输出单行并去掉分隔空白 |

结果返回 text、input_bytes、output_bytes。输出生成中超过 1000000 字符时返回 OUTPUT_TOO_LARGE，输入超限返回参数错误或 INPUT_TOO_LARGE。嵌套超过 64 层返回 JSON_TOO_DEEP。JSON 解析错误返回 422/INVALID_JSON，语法错误指出行列，重复键、非有限数值及孤立代理字符拒绝处理。成功输出保留中文，支持对象、数组、字符串、数字、布尔值和 null。

统一执行器另对完整参数对象按 UTF-8 JSON 序列化计量，上限为清单 max_input_bytes=400000，超限返回 REQUEST_TOO_LARGE；文本、深度与完整参数的限制同时生效，界面与 AI 使用相同规则。

纯同步、无业务副作用、幂等，不支持任务取消或任务历史。服务等待执行最多 5 秒，超时返回 504/SYNC_TIMEOUT；线程中的纯计算可能继续收尾，输入、深度和流式输出上限控制其资源占用，不宣称强制终止线程。HTTP 客户端 15 秒超时。

JSON 数值由 Python 标准 JSON 解析器处理，浮点数可能改变表示或精度；需要逐字保留大数和小数时应使用字符串。本工具不是无损源文本编辑器。

## 使用与验证

支持格式化、4 空格缩进、键排序、压缩、复制及保存 formatted.json。MCP 操作为 mtools_json_formatter__format_v1，直接接收 JsonParameters，效果为 read-only，见 [AI 使用](../ai-interop/usage.md)。浏览器剪贴板权限失败提供手动复制提示，不伪报复制成功。上传、任意路径和持久化历史不在本工具范围内。

集成测试覆盖中文、参数边界、无效 JSON、重复键、非有限数值和禁用状态；浏览器测试覆盖查找、执行、错误恢复、下载与刷新。入口见 [使用说明](usage.md) 和 [源码验证命令](../../guides/source.md)。
