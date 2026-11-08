# Agentic Delivery Loop

## Consolidated High-Level Plan

> **Status: historical planning input.** This document records the original phase plan. The authoritative low-level design is `docs/ARCHITECTURE.md`, `docs/REPO_MAP.md`, and each module's `apps/<workspace>/docs/ARCHITECTURE.md` and `REPO_MAP.md`. Where this plan differs from those documents — for example suggested `adl-*` Worker names, `adl-domain-db`, Wingman verification RPC with an expected result, a Service Binding from Dev to Wingman, or the original tool lists — the LLD documents win.

## 1. Goal

Build a recruiter-facing Cloudflare-native proof of concept demonstrating this loop:

1. A user asks a Wingman Agent to perform a task.
2. The Wingman Agent uses an available wingman tool or creates a feature request for an unsupported operation.
3. A scheduled PO Workflow semantically deduplicates pending requests and creates or links tickets.
4. A Dev Agent selects an accepted ticket, makes a restricted Wingman Worker change through GitHub REST APIs, and creates a pull request.
5. A human reviews and merges the pull request, then manually deploys the Wingman Worker.
6. The Dev Agent verifies the deployed capability and marks the ticket and linked requests complete.

Authentication is excluded from the current POC. The deployed application will be publicly reachable, so AI usage and Cloudflare quotas must be monitored. Authentication may be added later without changing internal domain contracts.
Pre-code human activities are handled interactively outside this document.

### Resource-provisioning rule

Cloudflare resources must be created in the implementation phase that first needs them. Do not manually reserve or pre-create all resources before code generation.

### Code-generation rule

All repository files, project dependencies, workspace configuration, Worker configuration, migrations, source files, scripts, tests, and documentation are implementation outputs beginning in Phase 1.
---

## 3. Final Deployment Architecture

Use one GitHub repository with five independently deployable Cloudflare Workers.

### Worker 1: UI Worker

Responsibilities:

- React and TypeScript browser application;
- static assets;
- tabs for Requests, Wingman, Tickets, PO Logs, and Dev Agent;
- public same-origin routing facade;
- forwarding browser API calls and agent WebSocket or HTTP traffic through Service Bindings;
- user-facing errors, loading states, and empty states.

The UI Worker contains presentation and browser-routing code only. It contains no D1 queries, PO logic, GitHub integration, or agent business logic.

### Worker 2: Wingman Agent Worker

Responsibilities:

- Wingman Agent;
- Wingman Agent Durable Object and conversation state;
- wingman tools and tool registry;
- unsupported-operation detection;
- feature-request creation through Domain API RPC;
- deterministic verification RPC used by the Dev Agent.

This Worker remains independently deployable because the Dev Agent modifies its wingman-tool source and a human redeploys it after merging a pull request.

### Worker 3: Domain API Worker

Contains three independent modules:

- Requests;
- Tickets;
- PO Logs.

Responsibilities:

- D1 database access;
- input validation;
- public APIs required by the UI;
- private RPC operations used by the Wingman Agent, PO Workflow, and Dev Agent;
- transactions and status consistency.

It contains no Workers AI, Vectorize, GitHub, PO-decision, or agent-orchestration logic.

### Worker 4: PO Workflow Worker

Responsibilities:

- Cloudflare Workflow definition and schedule;
- PO-only Workers AI prompting;
- PO-only embedding generation;
- Vectorize similarity search and canonical-vector writes;
- duplicate or new-ticket decision validation;
- Workflow retries and steps;
- Domain API RPC calls for requests, tickets, and logs.

All PO-only code belongs here.

### Worker 5: Dev Agent Worker

Responsibilities:

- Dev Agent Durable Object and conversation state;
- Dev Agent prompts and tools;
- GitHub REST API integration;
- branch, file, commit, and pull-request operations;
- wingman-tool path restrictions;
- ticket selection and status updates through Domain API RPC;
- deployed-capability verification through Wingman Agent RPC.

GitHub secrets and GitHub client code must not exist in any other Worker.

---

## 4. Communication and Ownership Model

### Browser communication

The browser talks only to the UI Worker public origin.

```text
Browser
  |
  v
UI Worker
  |-- Service Binding --> Domain API Worker
  |-- Service Binding --> Wingman Agent Worker
  `-- Service Binding --> Dev Agent Worker
