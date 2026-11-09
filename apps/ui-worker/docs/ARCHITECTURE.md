# UI Worker Architecture

## 1. Purpose

The UI Worker is the only public origin for the application. It serves the React single-page application, exposes a small same-origin HTTP facade for read-only domain data, and transparently forwards browser connections to the private Wingman and Dev Agent Workers.

This document and `REPO_MAP.md` form the implementation LLD for the UI portion of the application. The root docs (`docs/ARCHITECTURE.md`, `docs/REPO_MAP.md`) win on repository-wide matters; this document wins for UI behavior and UI-owned integration contracts.

## 2. Recruiter requirements mapping

The recruiter asks for an AI-powered application containing an LLM, coordination, user input, and memory or state. This application satisfies those requirements as follows:

| Requirement              | Implementation                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| LLM                      | Workers AI models called by Wingman, PO, and Dev Agent Workers                                |
| Workflow or coordination | Cloudflare Workflows, Workers, and Durable Object-backed Agents                               |
| User input               | React chat interfaces using `useAgent` and `useAgentChat`                                     |
| Memory or state          | `AIChatAgent` message persistence, Agent state, and locally persisted active conversation IDs |

A separate Cloudflare Pages project is not used. The React and Vite build is deployed with the UI Worker through Cloudflare Workers Static Assets. This keeps one public origin and allows the same deployment to serve assets, HTTP facade routes, and Agent proxy routes.

## 3. Scope

### 3.1 Responsibilities

The UI Worker owns:

- React, TypeScript, Vite, and CSS Modules frontend.
- Query-string tab navigation.
- Read-only Requests, Tickets, and PO Logs screens.
- Wingman and Dev Agent chat screens.
- Browser-facing `/api/*` JSON routes.
- Typed Domain API Service Binding RPC invocation.
- Transparent Agent request forwarding through Service Bindings.
- Browser-safe error normalization.
- Basic structured JSON error logging.
- Active Agent conversation ID persistence in `localStorage`.
- Rendering Dev Agent synchronized state.

### 3.2 Explicit exclusions

The UI Worker must not contain:

- D1 queries, migrations, transactions, or domain persistence.
- Workers AI model calls or prompts.
- Feature request creation logic outside Wingman chat.
- Request or ticket status-transition logic.
- PO matching, scheduling, workflow coordination, or Vectorize logic.
- GitHub API calls, repository file operations, branch creation, or PR creation.
- Verification decisions or invocation of Wingman's programmatic `invokeTurn()` RPC.
- Authentication, authorization, rate limiting, or multi-tenant behavior.
- A separate Cloudflare Pages deployment.
- React Router, Redux, Zustand, TanStack Query, or a component framework.
- Automated unit, component, integration, or end-to-end tests.
- Mobile or tablet layouts.
- Full WCAG compliance work beyond straightforward semantic HTML.
- Automatic polling or background data refresh.
- Sophisticated request cancellation or stale-response coordination.

## 4. Deployment topology

```text
Browser
  |
  | HTTPS and WebSocket, one public origin
  v
UI Worker
  |-- Static Assets --> React/Vite application
  |-- Service Binding RPC --> Domain API Worker
  |-- Service Binding fetch --> Wingman Agent Worker
  `-- Service Binding fetch --> Dev Agent Worker
