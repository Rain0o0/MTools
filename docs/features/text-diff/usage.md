---
doc_id: GUIDE-text-diff
title: 文本差异使用
kind: guide
status: active
implementation: implemented
feature_id: text-diff
updated: 2026-10-15
tags: [tools, development, usage]
---

# 文本差异使用

在工具目录搜索“文本差异”并打开；也可设为常用后从搜索栏下方进入。

输入原始文本和修改后文本，或点击“填入示例”，再点击“比较文本”。结果中 + 表示新增，- 表示删除；完全一致时显示提示并返回空差异。复制或下载 changes.diff。

原始文本 `a\nb\n`、修改后文本 `a\n中文\n`：新增 1 行、删除 1 行。超过行数返回 TOO_MANY_LINES，缩短后重试。最后一行缺少换行会显示标准 No newline at end of file 标记。

工具在当前 MTools 环境中处理文本，不自动保存历史。离开或刷新前保留结果；错误时输入保留。通过 AI 调用时结果交给所连接的客户端，见 [AI 使用](../ai-interop/usage.md)。。
