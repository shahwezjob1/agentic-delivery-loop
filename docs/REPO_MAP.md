# Root Repository Map

## 1. Scope

This map inventories code, configuration, scripts, and documentation owned by the repository root or shared root packages. It intentionally does not inventory internal files of the five application modules. For those files, use each module's `docs/REPO_MAP.md`.

## 2. Planned root tree

```text
agentic-delivery-loop/
├── apps/
│   ├── domain-api-worker/
│   │   └── docs/{ARCHITECTURE.md,REPO_MAP.md}
│   ├── wingman-agent-worker/
│   │   └── docs/{ARCHITECTURE.md,REPO_MAP.md}
│   ├── po-workflow-worker/
│   │   └── docs/{ARCHITECTURE.md,REPO_MAP.md}
│   ├── dev-agent-worker/
│   │   └── docs/{ARCHITECTURE.md,REPO_MAP.md}
│   └── ui-worker/
│       └── docs/{ARCHITECTURE.md,REPO_MAP.md}
├── packages/
│   ├── contracts/
│   │   ├── src/
│   │   │   ├── domain.ts
│   │   │   ├── pagination.ts
│   │   │   ├── errors.ts
│   │   │   ├── rpc.ts
│   │   │   ├── agent-events.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── tsconfig/
│       ├── base.json
│       ├── worker.json
│       ├── react.json
│       └── package.json
├── scripts/
│   ├── run-workspaces.mjs
│   ├── deploy-all.mjs
│   ├── provision-d1.mjs
│   ├── provision-vectorize.mjs
│   ├── verify-provisioning.mjs
│   └── check-generated-types.mjs
├── docs/
│   ├── ARCHITECTURE.md
│   └── REPO_MAP.md
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.json
├── prettier.config.js
└── .gitignore
```

The `apps/*` entries above are module boundaries only. Their internal trees are not part of this root map.

## 3. Root application directory contracts

### `apps/domain-api-worker/`

Private Worker deployed as `agentic-delivery-loop-domain-api`. Root code may invoke its workspace scripts and include its Wrangler configuration in RPC type generation. Internal source and D1 implementation are defined only by its module LLD.

### `apps/wingman-agent-worker/`

Private Worker deployed as `agentic-delivery-loop-wingman-agent`. Root code may invoke its workspace scripts and include its Wrangler configuration in UI or Dev Agent type generation. Internal agent implementation is defined only by its module LLD.

### `apps/po-workflow-worker/`

Private Worker deployed as `agentic-delivery-loop-po-workflow`. Root code may invoke its workspace scripts and provision resources required by its bindings. Internal workflow code is defined only by its module LLD.

### `apps/dev-agent-worker/`

Private Worker deployed as `agentic-delivery-loop-dev-agent`. Root code may invoke its workspace and secret scripts. Internal GitHub and agent behavior is defined only by its module LLD.

### `apps/ui-worker/`

Public Worker deployed as `agentic-delivery-loop-ui`. Its Vite configuration owns the single-command local topology by declaring all private Workers as auxiliary Workers. Internal React, Hono, asset, and gateway files are defined only by its module LLD.

## 4. Root files

### `package.json`

Private root package and operator command registry.

Required fields:

```text
name             agentic-delivery-loop
private          true
packageManager   exact pnpm version
engines.node     supported Node.js range
scripts          commands listed below
```

Required script groups:

```text
Quality:
  typecheck
  format
  format:check
  validate

Cloudflare types:
  cf:types
  cf:types:check

Local/build:
  dev
  build

Provisioning/migrations:
  provision:d1
  provision:vectorize
  provision:verify
  db:migrate:local
  db:migrate:remote

Secrets:
  secret:github

Deployment:
  deploy:domain-api
  deploy:wingman
  deploy:po-workflow
  deploy:dev-agent
  deploy:ui
  deploy:all
```

Canonical delegation scripts:

