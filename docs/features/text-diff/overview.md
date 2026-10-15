---
doc_id: FEAT-text-diff
title: 文本差异
kind: feature
status: active
implementation: implemented
feature_id: text-diff
updated: 2026-10-15
tags: [tools, development, usage]
---

# 文本差异

比较提示词、代码与配置；以行为单位返回 unified diff 与新增/删除行数。

## 契约与边界

old_text、new_text 各最多 50000 字符、2000 行；context_lines 默认 3，范围 0–10。空文本有效；保留空格和行尾换行差异。text 为差异文本，identical 表示完全一致，added_lines/removed_lines 按变更行统计。

HTTP：POST /api/v1/tools/text-diff/operations/compare/execute，输入 DiffParameters 放在 parameters，contract_version=1；输出 DiffResult。MCP 名为 mtools_text_diff__compare_v1，直接传参数对象。

Windows 桌面、源码浏览器、Docker 共用只读业务函数与 ToolRuntime。无额外依赖、无文件/网络权限，不保存输入和结果；执行上限 5 秒，完整参数 JSON 上限 800000 字节，受全局并发限制。参数类型/范围错误为 VALIDATION_ERROR，停用后不对 AI 发现且不可执行。

验证覆盖正常、中文、异常边界、界面/HTTP/MCP 等价结果。具体交付证据见 [本批记录](../../worklog/2026/10/2026-10-15-04-product-tools.md)；[使用说明](usage.md)。