```

The UI Worker forwards HTTP and WebSocket traffic while preserving response streaming. This avoids browser CORS configuration and provides one visible application URL.

### Internal communication

Use Cloudflare Service Bindings and typed RPC where practical.

```text
Wingman Agent Worker --> Domain API Worker
PO Workflow Worker       --> Domain API Worker
Dev Agent Worker         --> Domain API Worker
Dev Agent Worker         --> Wingman Agent Worker
```

Do not use public URLs or internal API tokens between Workers.

### Ownership rules

- Domain API Worker owns persistence and domain invariants.
- PO Workflow Worker owns PO orchestration and PO-only AI logic.
- Dev Agent Worker owns development automation and GitHub logic.
- Wingman Agent Worker owns wingman conversations and tools.
- UI Worker owns presentation and browser routing.
- Shared packages may define contracts and schemas, but not service-specific business logic.

---

## 5. Target Repository Structure

The complete structure is the end state. Directories are introduced only in the phase that needs them.

```text
agentic-delivery-loop/
├── apps/
│   ├── ui-worker/
│   │   ├── src/app/
│   │   ├── src/features/requests/
│   │   ├── src/features/wingman/
│   │   ├── src/features/tickets/
│   │   ├── src/features/po-logs/
│   │   ├── src/features/dev-agent/
│   │   ├── src/routing/
│   │   ├── src/index.ts
│   │   ├── wrangler.jsonc
│   │   ├── package.json
│   │   └── docs/
│   │       ├── ARCHITECTURE.md
│   │       └── REPO_MAP.md
│   ├── domain-api-worker/
│   │   ├── src/modules/requests/
│   │   ├── src/modules/tickets/
│   │   ├── src/modules/po-logs/
│   │   ├── src/db/
│   │   ├── src/rpc/
│   │   ├── migrations/
│   │   ├── src/index.ts
│   │   ├── wrangler.jsonc
│   │   ├── package.json
│   │   └── docs/
│   │       ├── ARCHITECTURE.md
│   │       └── REPO_MAP.md
│   ├── wingman-agent-worker/
│   │   ├── src/agent/
│   │   ├── src/tools/
│   │   ├── src/rpc/
│   │   ├── src/index.ts
│   │   ├── wrangler.jsonc
│   │   └── docs/
│   │       ├── ARCHITECTURE.md
│   │       └── REPO_MAP.md
│   ├── po-workflow-worker/
│   │   ├── src/workflow/
│   │   ├── src/ai/
│   │   ├── src/vectorize/
│   │   ├── src/policies/
│   │   ├── src/index.ts
│   │   ├── wrangler.jsonc
│   │   └── docs/
│   │       ├── ARCHITECTURE.md
│   │       └── REPO_MAP.md
│   └── dev-agent-worker/
│       ├── src/agent/
│       ├── src/tools/
│       ├── src/github/
│       ├── src/verification/
│       ├── src/index.ts
│       ├── wrangler.jsonc
│       └── docs/
│           ├── ARCHITECTURE.md
│           └── REPO_MAP.md
├── packages/
│   ├── contracts/
│   ├── test-fixtures/
│   └── tsconfig/
├── docs/
│   ├── ARCHITECTURE.md
│   └── REPO_MAP.md
├── AGENTS.md
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json
└── README.md
```

## Repo Map and Architecture Files

These doc files act as llds of the project. repo map tells exactly what files are present in the respective code bases what functions are present in which file and a short description of what that function does. so that agents dont have to scan each file to find out where code changes need to be made. architecture md contains higher level details which tell us what we are doing and why we are doing and how we are doing. repo map tells that there is a file which contains a dto. but architecture md tells us where and how the dto is being used what the flow of control is in the code. what we are trying to do in the application. looking at both together gives the agent complete view of the codebase and together they form the lld of the codebase.  
The root level repo map and architectue md contain more higher level detail and refernce the individua repo map and architecture files present in various modules.
Agent md file contains overall global coding directions and instructions for the agent. like how the code should be written what should be done and what should not be done.

### Shared-package rule

`packages/contracts` may contain:

- DTOs;
- Zod schemas;
- status unions;
- pagination contracts;
- RPC method interfaces;
- agent tool input and output contracts.

It must not contain:

- D1 queries;
- Workers AI prompts;
- Vectorize policies;
- GitHub operations;
- agent implementations;
- UI components;
- Worker secrets or binding access.

---

# Phase 1: Complete Domain API Backend

## Objective

Create the repository foundation and complete the backend system of record before implementing any Agent, Workflow, or UI. Phase 1 delivers the Domain API Worker with all three domain modules:

- Requests;
- Tickets;
- PO Logs.

No UI Worker, Wingman Agent Worker, PO Workflow Worker, or Dev Agent Worker is created in this phase.

## Phase 1A: Repository and common workspace bootstrap

Generate:

- root `package.json` with an exact `packageManager` value;
- `pnpm-workspace.yaml`;
- root and shared TypeScript configuration;
- Vitest configuration;
- `.gitignore`;
- `AGENTS.md`;
- `docs/ARCHITECTURE.md`;
- `docs/REPO_MAP.md`;
- `packages/contracts`;
- `apps/domain-api-worker`;
- local Wrangler dependency pinned to an exact version;
- root scripts for type checking, tests, D1 migrations, local development, deployment dry runs, and deployment.

Do not create empty application folders for later phases. React, Vite, the Agents SDK, Workers AI integrations, Vectorize integrations, and GitHub integrations are not introduced in Phase 1.

Recommended deployed Worker name:

- `adl-domain-api`.

## Phase 1B: Domain API foundation

Create:

- Worker entry point;
- typed RPC entry-point convention;
- D1 client and repository convention;
- repository, service, and controller separation;
- consistent Zod input validation;
- normalized API error format for rpc entrypoints;
- cursor pagination format;
- module-registration mechanism;

The Domain API Worker is the only service allowed to access D1 directly.

## Phase 1C: Requests module

Suggested structure:

```text
src/modules/requests/
├── request.schema.ts
├── request.repository.ts
├── request.service.ts
├── request.rpc.ts
└── request.types.ts
```

Feature-request fields:

- `id`;
- `name`;
- `description`;
- `status`: `pending | accepted | in_progress | done`;
- `linked_ticket_id`, nullable;
- `created_at`;
- `updated_at`.

Private RPC operations include:

- create request;
- get request;
- list requests with page size s and optionally with filter on status sorted by oldest first;
- update status of requests linked to ticket

## Phase 1D: Tickets module

Suggested structure:

```text
src/modules/tickets/
├── ticket.schema.ts
├── ticket.repository.ts
├── ticket.service.ts
├── ticket.rpc.ts
└── ticket.types.ts
```

Ticket fields:

- `id`;
- `name`;
- `description`;
- `status`: `accepted | in_progress | done`;
- `pull_request_url`, nullable;
- `created_at`;
- `updated_at`.

Private RPC operations include:

- create ticket;
- get ticket by id;
- list tickets oldest first with pagination of size s default 5 optionally filtered by status;

Ticket creation is private because production tickets are created by the PO Workflow, not directly by the browser.

## Phase 1E: PO Logs module

Suggested structure:

```text
src/modules/po-logs/
├── po-log.schema.ts
├── po-log.repository.ts
├── po-log.service.ts
├── po-log.rpc.ts
└── po-log.types.ts
```

PO-log fields:

- `id`;
- `message`;
- `created_at`.

Private RPC operations:

- append log;
- list logs with page size 20 order by oldest first

Do not store embeddings, prompts, hidden reasoning, secrets, or large raw model outputs in PO logs.

## Phase 1F: Cross-module domain operations

The Domain API Worker owns transactionally consistent operations to:

Other workers need to use one or more of These exposed coarse-grained typed RPC methods individually or in a group as needed and not recreate domain transactions.

## Phase 1G: D1 database and migrations

Create one D1 database, suggested name `adl-domain-db`, and bind it as `DB`.

Use additive migrations for:

1. `feature_requests` no indexes;
2. `tickets` no indexes;
3. `po_logs` no indexes;
4. foreign-key or relationship indexes needed for linked request and ticket operations.

Expose repeatable local and remote migration commands. Never edit a migration after it has been applied to a shared or remote environment.

## Phase 1H: Backend-only validation

Validate the backend by running it in the sandbox environment and invoking direct RPC endpoints with sample data to test and verify application behavior.

Conceptual commands:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm db:migrate:local
pnpm dev:phase1
pnpm deploy:phase1
```

