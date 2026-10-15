---
doc_id: LOG-20261015-04
title: 0.2.0 工具目录、开发工具与 Codex
kind: worklog
status: active
updated: 2026-10-15
tags: [tools, development, usage]
---

# 0.2.0 工具目录、开发工具与 Codex

关联 platform-shell、ai-interop、text-diff、json-lines、text-codec 及版本交付。

用户要求弱化介绍、突出工具，增加 AI 开发工具、常用快捷入口、Codex 连接测试、图标与 Git 版本迭代。

- 移除目录介绍区并收紧卡片，搜索下显示常用快捷入口；星标持久化，PATCH 避免主题与常用互相覆盖。
- 新增文本差异、JSON/JSONL、编码/摘要，统一 HTTP/MCP；JSON 严格规则提取 shared。输入、记录/行数、深度和输出有界，不增加业务依赖。
- Codex 使用固定 CLI 注册，检测安装、同名幂等/冲突保护，桌面凭据和会话/CSRF 限制写入；真实 stdio 连接测试区分传输与客户端刷新。
- 内置 imagegen 生成橙底黄 M，导出 Windows ICO 与界面 PNG。Git 保存 v0.1.0 基线，0.2.0 为本批版本；脚本与暂存区钩子执行 minor+1 规则，未推送或发布。
- 同步功能/使用、配置、版本、交付规则、索引、路线图和变更日志。

## 验证

统一检查通过：Ruff、mypy、OpenAPI 与类型/校验器一致、ESLint、格式与构建、UTF-8/LF/文档链接；47 项后端、8 项 Chromium 交互通过（1280×800、900×600、390×844，覆盖目录、四工具与 AI 页无横向溢出）；包括真实 Codex CLI 独立配置目录注册与冲突、真实 stdio 四工具调用、中文与错误边界、常用偏好和主题互不覆盖。版本规则用隔离 Git 索引验证：不递增拒绝，全部同步为下一 minor 时通过；本仓库 pre-commit 同时复核实际暂存区。日常 Codex 配置未改动，模型主动选用工具未执行。

Windows 目录包与 Linux Docker 均已构建并完成四项工具实际操作、深层刷新、偏好、AI 配置及一键连接测试；桌面按钮真实注册到独立 Codex 目录，关闭后服务回收，Docker 下载与桌面复制通过。成品 MCP 客户端完成四项发现/调用；源码 WebView2 额外验证外部导航阻断。程序属性 FileVersion/ProductVersion=0.2.0。

成品验收发现系统随机端口 6668 被 WebView2 判为 ERR_UNSAFE_PORT；改为 49152–65535 范围随机绑定并有限重试，回归覆盖端口范围、实际窗口与退出。不是放宽浏览器安全规则。

截图见 [界面证据](../../../assets/platform-shell/README.md)。干净 Windows、安装器、签名和对外发行未执行。
