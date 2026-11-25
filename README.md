# workflowOps

Build agents that finish reliably.

Local-first governed workflow execution. Node 22+, npm ci, npm test.

Synthetic CLI examples:

    node src/bin.mjs validate supplier
    node src/bin.mjs dag supplier
    node src/bin.mjs dry-run supplier ./local-state
    node src/bin.mjs run supplier ./local-state
    node src/bin.mjs inspect supplier ./local-state EXECUTION_ID
    node src/bin.mjs approve supplier ./local-state EXECUTION_ID operator
    node src/bin.mjs resume supplier ./local-state EXECUTION_ID

Other scenarios: documents, support, recovery. All effects are simulated. Local operator and checkpoint directory must be trusted. Never use customer data in these demos. No exactly-once guarantee. Public release deferred.
