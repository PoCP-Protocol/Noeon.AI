# Noeon Conformance Levels

状态: Draft v0.1
范围: CL-1 到 CL-4

## 目的

定义 Noeon 当前实现的分级合规标准，用于开发、测试、上线门禁三类场景。

## CL-1 语法合规

能力:

1. AEL 指令可被 parser 正确解析
2. 必填字段与基础结构完整
3. 编译产物基础结构存在

建议检查:

1. parser 能处理标准示例
2. compile 输出包含 spec/contract/runtime

典型命令:

```bash
npm run parse -- examples/noeon_contract.ael
npm run compile -- examples/noeon_contract.ael artifacts/noeon_contract.json
```

## CL-2 语义合规

能力:

1. validator 可完成核心约束检查
2. cognition 指令可校验并稳定输出
3. 风险、仲裁、陪审团等规则可用

建议检查:

1. validateAel 返回 valid/errors/warnings 结构稳定
2. native cognition 指令测试通过

典型命令:

```bash
npm run conformance
```

## CL-3 治理合规

能力:

1. META_REQUIRE/RANGE/ENUM/RELATION 生效
2. META_PROFILE 支持 advisory/enforce
3. 继承与冲突 last-win 可确定性执行
4. 外部 policy 文件可加载并作用到运行时

建议检查:

1. 违规可触发 hardened
2. advisory 仅告警，不阻断
3. 外部 profile 继承链可解析，循环可告警

典型命令:

```bash
npm run conformance
npm run gate:strict
```

## CL-4 计算合规

能力:

1. 计算指令 LET/COMPUTE/ASSERT/RETURN/CALL 可解析与执行
2. DEF 签名校验可用（名称/参数约束）
3. compute receipts 可生成并进入审计
4. meta rule 可命中 runtime.compute.env 与 runtime.compute.receipts

建议检查:

1. compute 静态校验通过
2. compute receipts 在 simulate 中可见
3. compute 相关 meta rule 能命中且行为可验证

典型命令:

```bash
npm run conformance
npm run simulate -- examples/noeon_superbrain.ael examples/feedback_batch.json artifacts/noeon_cycle.json artifacts/noeon_state.json artifacts/noeon_report.json artifacts/noeon_audit.jsonl
```

## 当前仓库映射

1. CL-1: 已覆盖
2. CL-2: 已覆盖
3. CL-3: 已覆盖
4. CL-4: 已覆盖（含 DEF 与 compute-meta 命中）

## 发布门禁建议

1. 开发分支: CL-1 + CL-2 必须通过
2. 预发布分支: CL-1..CL-3 必须通过
3. 生产分支: CL-1..CL-4 + strict gate 必须通过

建议门禁命令:

```bash
npm run conformance && npm run gate:strict
```
