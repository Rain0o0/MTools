---
doc_id: STD-ARCH
title: 架构与代码结构规范
kind: standard
status: active
updated: 2026-10-15
tags: [architecture, modularity, dependencies, runtime]
---

# 架构与代码结构规范

本规范定义持续实现的架构基线。当前前后端框架已建立，实际模块与支持形态见 [平台功能](../features/platform-shell/overview.md)；目标目录按实际需要逐步创建。默认路线的背景见 [ADR-0001](../adr/0001-modular-local-web-toolbox.md)，桌面默认入口与统一 AI 边界见 [ADR-0002](../adr/0002-desktop-and-mcp.md)。

桌面、HTTP 与 MCP 适配器共享业务执行层；新增公开操作须满足 [MCP 规范](mcp.md)，不另写 AI 专用算法或仅前端可用的孤立功能。

## 1. 架构目标

工具可独立增加、测试、禁用和排查；重复能力有明确归属；业务逻辑不依赖桌面壳或 Docker；任意重要功能都能找到当前说明、操作方法与变更记录。

采用单仓库、模块化单体。前后端可以分别构建，交付时尽量由同一服务提供前端静态资源和 API，减少运行期组件。工具注册在受控入口集中装配；首期不做任意目录代码扫描执行或在线第三方插件安装。

## 2. 默认技术与替换条件

| 层次 | 默认路线 | 边界 |
| --- | --- | --- |
| 业务与服务 | Python、FastAPI、Pydantic、Uvicorn | 类型化 API，业务函数不依赖请求对象 |
| 前端 | React、TypeScript、Vite | 同一构建支持桌面 WebView 与浏览器 |
| 桌面 | pywebview 加载本机 HTTP 服务 | 壳只负责窗口、生命周期和原生能力适配 |
| 持久化 | 有持久化需求时使用 SQLite | 单实例起步；数据库与文件通过仓储接口访问 |
| 依赖管理 | Python 使用 uv；前端使用 pnpm | 初始化时验证版本、提交锁文件与运行时约束 |
| 异构工具 | 子进程、可选 sidecar 或本地库适配 | 只有明确性能、兼容性或生态收益时引入 |
| 交付 | 源码、桌面包、Docker/Compose | Docker 默认是无桌面环境的网页服务 |

这些是项目决定，不是第三方技术的唯一用法。不强行让所有工具使用 Python：纯文本转换等可在前端完成；已有 CLI 可接进程适配；重计算可采用其他语言实现。统一工具契约、错误处理、权限和文档要求仍适用。

首次实现必须核验受支持的 Python/Node 版本、WebView 运行时、目标系统、依赖许可及版本兼容性，写入真实环境指南。技术替换需记录动机、迁移代价、源码与 Docker 的影响；影响公共协议或主路线时增加 ADR。

## 3. 目标目录

以下是按需创建的逻辑结构，不要求预建空目录或空文件。小工具可以只保留必要文件。

~~~text
MTools/
  AGENTS.md
  README.md
  CHANGELOG.md
  pyproject.toml                 Python 项目与入口
  uv.lock
  .python-version
  apps/
    server/src/mtools/
      bootstrap/                配置、依赖注入、工具装配、启动/关闭
      contracts/                工具协议、任务/文件引用、错误与公开类型
      platform/                 工具目录、任务调度、配置等平台用例
      shared/                   有明确职责的可复用业务能力
      adapters/                 文件系统、数据库、网络、进程等实现
      tools/<tool_package>/     单工具领域逻辑与接入，tool_ 前缀加 ID 下划线映射
    web/
      package.json
      pnpm-lock.yaml
      src/
        app/                    壳布局、路由、装配、全局错误边界
        platform/               工具目录、任务与环境能力的客户端
        shared/                 UI、API 基础设施与通用纯函数
        tools/<tool_id>/        单工具页面、状态与表现逻辑
        generated/              从 API/契约生成的类型
    desktop/                    窗口、启动、原生能力适配与打包入口
  packages/                     确有独立分发或跨语言复用需求时再建
  tests/                        服务契约、集成、端到端、交付检查
  deploy/                       镜像、桌面打包与发布配置
  scripts/                      可重复的本地任务与文档检查
  compose.yaml
  .env.example
  docs/
