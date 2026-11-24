# Architecture

Action name → trusted policy configuration → pure allow/review/deny decision. Caller-supplied risk is ignored. The demo never executes tools, verifies identity or stores approval receipts. Real deployments need tenant-scoped policy, authentication, execution-boundary enforcement, policy versioning and auditable approval verification. See ADR 001.
