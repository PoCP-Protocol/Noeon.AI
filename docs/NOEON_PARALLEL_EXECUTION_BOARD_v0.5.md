# Noeon 并行执行任务板 v0.5

状态: 执行中
日期: 2026-06-07
目标: 在不冲突前提下并行推进 Noeon 通用语言化（Core + Cognitive + Governance + Tooling）

最新进展:

1. 2026-06-07 已完成 Stream A Day1 上午: DEF AST + validator 签名检查
2. 已新增 conformance 用例并保持全绿
3. 2026-06-07 已完成 Stream B Day1 下午: runtime.compute.* 元规则命中能力
4. 2026-06-07 已完成 Stream C Day1 晚上: conformance 分级文档 + 错误码草案 + 质量脚本
5. 2026-06-07 已完成 Stream A Day2 上午: IF 最小语义（parser/validator/runtime/conformance）
6. 2026-06-07 已完成 Stream B Day2 下午: compute error 触发 hardened 联动 + policy 违规并入
7. 2026-06-07 已完成 Stream C Day2: CI 质量门禁工作流落地
8. 2026-06-07 已完成 Stream B Day3: runtime.compute.summary.callFailureRate 治理门禁
9. 2026-06-07 已完成 Stream C Day3: CI 升级 Node 18/20 矩阵并上传 conformance 产物
10. 2026-06-07 已完成 Stream A Day3: DEF 可执行态（函数调用栈最小实现）
11. 2026-06-07 已完成 Stream C Day3: conformance 摘要脚本与 CI 自动打印
12. 2026-06-07 已完成 Stream B Day4: compute summary 指标门禁扩展（callFailed, diagnosticCount）
13. 2026-06-07 已完成 Stream C Day4: baseline 自动初始化与 CI 无噪声摘要

## 1. 已完成基线

1. CK-1 已落地: LET/COMPUTE/ASSERT/RETURN 解析、校验、编译透传
2. CK-2 已落地: CALL 解析、校验、simulate compute receipts、audit 写入
3. 治理层已支持: META_PROFILE、继承、冲突 last-win、循环告警
4. conformance 当前全绿

## 2. 并行分工（文件级隔离）

### Stream A: Core 语言能力（函数、控制流、模块）

负责人: Agent-Core

边界文件:

1. src/parser.js
2. src/validator.js
3. src/compiler.js
4. src/runtime/compute-kernel.js
5. tests/conformance/run.js
6. docs/NOEON_FUNCTIONS_v0.5.md
7. docs/NOEON_CONTROL_FLOW_v0.5.md
8. docs/NOEON_MODULES_v0.5.md

本周任务:

1. 增加 DEF 指令与函数签名 AST (已完成)
2. 增加 IF 指令最小语义
3. compute-kernel 增加函数调用栈最小实现
4. conformance 增加函数/控制流正反例

验收:

1. conformance 新增 8+ 用例
2. 函数调用与 IF 语义可执行
3. 现有测试不回归

### Stream B: Cognitive + Governance 并轨（CK-3）

负责人: Agent-CogGov

边界文件:

1. src/runtime/meta-rule-engine.js
2. src/runtime/simulator.js
3. src/runtime/compute-kernel.js
4. src/runtime/audit-logger.js
5. tests/conformance/run.js
6. docs/NOEON_COMPUTE_KERNEL_v0.1_DRAFT.md

本周任务:

1. 开放治理规则可约束 runtime.compute.env
2. 开放治理规则可约束 runtime.compute.receipts
3. simulate 增加 compute 违规触发 hardened 的联动
4. audit 增加 compute 违规链路记录

验收:

1. 新增 6+ 条 CK-3 conformance
2. 至少 1 条 META_RANGE 命中 compute env
3. 至少 1 条 META_REQUIRE 命中 compute receipt
4. Day1 子目标已达成: META_RANGE/META_REQUIRE 命中 runtime.compute.*

### Stream C: Tooling + Quality（30/60/90 基线）

负责人: Agent-Tooling

边界文件:

1. package.json
2. docs/CONFORMANCE_LEVELS.md
3. docs/NOEON_ERROR_CODES_v0.5.md
4. scripts/quality-metrics.js
5. .github/workflows/quality-gate.yml
6. README.md

本周任务:

1. 补充 conformance 分级文档 CL-1..CL-4
2. 建立错误码草案与命名约定
3. 增加质量统计脚本（用例数、通过率）
4. 搭建 CI 质量门禁雏形

验收:

1. 本地可运行质量统计脚本
2. CI 文件可解析并跑 conformance
3. README 增加开发工作流入口
4. Day1 子目标已达成: metrics:record 输出 100% 通过率

## 3. 冲突规避协议

1. Stream A 不改 src/runtime/meta-rule-engine.js
2. Stream B 不改 parser 的通用语法区块（除 compute/gov 接口）
3. Stream C 不改 src 业务逻辑文件
4. tests/conformance/run.js 采用区段占位约定:
   1. Core 用例区段
   2. CogGov 用例区段
   3. Tooling 仅新增脚本，不改逻辑断言
5. 合并顺序:
   1. Stream A 先合
   2. Stream B 再合
   3. Stream C 最后合

## 4. 48 小时执行清单

1. Day 1 上午: Stream A 交付 DEF AST + validator 签名检查
2. Day 1 下午: Stream B 交付 compute-env 元规则路径支持
3. Day 1 晚上: Stream C 交付 CONFORMANCE_LEVELS.md v0.1
4. Day 2 上午: Stream A 交付 IF 最小执行语义
5. Day 2 下午: Stream B 交付 hardened 联动与审计记录
6. Day 2 晚上: 全量 conformance 回归与变更整合

执行结果:

1. conformance: 32/32 通过
2. metrics:record: HEALTHY, passRate=100.00%

## 5. 每日门禁

1. npm run conformance 必须全绿
2. 新增能力必须有至少 1 正例 + 1 反例测试
3. 不允许修改不属于本 stream 的边界文件
4. 变更说明必须包含影响层级: Core / Cognitive / Governance / Tooling
