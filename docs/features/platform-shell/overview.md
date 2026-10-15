---
doc_id: FEAT-platform-shell
title: 平台框架与扩展契约
kind: feature
status: active
implementation: implemented
feature_id: platform-shell
updated: 2026-10-15
tags: [platform, contracts, registry, security]
---

# 平台框架与扩展契约

当前实现提供桌面、源码浏览器和 Docker 共用的前后端框架：工具目录、运行能力、可信注册器、短期会话、统一错误、日志、健康检查、静态前端和深层路由。Windows 桌面目录包与 Linux Docker 已完成本机运行验收；任务调度、文件产物和数据库未实现。AI 经 stdio 复用同一操作执行器，见 [统一 AI 接口](../ai-interop/overview.md)。

## 结构与依赖

服务端位于 apps/server/src/mtools/：contracts 维护 Pydantic 公共模型；platform 处理工具注册、统一执行与会话；adapters 提供日志、偏好存储、桌面与 MCP；bootstrap 集中配置、生命周期、安全和路由装配；tools 存放独立工具。没有实际复用的业务算法不提前提取 shared。

前端位于 apps/web/src/：app 维护导航、路由和受信任懒加载映射；platform 缓存当前工具目录与能力；shared 提供统一 HTTP 客户端、错误边界和主题令牌；tools 维护工具局部输入、参数和结果。generated 由后端 OpenAPI 生成类型和独立校验器，禁止手改。校验器在构建前生成，浏览器内不使用动态代码生成，兼容严格 CSP。

## 当前接口

| 接口 | 行为 |
| --- | --- |
| GET /health/live | 进程存活，无会话要求 |
| GET /health/ready | 核心初始化完成后返回 ready；否则 503 |
| POST /api/v1/session | 允许来源引导会话，返回 csrf_token、expires_in 并写入 HttpOnly Cookie |
| GET /api/v1/tools | 按 tool_id 排序；cursor 为非负偏移，limit 默认 50、上限 100 |
| GET /api/v1/tools/{tool_id} | 清单、运行状态、原因和实际可用操作 |
| GET/PUT /api/v1/preferences | 读取/原子保存 version=1、theme=light/dark；PUT 要求 CSRF |
| GET /api/v1/ai/connection | 当前源码、桌面或 Docker 的 stdio 启动配置，无密钥 |
| GET /api/v1/capabilities | 运行模式、实际宿主能力、任务与产物支持状态 |
| POST /api/v1/tools/json-formatter/operations/format/execute | 首个工具的强类型同步操作 |

成功直接返回模型；失败为 error.code、error.message、error.details、request_id。诊断编号由服务生成并放入 X-Request-ID，校验错误不回显输入。详见生成的 apps/web/openapi.json；不对外开放 Swagger 和匿名 OpenAPI。计算操作采用统一路径形状，各工具明确注册强类型路由，以保留真实输入输出 schema。

## 注册规则与扩展

每个工具只维护一份 manifest.json。当前支持 manifest_version=1、同步 backend 操作、desktop/source-web/docker-web 模式。依赖版本暂使用精确语义版本，不支持版本范围；这一实现子集避免假装存在前端执行适配或长任务系统。新增形态需要同步扩展契约、注册器、客户端与文档。

注册器拒绝重复 ID、重复操作、清单与操作入口不一致、错误路由、循环依赖和未知禁用配置。操作以 operation_id 映射到绑定输入/输出模型的 OperationHandler，经 ToolRuntime 执行；清单 schema 引用名与模型名须一致，MCP 自动从绑定模型投影。必需工具缺失导致 unavailable，版本不符导致 incompatible；缺能力导致 unavailable；配置停用为 disabled。可选依赖缺失不阻断工具。核心注册结构错误阻止启动。清单不提供动态代码导入或外部脚本入口。

新增工具需要：定义模型和纯业务函数、添加清单、在 bootstrap 显式装配并注册带响应模型的路由、在前端 app/registry.ts 添加懒加载页面，然后更新契约产物和功能文档。每个操作都必须完成 MCP 发现与调用验收；不能只复制前端菜单或跨工具导入内部实现。

## 会话与安全

单实例、单用户、回环发布。桌面额外要求原生事件附加随机 X-MTools-Desktop 凭据，普通浏览器访问桌面实例被拒绝；生命周期见 [桌面指南](../../guides/desktop.md)。会话引导必须携带配置允许的 Origin；后续 API 均要求 Cookie。状态变更额外要求 X-CSRF-Token；若带 Origin 仍校验来源，拒绝 cross-site/same-site 浏览器请求。无 Origin 的客户端必须先经允许来源引导，并携带会话和 CSRF。会话仅存内存，默认 8 小时、最多 128 个，重启失效。既有有效会话重复引导不额外占名额；过期记录在创建时回收，满额返回 429。

Host 必须明确列入白名单。默认请求体最多 1 MiB，超限返回 413；会话和 API 响应 no-store。静态生产页面启用 CSP，前端资源在本地打包，不依赖 CDN。开发由 Vite 同源代理访问后端，不开放 CORS 通配符。

这不是多用户身份认证。不同来源网页无法直接驱动本机服务，但能控制本机进程的用户不在此隔离范围内；不得直接作为远程公网服务。宿主文件、网络工具、原生剪贴板能力均返回不可用；浏览器复制和下载是页面自身功能。

日志为 UTC JSON，包含请求编号、操作标识和耗时；不记录正文或 Cookie。日志位于数据目录 logs/，默认单文件 2 MB、3 份轮转备份。未知异常提供问题编号；工具失败不记录正文/结果或异常对象，常规日志仅保留安全元数据。

## 界面与当前限制

工具目录提供搜索、分类、可用状态、空目录和无匹配结果。整卡进入工具，标签筛选，状态/隐私/版本打开说明，帮助卡与折叠提示均有合理交互；弹窗支持 Escape 和焦点恢复。工具页面局部错误边界支持重试，不阻断侧栏导航；直接输入未知路由有恢复入口。浅色/深色由共享语义令牌提供，偏好保存在数据目录 preferences.json，原子替换，随机端口或软件重启后继续生效；损坏 JSON/schema 回退浅色，写入失败提示本次切换未保存。主色为绿色，布局遵循侧栏与工作区模式，窄屏折叠导航。

HTTP 超时 15 秒，支持页面卸载取消网络等待；这不代表取消服务端操作。同步工具无任务历史、持久输入或跨页面草稿保存，离开页面会清空其局部状态。请求失败不自动重发，用户再次点击才重新执行。持久数据为日志和主题，桌面另有 WebView 缓存；无业务数据库或产物清理机制。

操作与验证入口见 [平台使用](usage.md)、[源码指南](../../guides/source.md)、[配置说明](../../guides/configuration.md) 和 [界面截图](../../assets/platform-shell/README.md)。
