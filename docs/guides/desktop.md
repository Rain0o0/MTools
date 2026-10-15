---
doc_id: GUIDE-desktop
title: Windows 桌面软件与构建
kind: guide
status: active
implementation: implemented
updated: 2026-10-15
tags: [desktop, windows, webview, packaging]
---

# Windows 桌面软件与构建

本机默认打开独立 MTools 窗口，不需要常规浏览器。当前支持 Windows x64，使用 pywebview 6.2.1、Windows WebView2 和 PyInstaller 6.22.3；本机已完成实际窗口和打包程序验证。macOS/Linux 桌面、安装器、代码签名及干净 Windows 虚拟机验收未执行。

## 打开和退出

本地构建产物在 dist/desktop/MTools/，双击 MTools.exe。保留同目录 MToolsAI.exe 和 _internal/；无需安装 Python 或 Node，Windows 必须有 WebView2 运行时。程序及窗口使用橙色外层、黄色 M 图标，程序属性同步应用版本。关闭窗口同时停止本实例服务；不会结束其他进程或占用固定 8000 端口。

窗口无法创建或界面资源不完整时弹出错误提示。WebView2 缺失时按 [Microsoft 官方运行时说明](https://developer.microsoft.com/microsoft-edge/webview2/) 安装对应运行时再打开，软件不静默下载执行代码。数据目录需当前用户可写。

## 源码与打包

先按 [源码指南](source.md) 安装并构建界面，在仓库根目录运行：

```powershell
./scripts/start.ps1
```

等价命令为 uv run --frozen mtools desktop，省略 desktop 仍是桌面入口。制作本地 Windows 目录包：

```powershell
./scripts/build-desktop.ps1
```

脚本先构建前端，再使用锁定的 desktop-build 依赖组和 deploy/mtools.spec 打包两个入口。PowerShell 脚本以 UTF-8/LF 保存，使用 PowerShell 7 执行。本地构建不代表已发布或已签名；首次对外分发前仍需完成许可材料和发行验收。

## 数据与权限

桌面从 49152–65535 中随机绑定可用回环端口（避开 WebView2 的受限低端口，最多重试 64 次），只有原生窗口为本实例来源请求附加随机凭据；普通浏览器不能打开该桌面实例。限制导航与新窗口，不暴露通用 Python 调用桥。这是防止网页误用本机服务的边界，不隔离拥有本机进程控制权的用户。

主题和常用工具保存在用户数据目录 preferences.json；webview/ 为嵌入式引擎缓存，logs/ 为运行诊断。输入和结果不保存历史，离开页面前自行复制或下载。退出后可备份 preferences.json；缓存不是业务备份。完整配置见 [配置说明](configuration.md)。

下载会打开系统保存对话框；取消保存不会生成文件，页面“已生成下载文件”只表示已交给保存流程。AI 配置在“AI 助手”页面获取，详见 [AI 使用](../features/ai-interop/usage.md)。

开发验收：uv run --frozen python scripts/verify_desktop.py 验证真实 WebView2 操作、导航限制和退出；pnpm --dir apps/web exec node scripts/verify-delivery.mjs desktop 验证实际 exe、复制、配置、截图和服务回收。后者仅在验收进程环境启用本机 WebView2 调试端口 9337，产品正常启动不启用该端口；运行前确保端口空闲。
