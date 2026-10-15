---
doc_id: TPL-ADR
title: 架构决策模板
kind: template
status: template
updated: 2026-10-15
tags: [template, adr]
---

# 架构决策模板

复制到 docs/adr/NNNN-topic.md。换成 ADR-NNNN、真实标题、kind: decision、status、date/updated、implementation 和真实 tags；如替代旧决定添加 supersedes，更新 ADR 索引与当前规范。

## 背景与约束

说明需要解决的真实问题、用户目标、已有条件与触发原因，不为普通局部实现写 ADR。

## 决定

清楚说明采用方案、作用范围、契约/依赖/数据影响，以及决定是否已实现。

## 候选方案

用少量明确标准比较可行候选；给出证据和来源，区分实测与判断。

## 后果与迁移

收益、代价、限制、需要修改的模块/文档、迁移和回退条件。说明源码、桌面、Docker 的影响。

## 验证与重新评估

说明验收标准、实际证据/未验证点、何种新条件触发重新设计；被替代后链接新 ADR，并将 status 改 superseded。
