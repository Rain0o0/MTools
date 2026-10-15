---
doc_id: GUIDE-versioning
title: Git 与版本迭代
kind: guide
status: active
updated: 2026-10-15
tags: [tools, development, usage]
---

# Git 与版本迭代

仓库位于项目根目录，默认分支 main。v0.1.0 是原有实现基线，当前应用版本 0.2.0；本地提交与标签用于回退追溯，没有配置远端、推送或发布。

每批更新递增 minor，patch 保持 0。例如 0.2.0 → 0.3.0，文档更新也属于一批更新。应用版本与工具契约/清单版本分别管理，新增工具不改变已有 MCP 契约版本。

在仓库根目录执行：

```powershell
uv run --frozen python scripts/bump_version.py
```

脚本同步 pyproject.toml、后端 __version__、前端 package.json 和 uv.lock；不会提交或发布。前端直接读取 package.json 显示版本，健康接口与 OpenAPI 使用后端版本。递增后更新 CHANGELOG.md 的对应版本条目，重新生成契约并运行 ./scripts/check.ps1。

当前仓库已启用 core.hooksPath=.githooks。新 checkout 如需相同保护，执行 `git config core.hooksPath .githooks`。钩子对暂存区检查版本一致、变更日志和相对上一提交的 minor+1，不自动修改内容。`uv run --frozen python scripts/check_version.py --staged` 可手动预检。

完成本批实现与验证后，再按用户授权提交并打对应 vX.Y.0 标签。不为每个编辑动作单独提交；提交后如有新变更，应作为下一批递增版本。不得使用 --no-verify 绕过版本检查。

回看旧版本可使用 git show 或独立 worktree，避免直接覆盖当前未提交工作；Git 标签只涵盖已跟踪源码与文档，不含忽略的运行数据、依赖与构建目录。重建旧包使用对应提交的锁文件；回退前备份用户偏好，旧版本可能不识别新增字段。