```

Only the UI Worker has a public route. Domain API, Wingman Agent, and Dev Agent Workers remain private and are reachable only through Service Bindings.

Expected UI Worker bindings:

| Binding         | Kind                     | Target Worker                         | Type               | Use                                |
| --------------- | ------------------------ | ------------------------------------- | ------------------ | ---------------------------------- |
| `ASSETS`        | Static Assets            | —                                     | `Fetcher`          | React build and SPA fallback       |
| `DOMAIN_API`    | Service Binding (RPC)    | `agentic-delivery-loop-domain-api`    | Wrangler-generated | Typed Domain API RPC               |
| `WINGMAN_AGENT` | Ordinary Service Binding | `agentic-delivery-loop-wingman-agent` | `Fetcher`          | Browser fetch/WebSocket forwarding |
| `DEV_AGENT`     | Ordinary Service Binding | `agentic-delivery-loop-dev-agent`     | `Fetcher`          | Browser fetch/WebSocket forwarding |

The UI Worker is deployed as `agentic-delivery-loop-ui`. Equivalent Wrangler configuration:

```jsonc
{
  "name": "agentic-delivery-loop-ui",
  "services": [
    { "binding": "DOMAIN_API", "service": "agentic-delivery-loop-domain-api" },
    { "binding": "WINGMAN_AGENT", "service": "agentic-delivery-loop-wingman-agent" },
    { "binding": "DEV_AGENT", "service": "agentic-delivery-loop-dev-agent" },
  ],
}
```

`WINGMAN_AGENT` and `DEV_AGENT` are ordinary Service Bindings typed as `Fetcher`. They are not Durable Object namespace bindings, and the UI Worker never calls Agent RPC methods through them.

There is no hand-written Domain API service interface. The `Env` type, including the `DOMAIN_API` type, comes from `worker-configuration.d.ts` generated by `wrangler types` with the UI, Domain API, Wingman, and Dev Agent configurations supplied (the UI `cf:types` script). The UI Worker must not import Domain API source files, and the coding agent must not replace typed RPC with browser-style `fetch()` calls to the Domain API Worker.

Domain API methods used (authoritative signatures come from the generated binding type; DTO and input types are imported from `@agentic-delivery-loop/contracts`):

| Method                                   | Returns                                             |
| ---------------------------------------- | --------------------------------------------------- |
| `listRequests(input: ListRequestsInput)` | `Promise<RpcResult<PageResult<FeatureRequestDto>>>` |
| `listTickets(input: ListTicketsInput)`   | `Promise<RpcResult<PageResult<TicketDto>>>`         |
| `listPoLogs(input: ListPoLogsInput)`     | `Promise<RpcResult<PageResult<PoLogDto>>>`          |

## 5. Static assets and Worker routing

The Vite React build is deployed as Worker Static Assets. The Wrangler configuration must express the equivalent of:

```jsonc
{
  "assets": {
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*", "/agents/*"],
  },
}
```

If the selected Cloudflare Vite plugin version generates some asset configuration, preserve the same behavior rather than duplicating incompatible fields.

Routing priority:

1. `/api/*` is handled by the Hono API application.
2. `/agents/*` is handled by the top-level Worker entrypoint and forwarded to an Agent Worker.
3. Static files are served by Cloudflare Static Assets.
4. Non-file browser navigation falls back to `index.html` through SPA fallback.
5. API and Agent paths must never fall back to `index.html`.

Hono handles `/api/*` only. It must not own Agent WebSocket proxying or general SPA fallback.

## 6. Client-side tab routing

The application has five tabs:

```ts
type AppTab = 'requests' | 'wingman' | 'tickets' | 'po-logs' | 'dev-agent';
```

URL shape:

```text
/?tab=requests
/?tab=wingman
/?tab=tickets
/?tab=po-logs
/?tab=dev-agent
```

Rules:

- `requests` is the default tab.
- A missing `tab` parameter resolves to `requests`.
- An unknown value resolves to `requests`.
- Invalid or missing values are canonicalized with `history.replaceState`.
- User tab changes use `history.pushState`.
- `popstate` updates the selected tab for Back and Forward navigation.
- React Router is not installed.
- Pages may unmount when inactive. Agent identity is restored from `localStorage` when a chat page remounts.

## 7. Browser HTTP facade

### 7.1 Routes

```text
GET /api/requests?page=<positive-integer>&status=<optional-request-status>
GET /api/tickets?page=<positive-integer>&status=<optional-ticket-status>
GET /api/po-logs?page=<positive-integer>
```

The browser never sends `pageSize`.

The UI Worker supplies fixed page sizes when invoking Domain API RPC:

| Resource | Page size | Order        |
| -------- | --------: | ------------ |
| Requests |         5 | oldest first |
| Tickets  |         5 | oldest first |
| PO logs  |        20 | oldest first |

An absent `status` parameter means all statuses. There is no `status=all` value.

The POC assumes the UI generates valid query values. The UI Worker passes page and optional status to the typed Domain RPC and relies on the Domain API for authoritative validation.

Every Domain RPC call returns `RpcResult<T>` (imported from `@agentic-delivery-loop/contracts`). The UI gateway inspects the result:

- `ok: true` — return `result.data` to the browser as JSON.
- `ok: false` — log `result.error.code` and `result.error.message`, and return the browser-safe error DTO with HTTP `502` and `code: "UPSTREAM_ERROR"` (section 7.4). Domain error messages and field errors are not forwarded to the browser.
- A thrown RPC exception (binding or transport failure) is handled the same way as `ok: false`.

### 7.2 Shared page contract

For reference, imported from `@agentic-delivery-loop/contracts`:

```ts
export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalPages: number;
}
```

The facade passes `items`, `page`, `pageSize`, and `totalPages` through unchanged. Browser-facing page DTOs carry no item-count field. An out-of-range page returns an empty `items` array with the correctly calculated `totalPages`.

### 7.3 DTO contracts

For reference, imported from `@agentic-delivery-loop/contracts` (the UI does not redefine them):

```ts
export type RequestStatus = 'pending' | 'accepted' | 'in_progress' | 'done';

export type TicketStatus = 'accepted' | 'in_progress' | 'done';

export interface FeatureRequestDto {
  id: string;
  name: string;
  description: string;
  status: RequestStatus;
  linkedTicketId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDto {
  id: string;
  name: string;
  description: string;
  status: TicketStatus;
  pullRequestUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PoLogDto {
  id: string;
  message: string;
  createdAt: string;
}
```

Timestamps are ISO 8601 strings supplied by Domain API.

### 7.4 Browser-safe errors

All failed facade responses use:

```ts
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
```

`code` is an open string. The UI Worker normally emits only the conventional values `UPSTREAM_ERROR` and `INTERNAL_ERROR`.

Rules:

- Domain RPC failures (`ok: false` or a thrown RPC exception) return a sanitized `502` response with `code: "UPSTREAM_ERROR"`.
- Unexpected failures return a sanitized `500` response with `code: "INTERNAL_ERROR"`.
- No RPC exception text, stack trace, binding name, SQL detail, Durable Object detail, or internal Worker location is returned to the browser.
- The browser message is concise and actionable, for example `Unable to load requests. Try again.`

The POC does not require a large error taxonomy.

### 7.5 Structured logs

The UI Worker records simple JSON-serializable error objects with `console.error` so they appear in Cloudflare Worker logs and Observability.

Example:

```ts
console.error({
  event: 'domain_rpc_failed',
  route: '/api/requests',
  operation: 'listRequests',
  page,
  status,
  rpcErrorCode,
  errorName,
  message,
  timestamp: new Date().toISOString(),
});
```

Logs must not include secrets, authorization values, entire chat messages, full tool bodies, or raw user conversations.

## 8. Agent proxy architecture

### 8.1 Public routes

```text
/agents/wingman-agent/{conversationId}
/agents/dev-agent/{conversationId}
```

Expected client identities:

```ts
useAgent({ agent: 'WingmanAgent', name: conversationId });
useAgent({ agent: 'DevAgent', name: conversationId });
```

The route segment and Agent binding/class naming must remain compatible with the `agents` package version fixed by the root dependency baseline.

### 8.2 Forwarding behavior

Route mapping:

| Public path prefix       | Service Binding |
| ------------------------ | --------------- |
| `/agents/wingman-agent/` | `WINGMAN_AGENT` |
| `/agents/dev-agent/`     | `DEV_AGENT`     |

The UI Worker forwards the original `Request` with the selected ordinary Service Binding's (`Fetcher`) `fetch` method.

The proxy must:

- Preserve method, headers, body, query string, and request signal.
- Preserve WebSocket upgrade semantics.
- Return the upstream `Response` directly.
- Preserve streaming and resumable chat behavior.
- Avoid reading or buffering response bodies.

The proxy must not:

- Parse Agent protocol frames.
- create a new `WebSocketPair`.
- translate Agent traffic into REST.
- remove upgrade-related headers.
- rewrite chat messages.
- execute tools.

Unknown `/agents/*` paths return a small `404` response and do not fall through to assets.

## 9. Conversation identity and lifecycle

### 9.1 Storage keys

```ts
const WINGMAN_CONVERSATION_ID_KEY = 'agentic-delivery-loop.wingman.conversation-id';

const DEV_AGENT_CONVERSATION_ID_KEY = 'agentic-delivery-loop.dev-agent.conversation-id';
```

### 9.2 Initialization

Each chat feature uses the same algorithm:

1. Read its key from `localStorage` during lazy state initialization.
2. If a non-empty ID exists, use it.
3. Otherwise generate `crypto.randomUUID()` and write it to `localStorage`.
4. Pass the ID as the Agent instance `name`.

Only conversation IDs are stored locally. Messages and Agent state are not copied into browser storage.

Consequences:

- Switching tabs and returning reconnects to the same conversation.
- Refreshing reconnects to the same conversation.
- A newly opened browser tab reads the existing active ID and loads that conversation.
- Existing open tabs are not required to listen for the browser `storage` event.
- If another tab changes the ID, an already-mounted tab may continue its current connection until refresh or remount.

### 9.3 New conversation action

Both Wingman and Dev Agent have a new-conversation action. The action requires confirmation.

Confirmation meaning:

- The old server-side conversation is not deleted.
- The browser switches its active stored ID to a new UUID.
- The visible chat changes to the new Agent instance.

Implementation sequence:

1. Show a native or small application confirmation dialog.
2. On cancel, change nothing.
3. On confirm, generate a UUID.
4. Replace the feature's `localStorage` value.
5. Replace React state.
6. Remount the isolated chat connection using a React `key` based on the ID.

Suggested message:

```text
Start a new conversation?

The current conversation will remain stored by the Agent, but this browser will switch to a new conversation.
```

## 10. React state strategy

- Use feature-local `useState`, `useEffect`, and small custom hooks.
- Do not add a global state library.
- Do not add a server-cache library.
- A shared page-loading hook may remove repeated loading and error code.
- Each list screen owns its page, filter, loading, result, and error state.
- Each chat feature owns its conversation ID and Chat Agent hooks.
- Dev Agent state arrives through `useAgent({ onStateUpdate })`.

No periodic refresh occurs. Data loads on initial screen mount and on explicit page or filter changes. A failed load exposes a Retry action.

## 11. Requests screen

Initial state:

```ts
page = 1;
status = undefined;
```

Filter options:

```text
Filter by status
pending
accepted
in_progress
done
```

There is no visible `All` option. The placeholder or cleared selection means no status query, which shows all requests.

Behavior:

- Load five requests, oldest first.
- A filter change resets `page` to 1 and loads the selected status.
- Cards show name, description, status, linked ticket ID, created time, and updated time.
- `linkedTicketId` is plain text, not navigation.
- Null linked ticket displays `Not linked`.
- Empty results display a clear empty state.
- Load failure displays a concise error and Retry button.
- No create form exists. Creation happens through Wingman.

## 12. Tickets screen

Initial state:

```ts
page = 1;
status = undefined;
```

Filter options:

```text
Filter by status
accepted
in_progress
done
```

Behavior:

- Load five tickets, oldest first.
- A filter change resets `page` to 1.
- Cards show name, description, status, PR state, created time, and updated time.
- A PR URL opens in a new tab with `target="_blank"` and `rel="noopener noreferrer"`.
- Null PR URL displays `No pull request yet`.
- Empty and error states follow the same pattern as Requests.

## 13. PO Logs screen

Initial state:

```ts
page = 1;
```

Behavior:

- Fetch page 1 directly. Do not query total count first.
- Load twenty entries per page.
- Domain ordering and visual ordering are oldest to newest.
- Each row shows the message and localized created time.
- The user controls navigation to later pages.

Pagination controls:

- First.
- Previous.
- Current page and total pages.
- Next.
- Last.
- Numeric page input.
- Jump button.

Control behavior:

- First and Previous are disabled on page 1.
- Next and Last are disabled on `totalPages`.
- Jump accepts an integer between 1 and `totalPages`.
- An empty result with `totalPages === 0` renders the empty state and disables navigation.
- The component must not request page zero or a page above the known `totalPages`.
- Page information shows only the current page and total pages (for example `Page 2 of 7`); no item counts or "showing X–Y of N" text.

## 14. Shared pagination

Requests and Tickets use First, Previous, current-page information, Next, and Last. PO Logs additionally expose the numeric jump form.

The component is controlled:

```ts
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange(page: number): void;
  showJump?: boolean;
  disabled?: boolean;
}
```

Pagination does not own remote loading. It only emits valid target pages.

## 15. Timestamp rendering

Use a shared timestamp component:

```tsx
<time dateTime={isoValue} title={isoValue}>
  {formattedValue}
</time>
```

Formatting uses `Intl.DateTimeFormat` with the browser locale. Do not hard-code Kolkata, UTC display, or another timezone. If parsing fails, render the original string rather than crashing the screen.

## 16. Chat behavior

### 16.1 Common chat rules

Both chat screens use Cloudflare's React Agent hooks and the pinned package-compatible APIs:

```ts
useAgent(...)
useAgentChat(...)
```

Composer rules:

- Trim input before validation and submission.
- Length after trimming must be 1 to 100 characters for Wingman and 1 to 1,000 characters for Dev Agent (Dev needs room for pasted PR review comments). The limit is a composer prop, not a shared constant.
- The composer is enabled only when the hook is ready for a new turn.
- Disable the composer and submit action while submitted or streaming.
- Ignore duplicate submissions during an active turn.
- Clear the input only after the hook accepts submission.
- No Stop button.
- No automatic retry.
- After an error, display the error and permit a new manual message.

### 16.2 Message rendering

Supported visible content:

- User text.
- Assistant text.
- Recognized server-side tool activity.
- Recognized verification evidence in Dev Agent state.

The UI does not implement client-side tools or approval-gated tools.

Unknown message and tool parts are ignored silently. Never render an arbitrary part with `JSON.stringify`.

### 16.3 Tool activity

Recognized server tool parts appear in message order and show:

- Human-readable tool name.
- Execution phase or state.
- Concise sanitized input summary.
- Concise output summary.
- Error message where present.

Tool rendering must tolerate partial streaming states and missing optional fields. It must not attempt to execute a tool or infer success beyond the part's explicit state.

## 17. Wingman screen

- Connect to `WingmanAgent` using the stored Wingman conversation ID.
- Display persisted and streamed messages through `useAgentChat`.
- Show recognized tool activity inline in execution order.
- Provide `New Chat`, with confirmation.
- Do not expose a feature-request creation form.
- Do not calculate unsupported operations in the UI.
- Do not invoke Wingman's programmatic `invokeTurn()` RPC from the browser.

## 18. Dev Agent screen

- Connect to `DevAgent` using the stored Dev Agent conversation ID.
- Render chat with the common chat behavior.
- Provide `New Conversation`, with confirmation.
- Render a read-only Dev state panel from synchronized Agent state.
- Do not call GitHub directly.
- Do not decide whether verification succeeded.

### 18.1 State contracts

```ts
export type DevLifecycleStatus =
  | 'idle' // no active ticket
  | 'ticket_started' // ticket in progress, no branch yet
  | 'branch_ready' // branch exists, implementing
  | 'pr_open' // PR raised, awaiting human review/merge
  | 'pr_merged'; // merge confirmed, verification allowed

export interface ActiveTicketSummary {
  id: string;
  name: string;
  description: string;
  status: 'in_progress';
}

export interface PullRequestSummary {
  number: number;
  url: string;
  branch: string;
  baseBranch: string;
}

export interface DevAgentErrorState {
  phase: 'implementation' | 'pull_request' | 'verification';
  code: string;
  message: string;
  occurredAt: string;
}

// For reference, imported from @agentic-delivery-loop/contracts
// (packages/contracts/src/agent-events.ts); not redefined by the UI.
export interface WingmanVerificationResult {
  verified: boolean;
  expectedToolName: string;
  wingmanResponse: UIMessage;
  toolsCalled: Array<{ toolName: string }>;
}

export interface DevAgentState {
  status: DevLifecycleStatus;
  activeTicket: ActiveTicketSummary | null;
  branch: string | null;
  pullRequest: PullRequestSummary | null;
  expectedToolName: string | null;
  lastVerification: WingmanVerificationResult | null;
  lastError: DevAgentErrorState | null;
}
```

`WingmanVerificationResult` is imported from `@agentic-delivery-loop/contracts` (`packages/contracts/src/agent-events.ts`, which uses a type-only `import type { UIMessage } from "ai"`). `UIMessage` comes from `ai`. The UI must not create a conflicting duplicate of either type.

Initial state:

```ts
export const INITIAL_DEV_AGENT_STATE: DevAgentState = {
  status: 'idle',
  activeTicket: null,
  branch: null,
  pullRequest: null,
  expectedToolName: null,
  lastVerification: null,
  lastError: null,
};
```

State is persisted by the Agent state API and synchronized to connected clients. No custom `getPublicState()` RPC method or browser HTTP endpoint is created.

### 18.2 State panel presentation

The panel conditionally displays:

- Lifecycle status, shown with a readable label: `idle` "No active ticket", `ticket_started` "Ticket started", `branch_ready` "Implementing", `pr_open` "PR open, awaiting review", `pr_merged` "PR merged, ready to verify". The UI only maps labels and never infers transitions.
- Active ticket name, ID, description, and in-progress status.
- Branch.
- PR number, branch, base branch, and external link.
- Expected tool name during active work.
- Last verification result.
- Last Agent error.

For `lastVerification`:

- Use `verified` as the displayed success or failure result.
- Show `expectedToolName`.
- Render recognized content from `wingmanResponse` with the shared safe message renderer.
- Render `toolsCalled` (`Array<{ toolName: string }>`) with a dedicated structured verification list showing each `toolName`.
- Do not recompute `verified`.
- Do not expose raw JSON.

`DevAgentState.expectedToolName` represents current lifecycle state. `lastVerification.expectedToolName` represents the completed verification record. The UI must not assume they are both populated or equal at every moment.

## 19. Visual and layout constraints

The application is intended for demonstration on a laptop browser.

- Use a stable desktop layout.
- No responsive breakpoint system is required.
- No mobile or tablet optimization is required.
- CSS Modules own feature styles.
- `tokens.css` contains shared color, spacing, typography, radius, and status variables.
- `global.css` contains reset and document-wide styles.
- Status must include readable text, even though full accessibility work is out of scope.
- Avoid dependencies on a component framework.

## 20. Loading, empty, and error states

Each remote-data feature must distinguish:

```ts
type AsyncViewState =
  { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'empty' } | { kind: 'ready' };
```

Exact implementation may use ordinary booleans instead of this union, but the visible states must remain distinct.

- Initial load shows a loading state.
- Empty result shows feature-specific empty copy.
- Error shows a sanitized message and Retry.
- Retry repeats only the current request.
- Existing content need not be retained while a new page loads.
- No automatic refresh occurs.

## 21. Dependency and version policy

Uses the exact versions from the root dependency baseline (`docs/ARCHITECTURE.md` → Dependency baseline, root `pnpm.overrides`, committed `pnpm-lock.yaml`). Module implementations must not independently select or change versions.

The UI Worker depends on:

- `@agentic-delivery-loop/contracts` (`workspace:*`).
- `react` and `react-dom`.
- `vite`.
- Cloudflare Vite plugin if used.
- `wrangler`.
- `hono`.
- `agents`.
- `@cloudflare/ai-chat`.
- AI SDK packages required by shared `UIMessage` types.
- TypeScript dependencies already selected by the monorepo.

Do not use floating package ranges (`^`, `~`, `latest`, `*`). The coding agent must verify actual exports against the baseline package versions rather than relying on outdated examples.

## 22. Validation and smoke testing

No automated tests or test framework are added.

Validation is typecheck, `cf:types`, local run, and manual smoke validation:

- TypeScript typecheck (`typecheck`).
- Cloudflare type generation (`cf:types`).
- Vite production build (`build`).
- Local run (`dev`).
- Manual smoke validation with `UI_SMOKE_TEST.md`.

A concise `UI_SMOKE_TEST.md` is included because it is inexpensive and useful locally and after `wrangler deploy`. It verifies:

1. React assets and SPA fallback.
2. All five query-routed tabs.
3. Browser Back and Forward tab behavior.
4. Requests filter, page loading, empty state, and Retry.
5. Tickets filter, page loading, PR link, and null PR copy.
6. PO Logs starting at page 1 and all pagination controls.
7. Localized timestamps.
8. Wingman stored conversation reconnection.
9. Dev Agent stored conversation reconnection.
10. New-conversation confirmation and ID replacement.
11. Chat streaming and disabled composer during an active turn.
12. Server tool activity rendering.
13. Dev Agent state synchronization and verification display.
14. Sanitized browser errors and structured deployed Worker logs.

## 23. Core invariants

The coding agent must preserve these invariants:

1. UI Worker is the only public origin.
2. Domain API access uses typed Service Binding RPC.
3. Agent traffic is transparently forwarded through Service Binding `fetch`.
4. UI Worker never interprets Agent wire protocol or executes tools.
5. Hono owns only `/api/*`.
6. Static Assets owns static files and SPA fallback.
7. API and Agent errors never fall through to `index.html`.
8. Browser stores only active conversation IDs, not conversation messages or Agent state.
9. Both conversations persist through tab changes, refreshes, and newly opened browser tabs.
10. Starting a fresh conversation always requires confirmation.
11. Domain list screens are read-only.
12. No automatic polling occurs.
13. Dev state is received through Agent state synchronization, not a custom RPC or HTTP route.
14. UI displays verification evidence but does not make the verification decision.
15. No new backend capability may be invented solely to simplify the UI.

## 24. Authoritative Cloudflare references

Implementation should be checked against the pinned versions and current official documentation:

- https://agents.cloudflare.com/
- https://developers.cloudflare.com/agents/
- https://developers.cloudflare.com/agents/communication-channels/chat/chat-agents/
- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/
