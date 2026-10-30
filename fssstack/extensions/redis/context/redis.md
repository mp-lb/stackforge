## Redis

This project uses Redis. Reuse the existing connection helper and configured `REDIS_URL`; use Zapper's local service and port rather than a hardcoded endpoint. Initialize connections lazily and close them in shutdown/test cleanup.

Preserve project/environment namespaces and the distinction between application clients and worker/queue connections. Do not reset a shared Redis instance to clean up one project's state.

Setup and updates: `fm read extensions/redis/README.md --store mp-lb/fssstack`.