```json
{
  "scripts": {
    "dev": "pnpm --filter @agentic-delivery-loop/ui-worker dev",
    "deploy:domain-api": "pnpm --filter @agentic-delivery-loop/domain-api-worker deploy",
    "deploy:wingman": "pnpm --filter @agentic-delivery-loop/wingman-agent-worker deploy",
    "deploy:po-workflow": "pnpm --filter @agentic-delivery-loop/po-workflow-worker deploy",
    "deploy:dev-agent": "pnpm --filter @agentic-delivery-loop/dev-agent-worker deploy",
    "deploy:ui": "pnpm --filter @agentic-delivery-loop/ui-worker deploy",
    "deploy:all": "node scripts/deploy-all.mjs"
  }
}
```

Workspace package names are `@agentic-delivery-loop/<directory-name>`, for example `@agentic-delivery-loop/dev-agent-worker`. Package names are distinct from deployed Worker names (`agentic-delivery-loop-dev-agent`).

`validate` runs `cf:types:check -> typecheck -> build`. No script uses `wrangler deploy --dry-run`.

Dependency baseline (see `docs/ARCHITECTURE.md` section 9.3):

```json
{
  "pnpm": {
    "overrides": {
      "agents": "<exact verified version>",
      "@cloudflare/ai-chat": "<exact verified version>",
      "ai": "<exact verified version>",
      "zod": "<exact verified version>",
      "wrangler": "<exact verified version>"
    }
  }
}
```

Placeholders are filled only after the dependency compatibility spike succeeds. Versions are exact; `^`, `~`, `latest`, and `*` are forbidden.

The root package contains repository tooling dependencies only. Runtime libraries belong to the workspace that imports them.

There are no test scripts.

### `pnpm-workspace.yaml`

Declares precisely:

```yaml
packages:
  - apps/*
  - packages/*
```

No nested application workspace glob is required unless a future approved structural change introduces one.

### `pnpm-lock.yaml`

Generated by the pinned pnpm version and committed. It is the authoritative dependency resolution for all workspaces. It is never hand-edited.

### `tsconfig.json`

Root editor/navigation configuration.

Responsibilities:

- Contains no application output configuration.
- Sets `files: []` or an equivalent solution-style shape.
- Does not force all projects through `tsc -b`.
- May list workspace references only if they improve editor navigation without making build mode a repository requirement.
- Root `pnpm typecheck` remains recursive workspace orchestration.

### `prettier.config.js`

Single formatting configuration.

Major export:

```js
export default {/* repository formatting options */};
```

Applies consistent formatting to source, configuration, and Markdown. It does not format generated declarations or `pnpm-lock.yaml` through custom mutation scripts.

### `.gitignore`

Must ignore at least:

```text
node_modules/
dist/
.wrangler/
.dev.vars
.dev.vars.*
.env
.env.*
!.env.example
coverage/
*.log
.DS_Store
Thumbs.db
```

Also ignores module-local D1 development state and temporary provisioning output. It must not ignore:

```text
pnpm-lock.yaml
worker-configuration.d.ts
docs/ARCHITECTURE.md
docs/REPO_MAP.md
```

### `README.md`

Operator-focused repository guide. Required section order:

1. POC purpose and five-module summary.
2. Repository prerequisites.
3. Cloudflare login/account prerequisites.
4. Install dependencies.
5. Run the dependency compatibility spike, then pin the compatibility date and exact package versions.
6. Provision `adl-sql-db` and copy its ID into module configuration.
7. Provision `adl-vector-db` with 768 dimensions and cosine distance.
8. Apply remote D1 migrations.
9. Set the Dev Agent GitHub secret.
10. Generate Cloudflare types and run validation.
11. First deployment using `pnpm deploy:all`.
12. Retrieve/open the UI Worker URL.
13. Manual smoke flow.
14. Independent redeployment commands.
15. Local run using `pnpm dev`.
16. Troubleshooting for missing bindings, stale generated types, migrations, and deployment order.
17. Links to root and module design documents.

The README must not become another architecture document or duplicate module internals.

### `AGENTS.md`

Mandatory coding-agent instructions for the entire repository.

Required rules:

- Read root `docs/ARCHITECTURE.md` and `docs/REPO_MAP.md` before editing root files.
- Read the target module's docs before editing that module.
- Keep root and module responsibilities separated.
- Use pnpm only.
- Preserve exact Worker/resource/binding names.
- Do not add tests, alternate environments, CI/CD, Turborepo, Nx, public backend routes, or cross-app source imports.
- Do not edit generated `worker-configuration.d.ts` manually.
- Regenerate Cloudflare types after binding or runtime configuration changes.
- Update the applicable architecture and repo-map documents with structural or behavioral changes.
- Run root validation commands before declaring completion.

