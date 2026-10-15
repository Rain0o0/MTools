---
doc_id: GUIDE-configuration
title: 配置与数据目录
kind: guide
status: active
updated: 2026-10-15
tags: [configuration, environment, security]
---

# 配置与数据目录

配置由 bootstrap/config.py 的 Settings 统一校验。当前优先级为命令行显式 --host/--port > MTOOLS_ 环境变量 > 默认值；启动配置文件尚未实现；界面偏好另存 preferences.json 并即时生效，不自动读取 .env。`.env.example` 仅用于展示安全默认值，不含凭据。无效配置启动失败，全部配置更改需要重启。

| 环境变量（去掉 MTOOLS_ 前缀） | 类型与默认值 | 说明 |
| --- | --- | --- |
| HOST | 字符串，127.0.0.1 | 源码回环；Docker 内 0.0.0.0 |
| PORT | 整数，8000；1–65535 | 调整端口需同步允许来源和访问地址 |
| MODE | source-web、desktop 或 docker-web | 桌面入口强制 desktop 与随机回环端口/来源；不要靠此变量模拟桌面凭据 |
| DATA_DIR | 路径，platformdirs 当前用户 MTools 数据目录 | logs/、preferences.json 可写；桌面另有 webview/，无输入历史 |
| WEB_DIR | 路径，源码 apps/web/dist | Docker 固定 /app/web；安装 wheel 时需显式指定构建目录 |
| ALLOWED_HOSTS | JSON 字符串数组，127.0.0.1、localhost、[::1] | 禁止通配符，不含端口 |
| ALLOWED_ORIGINS | JSON 数组，http://127.0.0.1:8000 与 http://localhost:8000 | 明确协议/主机/端口；无尾随斜杠与通配符 |
| DISABLED_TOOLS | JSON 数组，[] | 当前可填 json-formatter；未知 ID 阻止启动 |
| SESSION_TTL_SECONDS | 整数，28800；60–86400 | 内存短期会话；重启全部失效 |
| MAX_SESSIONS | 整数，128；1–1024 | 达上限返回 429；过期会话创建时清理 |
| MAX_REQUEST_BYTES | 整数，1048576；1024–4194304 | 请求体接收上限，超限 413；工具还有更小输入上限 |
| LOG_MAX_BYTES | 整数，2000000；至少 1024 | JSON 文件日志轮转阈值 |
| LOG_BACKUP_COUNT | 整数，3；1–10 | 轮转备份份数；另有当前日志 |

以上字段均为非秘密配置，无需填写 API 密钥。会话和 CSRF 凭据由进程随机生成，不可写入配置、URL 或源码。默认只有受信任的本机单用户使用，不支持更改绑定后直接提供公网访问。

在仓库根目录 PowerShell 临时指定数据目录及新端口：

```powershell
$env:MTOOLS_DATA_DIR = Join-Path (Get-Location) '.runtime/manual'
$env:MTOOLS_ALLOWED_ORIGINS = '["http://127.0.0.1:8080"]'
uv run --frozen mtools serve --port 8080
```

此后访问 http://127.0.0.1:8080。环境变量仅作用于当前终端及子进程。包含中文或空格的路径通过环境变量传递，不拼接进 shell 命令；相对数据路径以启动时的工作目录解析，稳定部署建议使用绝对目录。

需要停用工具时设置 `$env:MTOOLS_DISABLED_TOOLS='["json-formatter"]'` 后重启。目录仍展示停用原因，直接调用操作返回 503；核心就绪不受影响。Docker 数据固定 /data，并用命名卷存储日志和主题，见 [Docker 指南](docker.md)。设置页切换主题经会话/CSRF 保护的 PUT /api/v1/preferences 原子保存；损坏 JSON/schema 回退浅色，写入失败明确提示。由旧 localStorage 升级时默认浅色，不自动迁移浏览器偏好。桌面端口/Host/Origin 由入口管理，--host/--port 仅对 serve 的监听有意义。
