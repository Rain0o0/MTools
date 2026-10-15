---
doc_id: FEAT-json-lines
title: JSON / JSONL 转换
kind: feature
status: active
implementation: implemented
feature_id: json-lines
updated: 2026-10-15
tags: [tools, development, usage]
---

# JSON / JSONL 转换

在 JSON 数组与 JSONL 之间转换，适用于 AI 数据集与批量请求内容整理。

## 契约与边界

text 最多 100000 字符；direction 为 json-to-jsonl（默认）或 jsonl-to-json。最多 2000 条记录，输入结构最多 64 层，输出最多 1000000 字节；拒绝重复键、NaN/Infinity、非有限数值和无效 Unicode。text 返回转换结果，records 为记录数。标准解析器可能改变浮点数精度，精度敏感数字使用字符串。与 JSON 格式化共享 shared/json_text.py 的严格解析规则，不跨工具导入内部实现。

HTTP：POST /api/v1/tools/json-lines/operations/convert/execute，输入 JsonLinesParameters 放在 parameters，contract_version=1；输出 JsonLinesResult。MCP 名为 mtools_json_lines__convert_v1，直接传参数对象。

Windows 桌面、源码浏览器、Docker 共用只读业务函数与 ToolRuntime。无额外依赖、无文件/网络权限，不保存输入和结果；执行上限 5 秒，完整参数 JSON 上限 800000 字节，受全局并发限制。参数类型/范围错误为 VALIDATION_ERROR，停用后不对 AI 发现且不可执行。

验证覆盖正常、中文、异常边界、界面/HTTP/MCP 等价结果。具体交付证据见 [本批记录](../../worklog/2026/10/2026-10-15-04-product-tools.md)；[使用说明](usage.md)。
