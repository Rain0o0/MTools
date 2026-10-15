---
doc_id: GUIDE-docker
title: Docker 构建与使用
kind: guide
status: active
implementation: implemented
updated: 2026-10-15
tags: [docker, delivery, validation]
---

# Docker 构建与使用

根 compose.yaml 和 deploy/Dockerfile 已在 Docker 28.3.2 Linux 引擎完成实际构建、健康检查、中文工具操作、下载、深层刷新、stdio MCP、重启数据保留与停止验收。Docker 保留浏览器使用方式；本机默认软件使用 [桌面入口](desktop.md)。

镜像使用前端构建、Python 依赖和运行三个阶段，固定 Node 24.12.0、Python 3.13.15、uv 0.12.6、pnpm 11.22.0，依赖遵守锁文件。Windows-only 桌面依赖不会安装到 Linux。

在仓库根目录执行：

```powershell
docker compose build
docker compose up -d --wait
docker compose logs --tail 50
```

访问 [容器工具箱](http://127.0.0.1:8000)，按 [JSON 使用](../features/json-formatter/usage.md) 执行并下载结果。重启用 docker compose restart；普通停止用 docker compose down，保留命名卷。不要把删除卷参数加入普通停止步骤。

默认仅发布宿主回环 8000，非 root UID/GID 10001，应用只读，只有 /data 命名卷及 /tmp tmpfs 可写；禁止提权、移除 capabilities，不挂 Docker socket 或宿主目录。单 worker、真实 Python 健康探针、init/退出宽限与内存/PID/日志限制均在 Compose 声明。此配置不作为公网多用户认证。

卷保存 logs/ 与 preferences.json，无数据库、任务或输入历史。重启和重建保留日志/主题；停止后可备份整个卷，恢复前保持版本一致。未提供文件上传、任意宿主路径访问；下载在使用者设备保存，不代表服务器取得该设备文件权限。

AI 在“AI 助手”获取同一 Docker 宿主适用的 docker exec -i 配置，重建容器后重新获取。验收命令：pnpm --dir apps/web exec node scripts/verify-delivery.mjs docker；真实协议验证见 [AI 使用](../features/ai-interop/usage.md)。尚未验证 Docker Desktop 之外的平台发行环境、跨版本数据迁移或远程暴露。
