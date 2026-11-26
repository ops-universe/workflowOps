# Scoped engineering acceptance

Implementation checkpoint: d0b724066bb847fb67989f81a0fef3eb83676d59. Post-merge CI: https://github.com/ops-universe/workflowOps/actions/runs/45558608486 (all three jobs successful). Core: 28 tests passed, zero failures/skips; root audit zero vulnerabilities; website audit at high threshold and root/project build checks passed. Real Chrome 157.0.8103.78: load, DAG, keyboard task inspection, approval refresh, timeline, mobile layout, invalid input.

| Phase | Acceptance evidence |
| --- | --- |
| 1 Foundation | CI clean installs, dependency audits, threat model, policy negative tests |
| 2 DAG | tests/workflow.test.mjs: order, invalid graph, failure propagation |
| 3 State | tests/checkpoint.test.mjs: persistence, resume, mismatched definition, interrupted state |
| 4 Reliability | tests/reliability.test.mjs: retry bounds, timeout and cancellation; recovery scenario |
| 5 Governance | tests/governance.test.mjs and tests/policy.test.mjs: permission, denial, approval scope, dry run and side-effect retry restrictions |
| 6 AI | tests/ai.test.mjs and tests/security-final.test.mjs: offline mock, output rejection, execution budget and recreated-adapter quota |
| 7 CLI/dashboard | tests/cli.test.mjs, tests/dashboard.test.mjs and browser/acceptance.mjs: actual local checkpoint inspection, timeline, keyboard and approval refresh |
| 8 Scenarios | tests/cli.test.mjs: supplier, documents, support, recovery; all synthetic |
| Security | tests/security-final.test.mjs: invalid attempt count, workflow mismatch, timeline sequence, symlink rejection and immutable quota; HTTP tests: cross-origin, mutation and path rejection |

All eight scoped functional phases and final structural security hardening merged and verified at the implementation checkpoint above. Documentation-only acceptance PR requires its own CI and merge verification. No new implementation assigned.

## Boundaries
Trusted local host, operator and checkpoint root/ancestors. No authenticated storage or protection against hostile local writers; no signed identities, tenant isolation or sandbox. Legacy governed checkpoints without configuration binding are rejected on resume. AI counts attempts per handler per execution; no token, monetary or global budget guarantee. Standalone adapter limits are process-local. No live providers, real external effects, production deployment, exactly-once or full power-loss durability guarantee. Browser is read-only; execution/approval through trusted CLI. Cooperative cancellation cannot hard-kill handlers. Developer Preview and public release deferred.

## Wave 1 re-verification — 2026-11-26

Audited main a87dbc7ee022159ead57d9a66bb7844159848663. The documented implementation checkpoint is an ancestor; intervening changes are documentation, static website infrastructure and the verified browser-startup fix; no workflow runtime or core test changes. Actual push-triggered [Core CI 45664530378](https://github.com/ops-universe/workflowOps/actions/runs/45664530378) passed 28/28 core tests, zero failures/skips. Real Chromium acceptance passed: DAG, keyboard inspection, approval refresh, timeline, mobile and invalid input. Bounded retries, uncertain timeout/cancellation, checkpoint tamper/symlink rejection and durable AI quota regressions passed. Root and website builds and configured dependency audits passed; inspected audit logs reported zero vulnerabilities. [Pages 45664531125](https://github.com/ops-universe/workflowOps/actions/runs/45664531125) passed build, deployment and three public documentation-route checks. Static documentation hosting is distinct from deployment of the local product runtime. All previously documented scope and security limitations remain in force. The historical implementation SHA remains the acceptance anchor. No product release or Developer Preview authorized; no new functional implementation assigned. Revalidate later commits through normal gates.