`AGENTS.md` contains implementation constraints, not product decisions or extensive architecture prose.

### `docs/ARCHITECTURE.md`

The root architectural LLD. Its required content is the content of the accompanying root Architecture document:

- Scope and ownership.
- Module registry.
- Public/private topology.
- RPC and fetch-forwarding boundaries.
- Binding matrix.
- Resource names.
- One-environment policy.
- Shared-package boundaries.
- Type generation.
- Root scripts.
- Local topology.
- Provisioning and deployment.
- Validation.
- Documentation authority.
- Explicit non-goals and acceptance criteria.

### `docs/REPO_MAP.md`

This root file map. It is updated whenever a root file or shared-package file is added, removed, renamed, or changes responsibility.

## 5. `packages/contracts`

### `packages/contracts/package.json`

Package identity:

```text
name: @agentic-delivery-loop/contracts
private: true
```

Responsibilities:

- Defines package exports for the public entrypoint.
- Declares `zod` as its runtime dependency.
- Provides at least `typecheck` scripts.
- Does not publish to npm.
- Does not expose internal source paths as supported entrypoints.

No React, Hono, Wrangler, Agents SDK, AI SDK runtime, D1, GitHub, or Node-only dependency is allowed. The single exception is a type-only `ai` dependency for `UIMessage`.

### `packages/contracts/tsconfig.json`

Extends `@agentic-delivery-loop/tsconfig/base.json`.

Characteristics:

- Typechecks source only.
- Uses `noEmit` for repository validation.
- Includes `src/**/*.ts`.
- Does not include Cloudflare runtime types.

### `packages/contracts/src/domain.ts`

Owns cross-boundary domain value types and validation schemas.

Required exports:

```ts
export const requestStatusSchema;
export type RequestStatus;

export const ticketStatusSchema;
export type TicketStatus;

export interface FeatureRequestDto;
export interface TicketDto;          // pullRequestUrl: string | null
export interface PoLogDto;

// Domain API RPC argument and result types
export interface CreateRequestInput; // { name, description }
export interface GetRequestInput;    // { requestId }
export interface ListRequestsInput;  // { page?, pageSize?, status? }
export interface GetTicketInput;     // { ticketId }
export interface ListTicketsInput;
export interface CreateTicketAndLinkRequestInput;
export interface CreateTicketAndLinkRequestResult;
export interface LinkRequestToTicketInput;
export interface LinkRequestToTicketResult;
export interface SaveTicketPullRequestUrlInput; // { ticketId, pullRequestUrl }
export interface CompleteTicketInput;           // { ticketId }
export interface AppendPoLogInput;              // { message }
export interface ListPoLogsInput;
```

Repository-wide limits represented by schemas:

```text
Feature request name:         1..50 trimmed characters
Feature request description:  1..1,000 trimmed characters
Ticket name:                  1..50 trimmed characters
Ticket description:           1..1,000 trimmed characters
PO log message:               1..3,000 trimmed characters
```

Contracts owns the status enum schemas only. Strict RPC input validation schemas (trimming, clamping, unknown-key rejection) are owned by the Domain API module and import the status schemas from here.

DTOs contain serialized data only. They do not expose D1 rows, Durable Object objects, RPC stubs, or methods.

### `packages/contracts/src/pagination.ts`

Required exports:

```ts
export interface PageRequest {
  page: number;
  pageSize: number;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalPages: number;
}

export const pageRequestSchema;

export function normalizePage(
  input: PageRequest,
  defaults: { pageSize: number; maxPageSize: number },
): PageRequest;
```

`PageResult<T>` intentionally carries no `total` or `totalItems`. Domain API counts rows internally and returns only `totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)`. An out-of-range page returns an empty `items` array with the correctly calculated `totalPages`.

`normalizePage` applies repository-generic page validation only. Operation-specific defaults such as request, ticket, or PO-log page sizes remain in the owning module.

### `packages/contracts/src/errors.ts`

Required exports:

```ts
export interface NormalizedError {
  code: string;
  message: string;
  details?: unknown;
}

export function toErrorResult(error: unknown): NormalizedError;
```

