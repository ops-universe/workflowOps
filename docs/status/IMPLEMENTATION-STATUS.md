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

All eight scoped functional phases and final structural security hardening merged and verified at the implementation checkpoint above. Historical acceptance PR #10 and Chromium startup correction PR #11 are merged; this Wave 1 evidence PR requires fresh head checks and supervisor merge verification. No new implementation assigned.

## Boundaries
Trusted local host, operator and checkpoint root/ancestors. No authenticated storage or protection against hostile local writers; no signed identities, tenant isolation or sandbox. Legacy governed checkpoints without configuration binding are rejected on resume. AI counts attempts per handler per execution; no token, monetary or global budget guarantee. Standalone adapter limits are process-local. No live providers, real external effects, production deployment, exactly-once or full power-loss durability guarantee. Browser is read-only; execution/approval through trusted CLI. Cooperative cancellation cannot hard-kill handlers. Developer Preview and public release deferred.

## Wave 1 re-verification — 2026-11-26

Audited main a87dbc7ee022159ead57d9a66bb7844159848663. The documented implementation checkpoint is an ancestor; intervening changes are documentation, static website infrastructure and the verified browser-startup fix; no workflow runtime or core test changes. Actual push-triggered [Core CI 45664530378](https://github.com/ops-universe/workflowOps/actions/runs/45664530378) passed 28/28 core tests, zero failures/skips. Real Chromium acceptance passed: DAG, keyboard inspection, approval refresh, timeline, mobile and invalid input. Bounded retries, uncertain timeout/cancellation, structural checkpoint corruption/symlink rejection and durable AI quota regressions passed. Core installation/test and website builds and configured dependency audits passed; inspected audit logs reported zero vulnerabilities. [Pages 45664531125](https://github.com/ops-universe/workflowOps/actions/runs/45664531125) passed build, deployment and three public documentation-route checks. Static documentation hosting is distinct from deployment of the local product runtime. All previously documented scope and security limitations remain in force. The historical implementation SHA remains the acceptance anchor. No product release or Developer Preview authorized; no new functional implementation assigned. Revalidate later commits through normal gates.

Wave 1 latest exact-main re-verification (2026-11-27): `a87dbc7ee022159ead57d9a66bb7844159848663`; [Core CI 45835391757](https://github.com/ops-universe/workflowOps/actions/runs/45835391757), push, all three jobs successful: test 139962790239 (28 passed, 0 failed/skipped), website-build 139962790199 (root/project base builds), browser-acceptance 139962789770 (Chrome 157.0.8103.78, full interaction suite). Root and website audits reported zero vulnerabilities. Earlier exact-main push CI 45664530378 and Pages 45664531125 also passed; Pages smoke verified /workflowOps/, /features/ and /documentation/ under the project base. Static docs hosting is not runtime deployment. No runtime/core-test changes since historical implementation checkpoint. Detailed branch protection API returned HTTP 403; main reports protected:false and rulesets list empty; supervisor must confirm applicable requirements before any merge. No release or new deployment authorized.
