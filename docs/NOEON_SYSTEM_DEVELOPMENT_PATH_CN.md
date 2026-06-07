# Noeon 系统开发路径（升级版）

## 目标

用 Noeon 把系统开发从“流程约定”变成“可验证协议”：

1. 需求与设计有链路追踪
2. 实现与测试有证据绑定
3. 发布与运行有治理门禁

## 推荐起点

1. 合约模板: examples/noeon_system_development.ael
2. 一键门禁: npm run gate:strict

说明:

该模板默认内置的是 `noeon-hardened-key` 对应签名。
如果你使用不同签名密钥，需要重新生成 ROUTE 的 signature 字段。
模板默认不声明 META_PROFILE，避免外部策略文件缺失时产生 profile 未注册告警。
当你有正式策略仓库时，再加入 META_PROFILE 并配合 NOEON_META_POLICY_FILE 使用。

## 开发步骤

1. 定义系统任务
- 修改 INTENT、GOAL、CONTEXT
- 确认 RISK 与 VERIFY 参数

2. 绑定工程流水线
- 用 CIRCUIT 定义开发阶段图
- 用 ROUTE 映射每阶段执行插件

3. 强化治理规则
- 使用 META_PROFILE + META_REQUIRE/META_RANGE/META_RELATION
- 把关键治理约束写入合约而不是口头约定

4. 验证与审计
- 运行 parse/compile/simulate
- 检查 artifacts 中 report/cycle/audit

## 最小执行命令

```bash
npm run parse -- examples/noeon_system_development.ael
npm run compile -- examples/noeon_system_development.ael artifacts/noeon_system_development.json
npm run simulate -- examples/noeon_system_development.ael examples/feedback_highrisk.json artifacts/noeon_system_cycle.json artifacts/noeon_system_state.json artifacts/noeon_system_report.json artifacts/noeon_system_audit.jsonl
```

## 何时用 extreme 模板

满足任一条件可切到极端模板：

1. 高价值结算
2. 对抗性外部环境
3. 强监管/强审计场景

参考: examples/noeon_hayek_bitcion_ai_extreme.ael
