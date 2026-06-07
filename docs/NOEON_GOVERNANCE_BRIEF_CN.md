# Noeon 治理说明包（Hayek + Bitcion + AI）

## 1. 我们在做什么

Noeon 不是通用编程语言，而是面向分布式智能经济的协议语言与执行系统。

核心目标：

1. 让智能体自由竞争（Open Competition）
2. 让协作过程可验证（Verifiable Cooperation）
3. 让价值分配自动结算（Automatic Settlement）

这对应一句话：

Let intelligence compete freely, let value settle automatically.

## 2. 三层治理结构

1. 语言治理层
- 用合约定义任务、预算、验证、奖惩、风险、学习、自校验。
- 关键语句：VERIFY / ON_SUCCESS / ON_SLASH / RISK / SELF_CHECK / CRITIC。

2. 运行治理层
- 合约必须可 parse、compile、simulate、train。
- 运行时输出步骤回执（receipt）、失败分类、审计日志（JSONL）。

3. 安全治理层
- 插件白名单与动作类型白名单。
- 插件版本锁（version）和签名校验（signature）。
- 高风险场景使用更高 quorum、更长 challenge、更高惩罚强度。

## 3. 三套网络模板（分级治理）

### A. 基础版（可用起步）
- 合约: examples/noeon_hayek_bitcion_ai.ael
- 适用: 常规业务验证与快速迭代
- 特征: 平衡验证、自动模式、标准奖惩

### B. v0.3 对齐增强版（建议默认）
- 合约: examples/noeon_hayek_bitcion_ai_v03.ael
- 适用: 团队协作、治理审计、对外演示
- 特征: 增加 FALSIFY 与 CHAIN（反例与推理可追踪）

### C. 极端高风险版（严防对抗）
- 合约: examples/noeon_hayek_bitcion_ai_extreme.ael
- 适用: 高价值结算、强对抗环境、审计优先
- 特征: critical 风险、4/5 quorum、强惩罚、严格签名/版本策略

## 4. 当前验证状态（已完成）

已通过：

1. parse
2. compile
3. simulate
4. conformance

关键产物示例：

- v0.3 报告: artifacts/noeon_hayek_v03_report.json
- extreme 报告: artifacts/noeon_hayek_extreme_report.json
- extreme 周期回执: artifacts/noeon_hayek_extreme_cycle.json
- extreme 审计日志: artifacts/noeon_hayek_extreme_audit.jsonl

## 5. 严格治理运行命令（可直接复制）

先启用严格完整性策略：

```powershell
$env:NOEON_REQUIRE_PLUGIN_VERSION='true'
$env:NOEON_REQUIRE_PLUGIN_SIGNATURE='true'
$env:NOEON_PLUGIN_SIGNING_KEY='noeon-hardened-key'
```

再执行极端模板验证：

```powershell
npm run parse -- examples/noeon_hayek_bitcion_ai_extreme.ael
npm run compile -- examples/noeon_hayek_bitcion_ai_extreme.ael artifacts/noeon_hayek_bitcion_ai_extreme.json
npm run simulate -- examples/noeon_hayek_bitcion_ai_extreme.ael examples/feedback_highrisk.json artifacts/noeon_hayek_extreme_cycle.json artifacts/noeon_hayek_extreme_state.json artifacts/noeon_hayek_extreme_report.json artifacts/noeon_hayek_extreme_audit.jsonl
npm run conformance
```

## 6. 对团队与投资人的一句话解释

Noeon 把 AI 协作从“平台规则”升级为“协议规则”：

1. 竞争是开放的
2. 协作是可证的
3. 价值分配是自动的
4. 高风险行为是可追责且可惩罚的

## 7. 下一阶段建议

1. 把签名密钥管理从固定环境变量升级到密钥托管（HSM/KMS）。
2. 把 http_call mocked 执行器替换为真实可验证传输通道。
3. 把 extreme 模板加入 CI Gate（每次变更自动跑 strict simulate + conformance）。