`code` is an open string, not a closed union. Conventional values are `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `INVALID_TRANSITION`, `INTERNAL_ERROR`, and `UPSTREAM_ERROR`; modules may emit others without changing this type. `toErrorResult` never exposes raw stack traces, SQL, secrets, or GitHub tokens.

### `packages/contracts/src/rpc.ts`

Canonical response envelope for every Domain API RPC method.

Required exports:

```ts
export interface RpcError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export type RpcResult<T> = { ok: true; data: T } | { ok: false; error: RpcError };

export function isRpcSuccess<T>(result: RpcResult<T>): result is { ok: true; data: T };
```

Domain API returns `Promise<RpcResult<T>>` from every method. Consumers unwrap with a module-local `unwrapRpcResult()` helper and `DomainRpcError`; those helpers are not placed in contracts because each consumer decides how failures surface (throw, tool error result, or HTTP error DTO).

### `packages/contracts/src/agent-events.ts`

Required public types:

```ts
export type AgentActivityEvent =
  | ToolStartEvent
  | ToolResultEvent
  | ToolErrorEvent
  | LifecycleStateEvent;

// Wingman programmatic turn (Dev -> Wingman Durable Object RPC)
export interface InvokeWingmanTurnInput {
  prompt: string;
}

export interface WingmanToolCall {
  toolCallId: string;
  toolName: string;
}

export interface WingmanTurnResult {
  responseMessage: UIMessage;
  toolCalls: WingmanToolCall[];
}

// Dev verification outcome shown in the UI
export interface WingmanVerificationResult {
  verified: boolean;
  expectedToolName: string;
  wingmanResponse: UIMessage;
  toolsCalled: Array<{ toolName: string }>;
}

export interface DevAgentPublicState; // status: idle | ticket_started | branch_ready | pr_open | pr_merged
```

`UIMessage` comes from `import type { UIMessage } from "ai"` (type-only; `ai` is a dev/peer dependency of contracts at the baseline version). Each event variant has a stable discriminant and JSON-serializable fields. Detailed producer behavior remains in agent module LLDs.

### `packages/contracts/src/index.ts`

Only supported package entrypoint.

Responsibilities:

- Re-export public symbols from `domain.ts`, `pagination.ts`, `errors.ts`, `rpc.ts`, and `agent-events.ts`.
- Avoid default exports.
- Avoid wildcard re-exports if they create ambiguous names.
- Export no module implementation or Cloudflare binding type.

## 6. `packages/tsconfig`

### `packages/tsconfig/package.json`

Package identity:

```text
name: @agentic-delivery-loop/tsconfig
private: true
```

Exports JSON configuration files:

```json
{
  "exports": {
    "./base.json": "./base.json",
    "./worker.json": "./worker.json",
    "./react.json": "./react.json"
  }
}
```

No runtime scripts or compiled output.

### `packages/tsconfig/base.json`

Shared strict compiler rules.

Required policy includes:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "useUnknownInCatchVariables": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
  },
}
```

The coding agent adds suitable modern `target`, `module`, and resolution settings compatible with Vite, Wrangler, and the selected dependency versions.

### `packages/tsconfig/worker.json`

Extends `base.json` and supplies Worker-oriented settings. It does not reference a specific Worker's `worker-configuration.d.ts`; each Worker includes its own generated declaration through its module `tsconfig.json`.

### `packages/tsconfig/react.json`

Extends `base.json` and supplies React/Vite settings, including JSX handling and browser library types. It does not add Node globals to browser source.

## 7. `scripts`

Root scripts use Node ESM and cross-platform process APIs. They must not assume Bash, PowerShell, GNU `sed`, `grep`, or `make` is installed. Every script exits nonzero on failure and preserves child-process output.

### `scripts/run-workspaces.mjs`

Optional small shared process utility used by other root scripts.

Major exports:

```js
export async function run(command, args, options);
export async function runWorkspace(workspaceName, scriptName, options);
export async function runSequential(tasks);
```

Responsibilities:

- Invoke commands with inherited stdio.
- Handle Windows and POSIX executable resolution.
- Stop sequential execution on first failure.
- Avoid shell interpolation of secrets or user-controlled values.