Phase 1 completion criteria:

- clean installation succeeds with the pinned package manager and lockfile;
- Domain API Worker type-checks and passes tests;
- all three modules and cross-module transactions are implemented;
- local D1 migrations work from an empty database;
- remote D1 creation and migration commands are documented;
- private typed RPC surface needed by Phases 2 through 4 is defined and tested;
- deployment dry run succeeds;
- no UI or Agent code exists yet.

---

# Phase 2: Complete Wingman Agent Backend

## Objective

Create the Wingman Agent Worker as a backend-only service. It uses the completed Domain API RPC surface from Phase 1. No Wingman UI is implemented in this phase.

## Phase 2 repository and resource additions

Create only now:

- `apps/wingman-agent-worker`;
- Wingman Worker `wrangler.jsonc`;
- Wingman Agent Durable Object and migration;
- Workers AI binding;
- Wingman-to-Domain Service Binding named `DOMAIN_API`;
- Wingman Agent contracts in `packages/contracts`;
- Phase 2 local-development, and deployment scripts.

Recommended deployed Worker name:

- `adl-wingman-agent`.

## Wingman Agent behavior

Implement:

- Wingman Agent Durable Object;
- Workers AI-backed conversation;
- addition tool;
- subtraction tool;
- `create_feature_request` tool;
- explicit wingman-tool registry;
- streamed HTTP or WebSocket responses;
- structured tool activity events;
- deterministic verification RPC for Phase 4;
- Domain API RPC call for request creation;

