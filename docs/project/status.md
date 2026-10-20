---
doc_id: PROJECT-STATUS
title: 项目当前状态
kind: status
status: active
updated: 2026-10-20
tags: [project, status]
---

# 项目当前状态

MTools 1.0.0 提供 Windows 桌面、源码浏览器、Docker 和 MCP AI 接入方式。工具覆盖文本、JSON、图片、音频和视频处理；多媒体功能依赖 FFmpeg，语音能力可能需要额外模型或网络服务。

## 使用入口

- 首次运行：查看项目根目录 [README](../../README.md)。
- 安装和配置：[使用手册](../guides/README.md)。
- 工具说明：[功能索引](../features/README.md)。
- 版本变化：[变更日志](../../CHANGELOG.md)。

## 支持范围

项目以本地单用户使用为目标。Windows 桌面为主要入口；源码服务和 Docker 提供浏览器入口。Docker 默认绑定本机回环地址，不作为公网多用户服务。不同运行方式和媒体组件要求见对应使用指南。