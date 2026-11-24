# ADR 001 — Trusted risk classification

Accepted for starter: classify risk through trusted configuration rather than action payloads. This prevents an untrusted caller downgrading high-risk actions. Unknown and inherited keys are denied. Alternative: caller-supplied risk is simpler but creates a trust-boundary flaw. This remains a pure demonstration, not an execution gateway.