Unsupported mathematical operations must not be silently calculated by the model. The Agent must create a feature request and tell the caller that the operation is not supported yet.

Conversation behavior:

- accepts a caller-provided conversation ID;
- keeps Durable Object state by conversation ID;
- preserves complete tool-call and tool-result boundaries;
- limits model context to approximately ten recent complete messages;
- exposes no conversation browser, search, archive, or export.

## Backend-only validation

Use direct WebSocket, RPC, and automated tests rather than a browser UI.

Validate:

- addition invokes the addition tool;
- subtraction invokes the subtraction tool;
- multiplication creates exactly one pending request in D1;
- malformed inputs return normalized errors;
- tool events are emitted in order;
- streaming completes correctly;
- deterministic verification RPC returns normalized tool and result data;
- Wingman Worker can be deployed independently;
- Requests, Tickets, and PO Logs behavior from Phase 1 remains unchanged.

---

# Phase 3: Complete PO Workflow Backend

## Objective

Implement the complete PO automation backend using the Domain API from Phase 1. No PO Logs UI or Tickets UI is created in this phase.

## Phase 3 repository and resource additions

Create only now:

- `apps/po-workflow-worker`;
- PO Workflow `wrangler.jsonc`;
- Cloudflare Workflow binding;
- five-minute schedule;
- only one workflow runs at a time if previous workflow still running then dont run new workflow;
- Workers AI binding;
- Vectorize index with dimensions matching the selected embedding model;
- Vectorize binding named `TICKET_INDEX`;
- PO-to-Domain Service Binding named `DOMAIN_API`;
- PO contracts and structured-decision schemas;
- development-only command or handler for starting one Workflow instance.

Recommended deployed Worker name:

- `adl-po-workflow`.

## Schedule and processing limits

- run every five minutes;
- get list of five pending requests;
- process claimed requests sequentially;
- use no artificial delay;
- expose no production public Start endpoint;
- permit a development-only CLI or protected local test trigger.

## PO-only ownership

The PO Workflow Worker exclusively owns:

- Workflow orchestration;
- step names and retry settings; if step fails abort the pipeline for that particular ticket no need to retry; continue pipeline for next ticket in list; after 5 mins when new workflow runs remaining tickets will be automatically retried;
- PO prompts;
- embedding calls;
- Vectorize queries and writes;
- duplicate thresholds and candidate ranking;
- structured create-or-link decision schema;
- candidate validation;

## Workflow sequence

1. Ask Domain API RPC to list five pending requests.
2. Exit immediately when no requests are available.
3. For each request:
   - append a concise selection log;
   - generate an embedding with Workers AI;
   - query the top three canonical candidates in Vectorize;
   - load candidate requests and tickets through Domain RPC;
   - obtain a structured create-or-link decision from Workers AI;
   - validate that the chosen duplicate belongs to the retrieved candidate set;
   - call required Domain RPC transaction to create new ticket and link request to it or link request to existing ticket;
   - upsert a canonical vector only when a new ticket is created;
   - append a concise result log.
4. After exhausted retries, return the request to `pending` and append one failure log.

## Backend-only validation

Use seeded data, Domain API reads, Workflow run inspection, and automated tests by running the application in sandbox and scheduling the workflow. No UI is required.

Validate with 10 to 20 requests covering unique and duplicate wording:

- no execution picks more than five requests;
- duplicate requests link only to retrieved candidate tickets;
- new canonical tickets receive Vectorize entries;
- duplicate requests do not create redundant canonical vectors;
- PO Logs contain concise operational messages;
- scheduled and manually triggered remote executions work;

---

# Phase 4: Complete Dev Agent Backend

## Objective

Implement the complete Dev Agent backend and GitHub integration. No Dev Agent UI is created in this phase.

## Phase 4 repository and resource additions

Create only now:

- `apps/dev-agent-worker`;
- Dev Agent `wrangler.jsonc`;
- Dev Agent Durable Object and migration;
- Workers AI binding;
- Dev-to-Domain Service Binding named `DOMAIN_API`;
- Dev-to-Wingman cross-Worker Durable Object namespace binding named `WINGMAN_AGENT`;
- GitHub REST client and safety policy;
- Dev Agent contracts and structured tool-event schemas;
- GitHub fine-grained personal access token stored only as Dev Agent secret `GITHUB_TOKEN`;
- local uncommitted secret configuration;
- safe test-repository mode for GitHub writes.

