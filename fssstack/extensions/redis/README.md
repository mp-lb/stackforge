# Redis extension

How to add Redis.

## Dependencies

Install `ioredis` in the package or app that owns Redis access:

```bash
pnpm --filter=<backend-or-shared-package> add ioredis
```

## Local development

Merge this into `zap.yaml`:

```yaml
ports: [REDIS_PORT]
docker:
  redis:
    image: redis:7-alpine
    ports:
      - "${REDIS_PORT}:6379"
```

Add `REDIS_URL` to `.env.local` as `REDIS_URL=redis://localhost:${REDIS_PORT}`. The port will be assigned automatically by zapper.

## Code

Create a small connection helper:

```typescript
import Redis from "ioredis";

let redis: Redis | null = null;

export const getRedis = (url: string): Redis => {
  if (redis) return redis;

  redis = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  return redis;
};

export const closeRedis = async () => {
  if (!redis) return;
  await redis.quit();
  redis = null;
};
```

Use the helper from app config:

```typescript
import { env } from "./config";
import { getRedis } from "./redis";

const redis = getRedis(env.REDIS_URL);
```

## Install agent context

After applying and validating this capability, install its context payloads. For existing files, compare and merge instead of overwriting project-specific instructions. These commands are for a first install from the target repository root:

```sh
set -e
mkdir -p context
fm read extensions/redis/context/redis.md --store mp-lb/fssstack > context/redis.md
grep -qxF '@redis.md' context/index.md || printf '\n@redis.md\n' >> context/index.md
```

Adapt the blocks to the installed package paths, services, tasks and configuration. Remove assumptions that do not apply. Then run `zap task context-build` and commit the source blocks and all three generated agent files.
