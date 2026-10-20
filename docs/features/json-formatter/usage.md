---
doc_id: GUIDE-json-formatter
title: JSON 格式化使用说明
kind: guide
status: active
implementation: implemented
feature_id: json-formatter
tool_id: json-formatter
updated: 2026-10-15
tags: [json, usage]
---

# JSON 格式化使用说明

1. 在工具目录搜索“JSON”，点击“打开工具”。
2. 粘贴标准 JSON，或点击“填入示例”。最多输入 100000 字符。
3. 选择 2 或 4 空格缩进；按需勾选“按键名排序”或“压缩为一行”。
4. 点击“格式化 JSON”或“压缩 JSON”，在右侧查看结果。
5. 点击“复制”或“下载”。文件名为 formatted.json；桌面打开系统保存对话框，浏览器由其保存设置决定位置。

例如输入 `{"b":2,"a":"你好"}`，同时勾选排序和压缩后得到 `{"a":"你好","b":2}`。

错误信息保留在操作区下方，语法错误提示行列；修正输入后再次执行。重复键、NaN、Infinity 不符合本工具的严格规则。复制失败时可选中结果手动复制，下载不要求服务端访问本机目录。

桌面在本机处理，共享工作区在提供工作区的设备处理，不调用第三方转换服务；当前版本不保存输入或处理历史。刷新、离开页面会清空工作区，保留结果请先下载。若数值精度必须逐字保留，把数字作为字符串。。也可通过 [AI 接入](../ai-interop/usage.md) 让助手调用相同操作。