Recommended deployed Worker name:

- `adl-dev-agent`.

Create the GitHub token in this phase, scope it to the single repository, and grant only the repository permissions required for contents, branches or commits, and pull requests.

## Dev Agent tools

Domain tools:

- `get_ticket`;
- `start_oldest_accepted_ticket`.

Saving the PR URL and completing the ticket are internal lifecycle-service operations, not model tools.

GitHub tools:

- `create_branch`;
- `list_files`;
- `read_file`;
- `write_file`;
- `create_pull_request`;
- `get_pull_request_status`.

Verification tool:

- `verify_wingman_capability`.

All domain changes use Domain API RPC. All deployed-capability checks use Wingman Durable Object RPC (`invokeTurn`).

## Source-change safety policy

Allow file related tools to work only under:

```text
apps/wingman-agent-worker/src/tools/
```

Reject:

- absolute paths;
- `..` traversal;
- binary files;
- oversized files;
- unexpected extensions;
- changes outside the approved folder.

Registry changes are allowed only in the specifically approved wingman tool-registry file.

## Dev lifecycle

### Implementation

1. Select the oldest accepted ticket through Domain RPC. Store the ticket ID in Durable Object state. Mark the ticket and linked requests `in_progress`.
2. Create a branch from `main`.
3. Inspect only approved wingman-tool files.
4. Write the tool and update the approved registry file.
5. Commit through GitHub REST APIs.
6. Create a pull request.
7. Save the PR URL through Domain RPC.
8. Return a response asking the human to review, merge, and manually deploy the Wingman Worker. Stop until the caller continues the conversation.

### Verification

1. Confirm through GitHub that the pull request was merged.
2. Call `WingmanAgent.invokeTurn({ prompt })` on a fresh conversation ID. Wingman returns its completed response and tool calls; Dev checks the expected tool name itself. On success, mark the ticket and linked requests `done` and clear active Agent state. On failure, retain `in_progress` and request correction and redeployment.

## Backend-only validation

Use direct WebSocket clients to test the behavior in sandboxed environment. No UI is required.

Validate:

- oldest accepted ticket selection;
- lifecycle status transitions;
- path restriction and traversal rejection;
- GitHub operations against a safe test repository;
- PR creation against the configured repository;
- pause after PR creation;
- merged-PR detection;
- deployed Wingman verification;
- successful completion of ticket and linked requests;
- failure retains `in_progress`;
- GitHub integration exists only in Dev Agent Worker;

---

# Phase 5: Complete Unified UI for All Backends

## Objective

Create the UI Worker in one phase after all backend contracts are stable. Deliver a single React application covering:

- Requests;
- Wingman Agent;
- Tickets;
- PO Logs;
- Dev Agent.

The UI must integrate existing backend behavior without moving business logic into the browser or UI Worker.

## Phase 5 repository and binding additions

Create only now:

- `apps/ui-worker`;
- React and TypeScript application;
- Vite configuration;
- UI Worker `wrangler.jsonc`;
- UI-to-Domain Service Binding named `DOMAIN_API`;
- UI-to-Wingman Service Binding named `WINGMAN_AGENT`;
- UI-to-Dev Service Binding named `DEV_AGENT`;
- static asset build and deployment configuration;
- UI test dependencies and scripts;
- Phase 5 local multi-Worker and deployment scripts.

Recommended deployed Worker name:

- `adl-ui`.

The UI Worker is the only public browser origin. It forwards HTTP, streaming, and WebSocket traffic through Service Bindings and preserves response streaming.

## Phase 5A: Shared UI foundation

Create:

- React application shell;
- tab registry;
- route registry;
- shared page layout;
- typed API and Agent clients based on `packages/contracts`;
- normalized error handling;
- loading, empty, quota, connection, and failure states;
- reusable pagination;
- reusable status badge;
- reusable tool-activity presentation;
- accessible keyboard and focus behavior;
- responsive layout;
- feature-folder convention.

Feature folders:

```text
src/features/
├── requests/
├── wingman/
├── tickets/
├── po-logs/
└── dev-agent/
```

## Phase 5B: Requests UI

Provide:

- five full-width cards per page;
- oldest-first ordering;
- status filter;
- wrapped name and description;
- linked ticket when available;
- created and updated timestamps;
- no text search.
- read-only behavior.

## Phase 5C: Wingman Agent UI

Provide:

