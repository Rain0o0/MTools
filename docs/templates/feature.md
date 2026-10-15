---
doc_id: TPL-FEATURE
title: 功能文档模板
kind: template
status: template
updated: 2026-10-15
tags: [template, feature]
---

# 功能文档模板

复制到 docs/features/{feature_id}/overview.md。替换 front matter 为新 doc_id、kind: feature、status: active/draft，添加 feature_id、tool_id（如有）、implementation、updated 与真实 tags；删除本段提示和不适用空节。

## 功能名称与当前状态

- 稳定 feature_id、tool_id、工具版本/契约版本：填写实际值。
- implementation：planned / in_progress / implemented / deprecated。
- 一句话用途、适用对象、当前交付边界：区分设计与已经验证的行为。

## 用户目标与验收案例

用具体输入、操作和预期输出描述目标；列成功、错误和必要边界。涉及性能时注明规模、环境与目标。

## 支持形态与依赖

| 形态 | 支持情况 | 验证环境/日期 | 限制与替代 |
| --- | --- | --- | --- |
| 源码浏览器 | 填写 | 填写 | 填写 |
| Windows 桌面 | 填写 | 填写 | 填写 |
| Docker 浏览器 | 填写 | 填写 | 填写 |

列明所需能力、第三方程序/资源、版本与许可、联网/费用/敏感数据去向、缺依赖表现。

## 当前行为与规则

说明流程、参数、默认值、单位、格式、大小/数量限制、编码、排序、输出位置、保留期和副作用。实现后清除不再适用的旧方案。

## 接口与模块

列出清单、公开操作、输入输出 schema、错误码、取消/超时/重试、文件引用、相关模块路径和契约来源。大接口另拆 interfaces.md 并链接，不复制生成 API 全文。

## 复用与组合

说明复用的共享能力、公开工具依赖、兼容范围、编排位置和失败处理；说明私有边界，避免其他工具误用内部函数。

## 数据与安全

数据归属、路径服务、权限、配置/密钥、迁移、清理、备份恢复，按实际需要填写。

## 当前限制与问题入口

产品固有限制写在此处；已确认未解决缺陷仅链接 docs/issues/open.md 的稳定锚点，不复制问题正文。修复验证后移除失效链接/限制。

## 相关文档与验证

链接 usage.md、相关 ADR、关键验证方法/证据和最近相关工作记录；正文保留当前事实，历史细节从日期记录查询。
