---
doc_id: TPL-ISSUE
title: 当前问题条目模板
kind: template
status: template
updated: 2026-10-15
tags: [template, issue]
---

# 当前问题条目模板

将下面条目复制到 docs/issues/open.md，不另建已关闭问题文档。替换 ID 与锚点并更新清单数量；模板的 front matter 不复制到清单正文。

~~~markdown
<a id="iss-yyyymmdd-nn"></a>
## ISS-YYYYMMDD-NN：具体症状

- 严重性：P0 / P1 / P2 / P3。
- 状态：待调查 / 已确认 / 修复中 / 待验证。
- 发现日期、受影响版本/运行形态/系统：填写。
- feature_id / tool_id / operation_id：填写相关值。
- 影响范围：用户损失、阻断情况、复现频率。

### 复现与事实

前置条件、最小输入、具体操作、预期与实际结果、安全的证据位置。

### 当前处理

已确认原因与尚未确认的假设分开；说明可用临时绕过、处理进展、下一项验证及实际阻碍。未做功能转入路线图。

### 关闭所需证据

列出原条件下的验证与必要回归。完成后从当前清单删除整个条目，移除当前说明里的旧限制/绕过，将简短修复结论和验证摘要写入变更日志/工作记录。
~~~