- streamed assistant output;
- tool activities in execution order;
- concise tool summaries;
- disabled composer while a turn is active;
- clear quota, connection, model, and tool errors.

Conversation behavior:

- random conversation ID on Wingman tab load;
- ID retained only in page memory;
- refresh starts a new conversation;
- no conversation search, restore, browser, or export.

## Phase 5D: Tickets UI

Provide:

- five cards per page;
- oldest-first ordering;
- status filter;
- pull-request link;
- created and updated timestamps;
- read-only behavior.
- no text search.

## Phase 5E: PO Logs UI

Provide:

- 20 entries per page;
- chronological order within a page;
- show last page by default;
- wrapped messages;
- read-only behavior.
- no filter or search.

## Phase 5F: Dev Agent UI

Provide:

- streamed assistant output;
- structured tool activity;
- read-only state panel;
- optional New Conversation action;
- disabled composer while active;
- clear GitHub, model, connection, and verification errors.

Conversation behavior:

- conversation ID stored in `localStorage`;
- same-tab refresh reconnects;
- a new tab may create a separate conversation;
- no state editor, timeline, cancel or retry controls, or tool replay.

## Phase 5G: Local integration and deployment

Local development starts all five Workers, with UI Worker as the primary browser entry point and the other Workers available through Service Bindings.

Conceptual command:

```bash
pnpm dev:all
```

Deployment sequence:

1. Verify Domain API, Wingman Agent, PO Workflow, and Dev Agent deployments.
2. Configure the three UI Service Bindings.
3. Build UI static assets.
4. Deploy UI Worker.
5. Run the complete browser smoke-test suite.

## Phase 5 completion criteria

- all five tabs work through one public UI origin;
- no browser CORS configuration is needed;
- Requests, Tickets, and PO Logs pagination and filters work;
- Wingman streaming and tool activities work;
- Dev Agent streaming, tool activities, state, PR handoff, and continuation work;
- no domain, PO, Wingman, GitHub, or Dev business logic is duplicated in UI code;
- complete request-to-capability demonstration succeeds;
- UI type-check, component tests, and end-to-end smoke tests pass;
- all five Workers pass deployment dry runs;
- final README, architecture, repository map, and operational instructions are complete.

---

## 6. Deployment Readiness Rules for Every Phase

Every phase must finish with:

- successful TypeScript compilation;
- `pnpm cf:types` and `pnpm build` success for Workers changed in that phase;
- committed, additive, repeatable D1 migrations where applicable;
- local run instructions in README;
- deployment commands in README;
- health endpoint for every deployed backend Worker;
- source maps enabled;
- no secrets in Git;
- earlier-phase regression checks;
- deployed smoke-test checklist;
- explicit list of resources and bindings introduced in that phase;
- updated `docs/REPO_MAP.md` for that module for structural changes;
- updated `docs/ARCHITECTURE.md` for that module for architecture or flow changes.

A phase must not depend on unfinished code from the next phase. Do not create empty placeholder Workers merely to make the final structure appear complete.

---

## 7. Included in Scope

- TypeScript monorepo with pnpm workspaces;
- five independently deployable Cloudflare Workers by the end of Phase 5;
- one public UI origin;
- shared typed contracts and validation schemas;
- Service Bindings and typed internal RPC;
- D1 Requests, Tickets, and PO Logs modules;
- Wingman Agent with addition, subtraction, and feature-request creation;
- streamed Wingman conversations and structured tool activity;
- Cloudflare PO Workflow every five minutes with batch size up to five;
- Workers AI embeddings and PO decisions;
- Vectorize canonical-request matching;
- Dev Agent with restricted GitHub REST tools;
- human PR review, merge, and Wingman deployment;
- post-deployment verification;
- phase-by-phase local execution where meaningful;
- deployed validation for AI, Vectorize, schedules, GitHub writes, and final integration.

---

## 8. Explicitly Excluded from Scope

- authentication and authorization;
- passcodes, sessions, user accounts, roles, and Cloudflare Access;
- production tenant isolation;
- Queues or custom job infrastructure;
- separate database per module;
- direct D1 access from PO or Dev Workers;
- PO-only code outside PO Workflow Worker;
- Dev-only or GitHub code outside Dev Agent Worker;
- automatic PR merge, deployment, or rollback;
- Git CLI usage or repository cloning by the Dev Agent;
- arbitrary repository modification;
- running generated code in a sandbox;
- automated compilation or tests of generated wingman code;
- conversation browser, history search, archive, or export;
- cross-device or cross-tab Agent recovery;
- production-grade concurrency for multiple Dev Agents;
- text search over requests or tickets;
- voice input.

