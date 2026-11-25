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
