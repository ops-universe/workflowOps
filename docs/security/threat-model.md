# Starter threat model

Assets: trusted policy configuration, future credentials and action targets. Trust boundary: incoming action names are untrusted; policy must come from an authorized server-side source. Threats: risk downgrade, inherited property lookup, unknown action, missing config and future tool misuse. Tests cover the first four categories and missing policy. No external side effects are implemented. Authentication, tenant isolation, signed approvals, durable audit and revocation remain production requirements.
