---
doc_id: GUIDE-text-codec
title: 编码与摘要使用
kind: guide
status: active
implementation: implemented
feature_id: text-codec
updated: 2026-10-15
tags: [tools, development, usage]
---

# 编码与摘要使用

在工具目录搜索“编码与摘要”并打开；也可设为常用后从搜索栏下方进入。

选择处理方式，输入文本，再点击“开始处理”。结果可复制或下载 result.txt。Base64 和 URL 编码不是加密，不应用于隐藏密钥；SHA-256 是不可逆摘要。

输入“中文”并选择 Base64 编码，结果为 `5Lit5paH`；选择解码并输入该结果，可还原“中文”。无效 Base64、百分号转义或非 UTF-8 结果返回 INVALID_ENCODING，修正后重试。摘要示例：`abc` → `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`。

工具在当前 MTools 环境中处理文本，不自动保存历史。离开或刷新前保留结果；错误时输入保留。通过 AI 调用时结果交给所连接的客户端，见 [AI 使用](../ai-interop/usage.md)。