---

## 9. Free-Tier and Public-Access Guardrails

Because authentication is excluded and the UI is public:

- do not advertise the URL broadly before the demo;
- cap model steps and output tokens;
- validate and limit all input lengths;
- keep Workflow retries low;
- monitor Workers AI usage, Worker requests, D1 rows, Workflow steps, Durable Object duration, and Vectorize dimensions;
- provide a server-side feature flag or environment variable that can disable Wingman and Dev Agent model execution;
- return clear quota errors;
- clean demo data before recruiter sessions;
- disable the PO schedule outside active development or demo windows if empty scheduled runs are undesirable;
- rotate the GitHub token immediately if exposed.

Public access without authentication is an accepted temporary POC risk, not the final security model.

---

## 10. Final Demonstration Flow

1. Open the public UI Worker URL.
2. Show the Requests tab and create or view a request.
3. Use Wingman Agent for addition and subtraction.
4. Ask for multiplication and show the resulting pending request.
5. Create a similarly worded request.
6. Allow the PO Workflow to process the next batch.
7. Show one accepted ticket, duplicate linking, and PO logs.
8. Open Dev Agent and ask it to select the ticket.
9. Show restricted file inspection, source change, and PR creation.
10. Review and merge the PR manually.
11. Deploy Wingman Agent Worker manually.
12. Ask Dev Agent to verify the deployment.
13. Show the ticket and linked requests becoming `done`.
14. Ask Wingman Agent to multiply and show the newly deployed tool.

---

## 11. Final Decision

The project uses five Workers because each boundary has a clear ownership or deployment reason:

- UI Worker: public presentation and routing;
- Wingman Agent Worker: independently changed and deployed wingman runtime;
- Domain API Worker: centralized persistence and invariants;
- PO Workflow Worker: PO-only durable orchestration and semantic processing;
- Dev Agent Worker: Dev-only Agent, GitHub, and verification orchestration.

Phase 1 owns the repository bootstrap and the complete Domain API backend. It owns the root architecture and repo map files and also the domain api specific architecture and repo map files. Phases 2 through 4 add the Wingman Agent, PO Workflow, and Dev Agent backends in dependency order. Phase 5 creates the unified UI only after all backend contracts are stable. Cloudflare resources are created only in the phase that first needs them. Human prerequisites remain outside the implementation plan.

## Quick Improvements

- Add a search existing requests tool for wingman agent and typed rpc api capability in domain api service
- Add more of or entire of wingman agent under dev agent read write for more features change wingman agent to client agent

# Agentic Delivery Loop: Consolidated Design Decisions

## Purpose

This is the handoff record for generating and implementing the complete low-level design. It overrides conflicting statements in the earlier high-level plan and must be read with `AGENTS.md`.

## Product boundary

- Recruiter-facing Cloudflare-native POC, not a production multi-tenant platform.
- Five independently deployable Workers: UI, Domain API, Wingman Agent, PO Workflow, Dev Agent.
- One public origin: UI Worker. Other Workers have no public routes.
- No authentication, rate limiter, queues, automated merge/deploy/rollback, repository clone, code sandbox, or production-grade multi-agent concurrency.
- No unit, integration, component, end-to-end tests, test fixtures, Vitest setup, or test packages. Validate with typecheck, `cf:types`, local runs (`dev`) and manual smoke procedures. Wrangler `--dry-run` is not used.

## Communication

- Browser uses ordinary same-origin HTTP routes for domain screens and WebSocket agent routes on UI Worker. Browsers cannot directly use Worker Service Binding RPC.
- UI Worker uses typed Service Binding RPC for Domain API and forwards agent WebSocket requests through Service Bindings.
- Domain API exposes typed RPC only: no `fetch`, public API, or health endpoint.
- Wingman, PO and Dev Workers call Domain API only through typed RPC. Every Domain API method returns `RpcResult<T>` from `@agentic-delivery-loop/contracts`.
- Dev calls Wingman through a cross-Worker Durable Object namespace binding (`getAgentByName` then `invokeTurn`), not a Service Binding.

## Agent implementation

