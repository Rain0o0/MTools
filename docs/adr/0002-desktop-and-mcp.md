---
doc_id: ADR-0002
title: 桌面默认入口与统一 MCP 执行边界
kind: decision
status: active
implementation: implemented
updated: 2026-10-15
tags: [desktop, mcp, security, architecture]
---

# ADR-0002：桌面默认入口与统一 MCP 执行边界

用户明确要求本机以独立软件使用、界面内容可操作且面向普通用户，以及全部工具供 AI 调用。本决定细化 [ADR-0001](0001-modular-local-web-toolbox.md) 的运行入口与操作契约，保留模块化单体和 Docker 浏览器交付方向。

默认命令 mtools 打开 Windows pywebview/WebView2 窗口，serve 显式启动浏览器服务，mcp 仅提供 stdio。桌面预绑定随机回环端口，原生请求事件只为自身来源附加本次随机凭据；凭据不进 URL、JavaScript 或配置，普通浏览器访问桌面实例返回 403。窗口关闭结束本实例线程与监听，不结束其他程序。导航限制在本实例来源，不暴露通用 Python JS 桥。

Windows 使用 PyInstaller onedir，MTools.exe 为无控制台 GUI，MToolsAI.exe 为同目录控制台 stdio 入口，共享内部依赖。无需额外安装 Python/Node，仍依赖 Windows WebView2 运行时。首次发行的签名、安装器和许可汇总另行完成，不把本地构建称为正式发布。

每个操作绑定正式输入/输出模型；清单补充中文用途、副作用和 AI 可调用性。统一 ToolRuntime 执行校验、并发/超时、审计与输出验证；HTTP 保留明确响应模型并生成前端契约，MCP 从注册器自动投影 schema、版本名和 annotations。未知、停用或不兼容工具统一阻断。

AI 默认仅放行 read-only；涉及写入、删除、向外发送的操作必须建立软件用户发起的可信授权流程，当前尚未实现且默认拒绝。stdio 避免新增常驻网络 MCP 端口；客户端持有进程权限，协议本身不构成系统沙箱。

偏好从浏览器 localStorage 改为数据目录内原子保存的 preferences.json，保证桌面随机端口和软件重启后仍保留主题。旧 localStorage 偏好不自动迁移，首次升级使用浅色；不迁移用户输入，因为从未持久保存输入。

不采用普通浏览器作为本机默认入口；没有收益证据，不更换为 Electron/Tauri、不引入另一套工具算法或远程 AI 网关。代价是维护 WebView 生命周期、桌面与 stdio 双入口，以及副作用授权规则。

兼容性：原来 mtools 默认启动网页服务，现在需显式 mtools serve；清单和注册器新增必填契约字段，随应用升级并重新生成 OpenAPI/前端类型；当前无第三方动态插件迁移。验证证据见 [桌面与 MCP 记录](../worklog/2026/10/2026-10-15-03-desktop-mcp.md)。