~~~

后端单工具的候选结构是 manifest.json、schemas.py、service.py、router.py、tests/；复杂工具才继续拆 domain/、ports.py、adapters/。前端候选结构是 index.ts、page.tsx、components/、model/、tests/。不为形式上的层数拆出只有转发功能的文件。

## 4. 依赖方向

| 模块 | 允许依赖 | 禁止依赖 |
| --- | --- | --- |
| contracts | 标准类型、必要的契约校验库 | 具体工具、数据库实现、Web 框架请求对象 |
| shared | contracts、稳定基础能力接口 | tools、bootstrap、桌面壳 |
| platform | contracts、shared、注入的适配接口 | 具体工具内部实现 |
| tools | contracts、shared、平台公开接口 | 其他工具内部目录、bootstrap |
| adapters | 契约/端口、第三方 SDK | 向业务层泄漏具体连接和进程对象 |
| bootstrap | 上述模块的公开装配入口 | 承载工具业务逻辑 |

纯计算逻辑保持对框架和外部 I/O 无依赖；I/O 经端口注入。注册器负责组装，业务代码不主动查找全局可变对象。

共享提取以真实复用为依据：第二个真实使用方出现时评估，或首次接入已明确存在多个使用方时提取。按文件处理、编码、转换等职责命名，不堆积 utils.py、common.ts 或巨大 BaseTool。

跨工具组合见 [工具接入规范](tool-development.md)：通过能力契约编排，声明依赖、版本和失败行为，禁止循环依赖及跨工具直接查询私有表。

## 5. 三种运行形态

~~~text
桌面：WebView → 本机 HTTP API → 业务/任务/工具 → 环境适配器
源码：浏览器或桌面壳 → 同一 API 与业务核心
Docker：浏览器 → 容器内 HTTP API → 同一核心 → 容器适配器
~~~

- 前端以环境能力响应决定可用功能，不根据操作系统字符串猜测权限。
- Docker 访问客户端文件使用上传/下载；卷挂载仅代表容器能访问所挂目录。不能把浏览器用户的本机路径当作服务端路径。
- 宿主剪贴板、原生文件选择器和特定系统工具允许仅桌面提供，必须有不可用说明或网页替代流程。
- 桌面服务生命周期由壳管理：端口分配、就绪探测、会话建立、异常提示、退出时回收；不依赖固定睡眠等待，不误杀其他实例。
- 平台初始化失败应明确失败；可选工具依赖缺失只禁用该工具并暴露原因。一般异常可隔离；崩溃型本地库或高风险进程必须使用进程隔离，不能声称进程内插件有沙箱保护。

## 6. 数据与演进

源码目录、构建产物和运行数据分开。配置、数据库、日志、临时文件、导出产物均通过路径服务定位；不能在代码中硬编码 F:/MTools 或用户目录。

新增持久化模型时建立迁移与备份方案。首期使用单后端实例、受控任务并发；引入多 worker/多实例前，先解决任务去重、租约、并发写、会话和共享存储一致性，不直接提高进程数。

公共 API、工具协议和数据结构分别管理兼容性。破坏性变更需要迁移或过渡说明；由 ADR 记录重大原因，当前规范同步为新事实。

## 7. 官方参考

以下来源支持技术可行性，项目分层和目录结构是本项目的设计选择。核验日期：2026-10-15。

- [FastAPI 多文件与 APIRouter](https://fastapi.tiangolo.com/tutorial/bigger-applications/)：支持拆分路由模块。
- [pywebview 应用架构](https://pywebview.flowrl.com/guide/architecture.html)：支持加载本地服务 URL。
- [Vite 入门](https://vite.dev/guide/)：前端开发与构建工具参考，Node 约束须在初始化时重新核验。
- [Docker Compose 卷](https://docs.docker.com/reference/compose-file/volumes/)：持久化存储与显式服务挂载。
