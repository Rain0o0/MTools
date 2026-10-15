---
doc_id: FEAT-text-codec
title: 编码与摘要
kind: feature
status: active
implementation: implemented
feature_id: text-codec
updated: 2026-10-15
tags: [tools, development, usage]
---

# 编码与摘要

对 UTF-8 文本进行 Base64、URL 组件编解码或 SHA-256 摘要计算，不提供任意代码执行。

## 契约与边界

text 最多 100000 字符。action 为 base64-encode（默认）、base64-decode、url-encode、url-decode、sha256。结果为 text、input_bytes、output_bytes。Base64 使用标准字母表并严格校验，不接受空白；解码结果必须是 UTF-8。URL 编码用于单个组件，解码保留加号，不按表单规则把 + 转为空格。SHA-256 返回小写十六进制摘要。

HTTP：POST /api/v1/tools/text-codec/operations/transform/execute，输入 CodecParameters 放在 parameters，contract_version=1；输出 CodecResult。MCP 名为 mtools_text_codec__transform_v1，直接传参数对象。

Windows 桌面、源码浏览器、Docker 共用只读业务函数与 ToolRuntime。无额外依赖、无文件/网络权限，不保存输入和结果；执行上限 5 秒，完整参数 JSON 上限 800000 字节，受全局并发限制。参数类型/范围错误为 VALIDATION_ERROR，停用后不对 AI 发现且不可执行。

验证覆盖正常、中文、异常边界、界面/HTTP/MCP 等价结果。具体交付证据见 [本批记录](../../worklog/2026/10/2026-10-15-04-product-tools.md)；[使用说明](usage.md)。
