## Background jobs

This project uses BullMQ with Redis. Keep producers and workers aligned on queue names, namespace, connection settings and job schemas. Reuse existing queue/worker modules and initialize connections lazily.

Manage workers through their configured Zap services. Close workers and Redis connections during shutdown and tests. Preserve the configured retry/idempotency behavior. Bull Board is local-only unless the project explicitly configures authenticated production access.

Setup and updates: `fm read extensions/bull/README.md --store mp-lb/fssstack`; Redis is a prerequisite.
