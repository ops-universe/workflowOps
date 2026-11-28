# Changelog

## Unreleased
- Foundation and deterministic DAG (PRs #1–2).
- Durable checkpoints and reliability (PRs #3–4).
- Governance and offline AI budgets (PRs #5–6).
- CLI and four synthetic enterprise scenarios (PR #7).
- Dashboard and durable timeline with real Chromium acceptance (PR #8).
- Checkpoint structural validation, bounded no-follow reads, governance configuration binding and durable AI attempt quotas (PR #9).
- Scoped engineering acceptance evidence reconciled; release deferred.

Implementation checkpoint: d0b724066bb847fb67989f81a0fef3eb83676d59. Post-merge CI: https://github.com/ops-universe/workflowOps/actions/runs/45558608486 (all three jobs successful). Core: 28 tests passed, zero failures/skips; root audit zero vulnerabilities; website audit at high threshold and root/project build checks passed. Real Chrome 157.0.8103.78: load, DAG, keyboard task inspection, approval refresh, timeline, mobile layout, invalid input.

Wave 1 latest exact-main re-verification (2026-11-27): `a87dbc7ee022159ead57d9a66bb7844159848663`; [Core CI 45835391757](https://github.com/ops-universe/workflowOps/actions/runs/45835391757), push, all three jobs successful: test 139962790239 (28 passed, 0 failed/skipped), website-build 139962790199 (root/project base builds), browser-acceptance 139962789770 (Chrome 157.0.8103.78, full interaction suite). Root and website audits reported zero vulnerabilities. Earlier exact-main push CI 45664530378 and Pages 45664531125 also passed; Pages smoke verified /workflowOps/, /features/ and /documentation/ under the project base. Static docs hosting is not runtime deployment. No runtime/core-test changes since historical implementation checkpoint. Detailed branch protection API returned HTTP 403; main reports protected:false and rulesets list empty; supervisor must confirm applicable requirements before any merge. No release or new deployment authorized.
