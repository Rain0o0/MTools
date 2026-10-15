---
doc_id: GUIDE-ai-interop
title: 连接 AI 使用工具
kind: guide
status: active
implementation: implemented
feature_id: ai-interop
updated: 2026-10-15
tags: [ai, mcp, usage]
---

# 连接 AI 使用工具

## Codex 快捷连接

打开桌面 MTools →“AI 助手”，在 Codex 区域点击“添加到 Codex”，向本机 Codex 配置新增 mtools 连接。操作仅使用已安装 CLI，不安装软件、不修改其他连接。同名且相同配置可安全重复；不同配置明确提示冲突，需先在 Codex 中核对移除旧连接。

点击“测试连接”即可验证真实握手、工具发现和内置示例调用。成功会显示发现数与示例数，不处理你的输入、不调用模型。添加完成后重新打开 Codex 会话，使新配置生效；必要时在 Codex 的 MCP 设置检查工具状态。没有检测到 CLI 时展开“查看 Codex 专用配置”并手动添加，勿把通用 mcpServers JSON 当作 Codex TOML。

源码浏览器和 Docker 不自动修改本机 Codex；Docker 的配置用于容器宿主，测试仅验证容器内工具进程。此功能依照 [Codex 官方 MCP 文档](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)；本机验证 CLI 版本为 0.159.2。

## 其他支持 MCP 的客户端

1. 打开 MTools，选择侧栏“AI 助手”。
2. 点击“获取连接信息”，复制配置到你信任且支持 MCP stdio 的 AI 客户端；不同客户端的添加入口和配置格式可能不同，mcpServers 示例供支持该格式的客户端使用。
3. 客户端启动连接后应发现 JSON 格式化、文本差异、JSON/JSONL 转换、编码与摘要四项操作（停用项除外）。可请求：“用 MTools 把这段 JSON 整理一下，保留中文。”
4. 把需要处理的内容明确交给客户端；结果会返回给它。软件窗口不必一直开启，AI 客户端管理其启动的进程。

桌面配置 command 为安装目录内 MToolsAI.exe，args 为 ["mcp"]。保持整个 MTools 目录完整，不要只移动一个 exe；移动程序后重新获取配置。源码配置使用当前隔离环境 Python 和 ["-m", "mtools", "mcp"]。数据目录和停用工具配置通过 env 保持一致。

Docker 配置通过 docker exec -i 启动容器内协议进程；客户端必须与容器在同一 Docker 宿主，Docker 命令可用且容器正在运行。不要加 -t，交互终端会干扰协议。容器重建后 ID 改变，应重新获取配置。未支持远程浏览器直接授权本机文件。

发现不到工具时，确认软件配置没有停用该工具，客户端指向正确程序；更改停用配置后重启连接。参数错误按提示更改，不需要重新安装。不得通过 confirmed=true 绕过写入授权；当前四项工具均只处理明确传入的文本，不写入业务文件。

开发验收在仓库根目录执行：

```powershell
uv run --frozen python scripts/verify_mcp.py
uv run --frozen python scripts/verify_mcp.py F:\MTools\dist\desktop\MTools\MToolsAI.exe mcp
uv run --frozen python scripts/verify_mcp.py docker compose exec -T mtools python -m mtools mcp
```

第二条路径换为实际产物绝对路径，示例仅对应本次工作目录；程序自身不依赖 F: 盘。接入规则见 [MCP 规范](../../standards/mcp.md)，工具参数经 [功能索引](../README.md) 查询。
