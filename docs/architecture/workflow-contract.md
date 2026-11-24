# Workflow contract v1

Definitions contain schemaVersion: 1, id, tasks with id, handler and dependsOn. IDs are bounded ASCII identifiers. Maximum 1000 tasks. Only explicitly registered trusted functions run. Lexicographically smallest ready task executes first. Invalid graphs fail before execution. Failures block descendants, independent tasks continue. Outputs must be structured-cloneable. No durable state, timeout, sandbox or side-effect guarantees yet.
