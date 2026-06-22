# Agents Framework

Use this standard for product agents: chat agents, workflow agents, scheduled
agents, voice agents, eval agents, and any other LLM loop with tools or durable
product behavior.

## Rule

Use `@mp-lb/agents-framework` for agent definitions and
`@mp-lb/agents-admin` for admin/debug UI.

Code owns the agent contract:

- agent id, name, and description
- Langfuse prompt names and required variables
- dynamic context serializers
- registered tools and input schemas
- inspectable conditions
- runtime harness adapters

Langfuse owns prompt text and prompt versions.

Do not store agent prompt bodies in the application repo by default. Do not add
runtime fallback prompt bodies. If a prompt is missing or invalid, boot should
fail before the app serves agent traffic.

## Packages

Install the core package wherever the backend or worker defines and runs agents:

```sh
pnpm add @mp-lb/agents-framework
```

Install the admin package in apps that render an agent admin/debug screen:

```sh
pnpm add @mp-lb/agents-admin
```

Use `@mp-lb/tools-evals` for local eval artifacts and eval runners.

## Langfuse Setup

Create one Langfuse project for the app. Do not duplicate prompt sets per app
environment.

Configure backend/worker secrets:

```txt
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASE_URL=
```

Use Langfuse prompt labels to select prompt versions:

- `production` for production
- `staging` for preview/staging
- `latest` for local/development/test

The app passes its runtime environment into the registry. The library derives
the prompt version from that environment unless the app explicitly overrides it.
Use trace/log metadata, not separate prompt projects, to filter by environment.

Prompt names must be stable and app-scoped:

```txt
instantagent/concierge-system
instantagent/principal-system
assistant/support-chat-system
```

## Definition

Define each product agent once and reuse it across harnesses.

```ts
import {
  defineAgent,
  defineAgentTool,
  prompt,
} from "@mp-lb/agents-framework";
import { z } from "zod";

const searchRecords = defineAgentTool({
  name: "record_search",
  description: "Search records visible to this user.",
  inputSchema: z.object({
    query: z.string().min(1),
  }),
});

export const supportAgent = defineAgent({
  id: "support",
  name: "Support",
  instructions: [
    prompt("assistant/support-system", {
      variables: ["PRODUCT_NAME", "userRole"],
    }),
  ],
  input: prompt("assistant/support-input", {
    variables: ["userMessage"],
  }),
  tools: [searchRecords],
});
```

Tools own application behavior. Prompts may explain when to call a tool, but
tools must still validate inputs, enforce auth, and protect destructive,
financial, legal, or compliance-sensitive actions.

## Boot

Create and boot the runtime before serving agent traffic.

```ts
import {
  createAgentRuntime,
  langfuseBackend,
  openAICompatibleLlm,
} from "@mp-lb/agents-framework";

export const agents = createAgentRuntime({
  app: "assistant",
  environment: appEnv,
  backend: langfuseBackend({
    llm: openAICompatibleLlm({
      apiKey: env.OPENROUTER_API_KEY,
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openai/gpt-5.5",
    }),
  }),
  agents: [supportAgent],
});

await agents.boot();
```

Boot fetches all declared Langfuse prompts once and caches them in memory.
Runtime rendering must not fetch prompts from Langfuse.

Boot must fail when:

- a declared prompt does not exist
- the selected prompt version/label does not exist
- prompt variables in Langfuse do not match variables declared in code
- Langfuse credentials are missing in an environment that runs agents

## Runtime

A harness is the loop that uses an agent definition: chat endpoint, scheduled
job, workflow runner, realtime voice session, or eval runner.

The consuming app owns:

- request/auth context
- model provider selection
- streaming behavior
- persistence
- retries and cancellation
- product-specific UI updates

The harness runs the registered agent. Pass one context object for instruction
variables, input variables, dynamic context, trace metadata, and tool handlers:

```ts
const result = await agents.run("support", {
  context: {
    PRODUCT_NAME,
    userRole,
    userMessage,
  },
});
```

If no input prompt is defined, callers may pass direct input:

```ts
await agents.run("support", {
  context: { PRODUCT_NAME, userRole },
  input: "Can you check this lease?",
});
```

Runtime rendering is strict. Missing variables are errors. Inspect rendering may
preserve missing variables as placeholders for admin/debug screens.

## Admin

Expose the registry through an app-owned admin route or tRPC router.

```ts
import { createAgentAdminService } from "@mp-lb/agents-framework";

export const agentAdmin = createAgentAdminService(agents);
```

Admin screens should show:

- registered agents
- boot diagnostics
- requested prompt selector and resolved Langfuse versions
- prompt variables and missing/drifted variables
- rendered inspect output for given inputs
- tools and input schemas
- included/excluded prompt parts, dynamic context, and tools

Use `@mp-lb/agents-admin` hooks when the app wants the shared React client
helpers. Apps may still render their own UI over the same DTOs.

## Logs And Context

Agent logs should use the standard event shape in
[event-schema.md](./event-schema.md).

Important agent events include:

- user messages
- assistant messages
- tool calls
- tool results
- tool errors
- approvals and confirmations
- handoffs between agents or harnesses

Each agent should have an explicit context serializer. Do not blindly dump full
history into model context. Preserve the user's current task, relevant facts,
tool results, unresolved questions, and safety/confirmation state. Omit or
summarize irrelevant old turns, oversized payloads, stack traces, and internal
implementation details.

Add trace/log metadata for:

- app
- environment
- agent id
- prompt names
- resolved prompt versions
- model/provider

## Evals

Add local eval coverage for meaningful agent behavior changes, especially:

- new tools
- prompt changes
- tool selection behavior
- destructive action confirmation
- multi-turn memory
- handoffs
- voice/realtime behavior that delegates to agent tools

Eval metadata should reference the agent id, prompt names, resolved prompt
versions, tools, and harness.