- Wingman and Dev are `AIChatAgent` classes, the higher-level Cloudflare Agent class chat preset backed by Durable Objects.
- Use Cloudflare's chat harness (`@cloudflare/ai-chat` with `agents`, `ai`, and `agents/models/ai-sdk`) for persistence, streaming, tool loop and resume behavior.
- Do not use Pi, Think, LangGraph, CrewAI or custom orchestration.
- Wingman model: `@cf/zai-org/glm-4.7-flash`, chosen as the small/fast chat and tool model. Maximum 5 steps and about 400 output tokens per model call.
- PO decision model: `@cf/meta/llama-4-scout-17b-16e-instruct`, small-to-medium and suitable for structured create/link decisions. About 500 output tokens.
- Dev model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, at least medium and function-calling capable. Maximum 15 steps and about 1,500 output tokens per model call.
- Embedding model: `@cf/baai/bge-base-en-v1.5`, 768 dimensions, cosine index. Use consistent `cls` pooling for both inserts and queries.
- Exact package versions come from one root dependency baseline established by a compatibility spike (root `docs/ARCHITECTURE.md` section 9.3). Modules never select versions independently. Never use floating versions.

## Limits

- Chat prompt: 1 to 100 characters after trimming.
- Feature request name: 1 to 50 characters.
- Feature request description: 1 to 1,000 characters.
- Ticket description: 1 to 1,000 characters.
- PO log message: 1 to 3,000 characters.
- GitHub text file: maximum 100 KiB.
- Wingman conversation context: preserve complete message/tool boundaries and prune to roughly ten recent complete messages.
- No enable/disable flags. Wingman, Dev and PO are enabled when deployed.

## Domain and pagination

- Page-based pagination, never cursor pagination. `PageResult<T>` is `{ items, page, pageSize, totalPages }`; no `total` crosses RPC or the browser.
- `PageRequest`: page >= 1; pageSize clamped per operation.
- Requests and Tickets default page size 5, maximum 50, oldest first.
- PO logs default page size 20, maximum 100, oldest first; UI opens the final page by default.
- Request statuses: `pending | accepted | in_progress | done`.
- Ticket statuses: `accepted | in_progress | done`.
- Ticket status update and linked-request status synchronization occur in one D1 transaction.

## Wingman behavior

- Tools have independent schemas and outputs. There is no common tool interface.
- `add` and `subtract` each accept exactly two finite numbers.
- Unsupported operations must not be calculated by the model.
- The agent discusses the missing capability conversationally, can gather details, and automatically creates a feature request when appropriate.
- Duplicate prevention is prompt guidance only. Unlimited requests are technically allowed.

## PO Workflow

- Five-minute schedule, at most five pending requests, sequential processing.
- Exactly one workflow execution may process at any time. No request claim columns, processing status, per-request locks, or duplicate-concurrency machinery.
- Use a scheduled handler so it can inspect one fixed active instance identifier before creating the next run. A direct binding schedule is not used because it would create another instance every interval.
- Each request is isolated with `try/catch`; Workflow step retry limit is zero; failure is logged and processing continues. Failed request remains pending for a future run.
- Query top three Vectorize candidates. The model may link only to a retrieved candidate.
- Vector record ID equals ticket ID. This is only the Vectorize record identifier. Embedding values come from normalized canonical request name plus description.
- One canonical vector per ticket. Duplicate requests add no vector.
- Matching is allowed against accepted, in-progress and done tickets. A newly linked request immediately inherits the ticket status.

## Dev Agent

- Acts only after a user prompt such as “start next ticket”; may discuss and ask for guidance.
- `startOldestAcceptedTicket()` selects and starts the oldest accepted ticket in one Domain transaction. No claim token, lease or multi-Dev-Agent safety.
- Branch from `main`; name `agent/ticket-<ticketId>`.
- GitHub token exists only in Dev Worker; fine-grained token scoped to one repository.
- GitHub file operations are restricted to `.ts` files under `apps/wingman-agent-worker/src/tools/`; reject absolute paths, traversal, binary content and files over 100 KiB.
- Prompt tells agent to create a tool and update the registry, but the exact two-file rule is not deterministically enforced. Any valid `.ts` file in the allowed directory can be read or written.
- Agent creates PR then pauses for human review, merge and manual Wingman deployment.
- Verification starts a fresh Wingman conversation through `invokeTurn({ prompt })`, receives `{ responseMessage, toolCalls }`, and Dev checks whether `toolCalls` contains the expected tool name. Wingman never receives the expected tool name. Dev decides success and completes the ticket.

## UI

- React, TypeScript, Vite and CSS Modules. No component framework and no global state library.
- A single shell uses query routing such as `/?tab=requests`; browser history preserves tab state without React Router.
- Tabs: Requests, Wingman, Tickets, PO Logs, Dev Agent.
- Domain lists are read-only. Wingman and Dev conversation IDs are both stored in `localStorage`; refresh reconnects.

## Repository documentation

Root and every Worker have `ARCHITECTURE.md` and `REPO_MAP.md`. Architecture documents explain responsibilities, control/data flow, boundaries, invariants and forbidden behavior. Repo maps inventory planned files and their major exports/signatures.
