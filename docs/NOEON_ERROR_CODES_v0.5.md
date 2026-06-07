# Noeon Error Codes v0.5

状态: Draft
版本: v0.5

## 1. 命名规则

格式:

`NOEON-<DOMAIN>-<SEVERITY>-<ID>`

域 (DOMAIN):

1. `PARSE`: 语法与词法
2. `VALIDATE`: 语义与约束
3. `COMPUTE`: 计算表达式与符号
4. `RUNTIME`: 执行期
5. `PLUGIN`: 插件与策略
6. `META`: 元规则与治理

级别 (SEVERITY):

1. `E`: Error（阻断）
2. `W`: Warning（告警）
3. `I`: Info（信息）

## 2. 标准字段

每个错误码应包含:

1. Code
2. Summary
3. Trigger
4. Remediation

推荐输出结构:

```json
{
  "code": "NOEON-VALIDATE-E-0001",
  "severity": "error",
  "summary": "missing required field",
  "trigger": "validateAel required checks",
  "remediation": "fill required field and rerun validation"
}
```

## 3. 起始错误码清单（v0.5）

### PARSE

1. `NOEON-PARSE-E-0001`: missing statement value
2. `NOEON-PARSE-E-0002`: unknown keyword
3. `NOEON-PARSE-E-0003`: invalid quoted string
4. `NOEON-PARSE-E-0004`: invalid key=value token
5. `NOEON-PARSE-E-0005`: invalid VERIFY format

### VALIDATE

1. `NOEON-VALIDATE-E-0001`: missing required field
2. `NOEON-VALIDATE-E-0002`: invalid quorum ratio
3. `NOEON-VALIDATE-E-0003`: invalid verify mode
4. `NOEON-VALIDATE-E-0004`: ON_SUCCESS sum != 100
5. `NOEON-VALIDATE-E-0005`: invalid cognition/self_check/infer/critic field
6. `NOEON-VALIDATE-W-0006`: high risk with short challenge
7. `NOEON-VALIDATE-W-0007`: flow does not start from CREATED

### COMPUTE

1. `NOEON-COMPUTE-E-0001`: invalid token in expression
2. `NOEON-COMPUTE-E-0002`: undefined compute symbol
3. `NOEON-COMPUTE-E-0003`: non-boolean ASSERT expression
4. `NOEON-COMPUTE-E-0004`: duplicate compute symbol
5. `NOEON-COMPUTE-E-0005`: invalid CALL input expression
6. `NOEON-COMPUTE-E-0006`: DEF function redefined
7. `NOEON-COMPUTE-E-0007`: DEF duplicate parameter

### RUNTIME

1. `NOEON-RUNTIME-E-0001`: plan execution failure
2. `NOEON-RUNTIME-E-0002`: step timeout or max steps reached
3. `NOEON-RUNTIME-W-0003`: degraded execution profile applied
4. `NOEON-RUNTIME-I-0004`: cycle completed with diagnostics

### PLUGIN

1. `NOEON-PLUGIN-E-0001`: plugin not found
2. `NOEON-PLUGIN-E-0002`: plugin version mismatch
3. `NOEON-PLUGIN-E-0003`: plugin signature missing/invalid
4. `NOEON-PLUGIN-E-0004`: plugin blocked by policy

### META

1. `NOEON-META-E-0001`: meta require failed
2. `NOEON-META-E-0002`: meta range failed
3. `NOEON-META-E-0003`: meta enum failed
4. `NOEON-META-E-0004`: meta relation failed
5. `NOEON-META-W-0005`: meta conflict resolved by last-win
6. `NOEON-META-W-0006`: external profile inheritance cycle

共计: 31 条起始错误码。

## 4. 增量规则

新增错误码时要求:

1. 同域内 ID 递增，不复用
2. 必须给出可执行 remediation
3. conformance 至少新增 1 条覆盖（正例或反例）
4. README 或相关文档同步更新