It contains no application logic.

### `scripts/deploy-all.mjs`

Implements the fail-fast first/full deployment order:

```text
domain-api -> wingman -> po-workflow -> dev-agent -> ui
```

Major export/entrypoint:

```js
async function main(): Promise<void>;
```

Responsibilities:

- Run each root per-Worker deploy command sequentially.
- Print the currently deploying Worker.
- Stop immediately if one deployment fails.
- Never run deployments in parallel.
- Never mutate bindings or provision resources implicitly.

### `scripts/provision-d1.mjs`

Ensures the Cloudflare account contains `adl-sql-db`.

Major functions:

```js
async function findDatabaseByName(name);
async function createDatabase(name);
async function main();
```

Responsibilities:

- Use Wrangler CLI commands, not undocumented network calls.
- Detect an existing database by exact name.
- Avoid creating a duplicate when the resource already exists.
- Print the resulting identifier and the owning Wrangler file that requires it.
- Never edit module Wrangler configuration silently.

### `scripts/provision-vectorize.mjs`

Ensures `adl-vector-db` exists with the required compatibility:

```text
dimensions: 768
metric: cosine
```

Major functions:

```js
async function findIndexByName(name);
async function createIndex({ name, dimensions, metric });
async function main();
```

If an index with the same name exists but has incompatible dimensions or metric, the script fails with a corrective message. It must not delete or recreate the index automatically.

### `scripts/verify-provisioning.mjs`

Read-only preflight inspection.

Major export/entrypoint:

```js
async function main(): Promise<void>;
```

Checks:

- Cloudflare authentication is available.
- `adl-sql-db` exists.
- `adl-vector-db` exists with 768/cosine configuration where the CLI exposes those fields.
- Expected Worker names and binding targets are syntactically consistent with module configurations.
- Required configuration placeholders have been replaced.

It does not expose secret values and does not fail merely because Workers have not yet been deployed during the initial provisioning phase. It clearly separates warnings from blocking errors.

### `scripts/check-generated-types.mjs`

Validates committed Wrangler-generated declarations.

Major export/entrypoint:

```js
async function main(): Promise<void>;
```

Responsibilities:

1. Run `pnpm cf:types`.
2. Use Git to inspect only generated `worker-configuration.d.ts` paths.
3. Exit nonzero when regeneration changes a committed generated file.
4. Print changed paths.
5. Never rewrite or normalize generated content itself.

## 8. Root command-to-owner mapping

| Root command               | Direct owner                         |
| -------------------------- | ------------------------------------ |
| `pnpm dev`                 | `apps/ui-worker` Vite configuration  |
| `pnpm typecheck`           | Every workspace's `typecheck` script |
| `pnpm format*`             | Root Prettier configuration          |
| `pnpm cf:types`            | Worker workspace `cf:types` scripts  |
| `pnpm build`               | Workspaces with build scripts        |
| `pnpm provision:d1`        | `scripts/provision-d1.mjs`           |
| `pnpm provision:vectorize` | `scripts/provision-vectorize.mjs`    |
| `pnpm provision:verify`    | `scripts/verify-provisioning.mjs`    |
| `pnpm db:migrate:*`        | Domain API workspace                 |
| `pnpm secret:github`       | Dev Agent workspace                  |
| `pnpm deploy:*`            | Corresponding Worker workspace       |
| `pnpm deploy:all`          | `scripts/deploy-all.mjs`             |

## 9. Files intentionally absent

The coding agent must not create these root files or directories:

```text
turbo.json
nx.json
changeset config
.github/workflows/*
docker-compose.yml
Dockerfile
Makefile
wrangler.jsonc                 # no aggregate root Worker exists
.env                           # secrets are module-local and uncommitted
vitest.config.*
playwright.config.*
tests/
fixtures/
coverage/
```

A root `wrangler.jsonc` is specifically forbidden because the repository root is not a sixth Worker. Every deployment configuration belongs to exactly one application module.

## 10. Map maintenance rule

Update this file when any root/shared file is added, removed, renamed, or changes responsibility. Do not add module-internal source files to this map. If a new cross-module contract is introduced, first determine whether it belongs in an existing contracts file; create another shared file only when it represents a distinct stable boundary.
