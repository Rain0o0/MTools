---
doc_id: GUIDE-json-lines
title: JSON / JSONL 转换使用
kind: guide
status: active
implementation: implemented
feature_id: json-lines
updated: 2026-10-15
tags: [tools, development, usage]
---

# JSON / JSONL 转换使用

在工具目录搜索“JSON / JSONL 转换”并打开；也可设为常用后从搜索栏下方进入。

选择转换方向，粘贴对应文本，点击“开始处理”。JSON → JSONL 要求顶层数组；JSONL → JSON 每行一个 JSON 值，忽略空白行。结果可复制或下载 converted.txt；按用途改名为 .jsonl 或 .json。

输入 `[{"中文":true},2]`，选择 JSON 数组 → JSONL，输出两行：`{"中文":true}` 与 `2`，末尾带换行。空数组输出空文本；空白 JSONL 转为空数组。ARRAY_REQUIRED 表示须输入数组；INVALID_JSON 表示格式、重复键、字符或数值异常；JSONL 提示行号但不回显正文。TOO_MANY_RECORDS、JSON_TOO_DEEP、OUTPUT_TOO_LARGE 时缩小输入。

工具在当前 MTools 环境中处理文本，不自动保存历史。离开或刷新前保留结果；错误时输入保留。通过 AI 调用时结果交给所连接的客户端，见 [AI 使用](../ai-interop/usage.md)。
