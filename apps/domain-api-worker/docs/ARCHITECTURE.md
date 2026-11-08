# Domain API Worker Architecture

## 1. Document purpose

This document is the detailed low-level architecture for `apps/domain-api-worker`. It is intended to be used together with `docs/REPO_MAP.md` by a coding agent.

This document is authoritative for the Domain API Worker. If an older plan or document conflicts with this document, this document wins for the Domain API Worker.

## 2. Scope

The Domain API Worker is the private system of record for:

- feature requests;
- tickets;
- PO workflow logs.

It owns:

- D1 schema and migrations;
- the implementation of the typed RPC contracts owned by `@agentic-delivery-loop/contracts`;
- input validation;
- domain invariants;
- status transitions;
- atomic multi-table writes;
- persistence and row-to-DTO mapping;
- deterministic pagination;
- normalized serializable errors.

It does not own:

- public HTTP APIs;
- `fetch()` routing;
- browser communication;
- authentication or authorization;
- Workers AI or model invocation;
- prompts or structured model output;
- Agents SDK or Durable Object agent state;
- Workflows scheduling or singleton-execution control;
- Vectorize queries, embeddings, upserts, or indexing waits;
- GitHub calls;
- WebSockets;
- UI state;
- automated tests.

The Worker is reachable only through Cloudflare Service Binding RPC. It has no public route and no public domain.

## 3. Runtime and entrypoint

The Worker exports one `WorkerEntrypoint<Env>` subclass as its default export.

```ts
export default class DomainApi extends WorkerEntrypoint<Env> {
  // Typed RPC methods only.
}
```

The Worker must not implement a `fetch()` handler. All RPC methods return a serializable `RpcResult<T>` rather than allowing domain or database exceptions to cross the RPC boundary.

## 4. Layering

```text
Service Binding RPC caller
        |
        v
DomainApi WorkerEntrypoint
        |
        v
Module RPC adapter
        |
        v
Domain service
        |
        v
Repository
        |
        v
Cloudflare D1
```

### 4.1 RPC entrypoint

The entrypoint:

- exposes only the approved public RPC methods;
- delegates to module RPC adapters;
- contains no SQL or domain transition logic;
- wraps operations with normalized RPC error handling.

### 4.2 Module RPC adapters

An RPC adapter:

- validates the complete external input with the module schema;
- calls the service;
- converts thrown application errors into `RpcResult<T>`;
- never exposes SQL, stack traces, binding details, or raw exceptions.

### 4.3 Services

Services own:

- business validation not expressible by field schemas;
- record existence checks;
- allowed status transitions;
- timestamps and UUID generation;
- orchestration of repositories;
- interpretation of affected-row results;
- conversion of rows to DTOs.

Services do not contain SQL.

### 4.4 Repositories

Repositories own:

- SQL statements;
- prepared-statement binding;
- D1 `batch()` operations;
- deterministic ordering;
- count queries;
- affected-row checks;
- database row types and row mapping.

Repositories do not decide whether a business transition is conceptually allowed. They enforce expected-state predicates supplied by services so stale writes cannot silently overwrite current state.

## 5. Data model

## 5.1 Feature requests

```sql
CREATE TABLE feature_requests (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 50),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 1000),
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'accepted', 'in_progress', 'done')
  ),
  linked_ticket_id TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (linked_ticket_id) REFERENCES tickets(id)
);
```

Rules:

- IDs are generated with `crypto.randomUUID()`.
- A new request starts as `pending`.
- A new request starts with `linked_ticket_id = NULL`.
- A request can reference at most one ticket.
- Request name is trimmed and has 1 to 50 characters.
- Request description is trimmed and has 1 to 1000 characters.
- Timestamps are UTC ISO-8601 strings generated with `new Date().toISOString()`.

## 5.2 Tickets

```sql
CREATE TABLE tickets (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 50),
  description TEXT NOT NULL CHECK (length(description) BETWEEN 1 AND 1000),
  status TEXT NOT NULL CHECK (
    status IN ('accepted', 'in_progress', 'done')
  ),
  pull_request_url TEXT NULL CHECK (
    pull_request_url IS NULL OR length(pull_request_url) BETWEEN 1 AND 200
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

`pull_request_url` is retained as the column name for compatibility with the domain language, but the Domain API treats it as a trimmed opaque string. It does not parse the value or validate HTTP, HTTPS, GitHub, repository, branch, or pull-request semantics.

Rules:

- IDs are generated with `crypto.randomUUID()`.
- A new ticket starts as `accepted`.
- Ticket name is trimmed and has 1 to 50 characters.
- Ticket description is trimmed and has 1 to 1,000 characters.
- The pull-request string, when supplied, is trimmed and has 1 to 200 characters.
- Saving the pull-request string again replaces the previous value.
- Completion does not require a pull-request value.

## 5.3 PO logs

```sql
CREATE TABLE po_logs (
  id TEXT PRIMARY KEY NOT NULL,
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 3000),
  created_at TEXT NOT NULL
);
```

Rules:

- PO logs are append-only.
- Messages are trimmed and have 1 to 3000 characters.
- Logs must not contain secrets, complete prompts, chain-of-thought, hidden reasoning, embeddings, tokens, or raw binding errors.
- The expected PO caller always supplies a non-empty message. The schema still prevents invalid empty persisted rows.

## 5.4 Indexes

```sql
CREATE INDEX idx_feature_requests_status_created
ON feature_requests(status, created_at, id);

CREATE INDEX idx_feature_requests_linked_ticket
ON feature_requests(linked_ticket_id);

CREATE INDEX idx_tickets_status_created
ON tickets(status, created_at, id);

CREATE INDEX idx_po_logs_created
ON po_logs(created_at, id);
```

Purposes:

- `idx_feature_requests_status_created`: filtered oldest-first request listing, especially the five oldest pending requests used by the PO Workflow.
- `idx_feature_requests_linked_ticket`: synchronization of every request linked to a ticket.
- `idx_tickets_status_created`: deterministic selection of the oldest accepted ticket and filtered ticket listing.
- `idx_po_logs_created`: deterministic oldest-first PO-log pagination.

No speculative indexes are added.

## 6. Status model

Status types are owned by `@agentic-delivery-loop/contracts`. They are shown here for reference; the Domain API imports them and does not redefine them.

### 6.1 Request statuses

```ts
type RequestStatus = 'pending' | 'accepted' | 'in_progress' | 'done';
```

Normal lifecycle:

```text
pending -> accepted -> in_progress -> done
```

Linking a pending request to an existing ticket copies the ticket's current status. Therefore these direct transitions are intentionally valid:

```text
pending -> accepted
pending -> in_progress
pending -> done
```

No backward request transition is allowed. There is no general request-patch operation.

### 6.2 Ticket statuses

```ts
type TicketStatus = 'accepted' | 'in_progress' | 'done';
```

Allowed lifecycle:

```text
accepted -> in_progress -> done
```

No transition can skip backwards. Ticket state changes occur only through purpose-specific operations.

## 7. Approved RPC surface

```ts
export default class DomainApi extends WorkerEntrypoint<Env> {
  createRequest(input: CreateRequestInput): Promise<RpcResult<FeatureRequestDto>>;

  getRequest(input: GetRequestInput): Promise<RpcResult<FeatureRequestDto>>;

  listRequests(input: ListRequestsInput): Promise<RpcResult<PageResult<FeatureRequestDto>>>;

  getTicket(input: GetTicketInput): Promise<RpcResult<TicketDto>>;

  listTickets(input: ListTicketsInput): Promise<RpcResult<PageResult<TicketDto>>>;

  createTicketAndLinkRequest(
    input: CreateTicketAndLinkRequestInput,
  ): Promise<RpcResult<CreateTicketAndLinkRequestResult>>;

  linkRequestToTicket(
    input: LinkRequestToTicketInput,
  ): Promise<RpcResult<LinkRequestToTicketResult>>;

  startOldestAcceptedTicket(): Promise<RpcResult<TicketDto | null>>;

  saveTicketPullRequestUrl(input: SaveTicketPullRequestUrlInput): Promise<RpcResult<TicketDto>>;

  completeTicket(input: CompleteTicketInput): Promise<RpcResult<TicketDto>>;

  appendPoLog(input: AppendPoLogInput): Promise<RpcResult<PoLogDto>>;

  listPoLogs(input: ListPoLogsInput): Promise<RpcResult<PageResult<PoLogDto>>>;
}
```

Explicitly excluded RPC methods:

- `patchRequest`;
- `patchTicket`;
- delete operations;
- raw SQL or generic query operations;
- Vectorize operations;
- model operations;
- health endpoint;
- public fetch endpoint.

## 8. RPC data contracts

All envelope, DTO, input, result, and pagination types in this section are owned by `@agentic-delivery-loop/contracts` (`RpcResult<T>` lives in `packages/contracts/src/rpc.ts`). They are shown here for reference only. The Domain API imports and implements them; it does not define local copies.

Envelope (imported from contracts):

```ts
export interface RpcError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export type RpcResult<T> = { ok: true; data: T } | { ok: false; error: RpcError };
```

`code` is an open `string`. The conventional values emitted by the Domain API are listed in section 12.

DTOs (imported from contracts):

```ts
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

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalPages: number;
}
```

The public `PageResult<T>` has no `total` or `totalItems` field. The item count is internal to repositories and services (see section 13).

Inputs (imported from contracts):

```ts
export interface CreateRequestInput {
  name: string;
  description: string;
}

export interface GetRequestInput {
  requestId: string;
}

export interface ListRequestsInput {
  page?: number;
  pageSize?: number;
  status?: RequestStatus;
}

export interface GetTicketInput {
  ticketId: string;
}

export interface ListTicketsInput {
  page?: number;
  pageSize?: number;
  status?: TicketStatus;
}

export interface CreateTicketAndLinkRequestInput {
  requestId: string;
  ticketName: string;
  ticketDescription: string;
}

export interface CreateTicketAndLinkRequestResult {
  ticket: TicketDto;
  request: FeatureRequestDto;
}

export interface LinkRequestToTicketInput {
  requestId: string;
  ticketId: string;
}

export interface LinkRequestToTicketResult {
  ticket: TicketDto;
  request: FeatureRequestDto;
}

export interface SaveTicketPullRequestUrlInput {
  ticketId: string;
  pullRequestUrl: string;
}

export interface CompleteTicketInput {
  ticketId: string;
}

export interface AppendPoLogInput {
  message: string;
}

export interface ListPoLogsInput {
  page?: number;
  pageSize?: number;
}
```

## 9. Validation and normalization

Use Zod schemas at RPC boundaries.

### 9.1 General rules

- Trim all user/model-provided strings before validating length.
- Reject non-string values rather than coercing them.
- UUID identifiers must be non-empty valid UUID strings.
- Reject unknown object keys with strict schemas.
- Reject `NaN`, infinity, fractional pages, fractional page sizes, and non-number pagination values.
- `page` defaults to 1 and must be an integer greater than or equal to 1.
- Request/ticket `pageSize` defaults to 5 and is clamped to the range 1 to 50.
- PO-log `pageSize` defaults to 20 and is clamped to the range 1 to 100.
- Optional status filters must exactly match their enum.

### 9.2 Field limits

| Field               | Normalized rule                       |
| ------------------- | ------------------------------------- |
| Request name        | trimmed string, 1 to 50 characters    |
| Request description | trimmed string, 1 to 1000 characters  |
| Ticket name         | trimmed string, 1 to 50 characters    |
| Ticket description  | trimmed string, 1 to 1,000 characters |
| Pull-request string | trimmed string, 1 to 200 characters   |
| PO log message      | trimmed string, 1 to 3000 characters  |

## 10. Operation behavior

## 10.1 Create request

1. Validate and normalize input.
2. Generate `id` with `crypto.randomUUID()`.
3. Generate one UTC ISO timestamp and use it for `created_at` and `updated_at`.
4. Insert with status `pending` and `linked_ticket_id = NULL`.
5. Return the inserted request DTO.

## 10.2 Get request

1. Validate `requestId`.
2. Load by primary key.
3. Return `NOT_FOUND` if absent.
4. Return the DTO if present.

## 10.3 List requests

1. Validate and normalize pagination and optional exact status.
2. Execute an internal count query with the same status predicate as the data query; it is used only to calculate `totalPages`.
3. Fetch using:

```sql
ORDER BY created_at ASC, id ASC
LIMIT ? OFFSET ?
```

4. Return `PageResult<FeatureRequestDto>`.
5. The PO Workflow obtains up to five pending requests with:

```ts
listRequests({ page: 1, pageSize: 5, status: 'pending' });
```

## 10.4 Create ticket and link request

This operation is called after the PO Workflow has independently decided to create a ticket. The Domain API has no knowledge of the model call or Vectorize.

Service flow:

1. Validate and normalize input.
2. Load the request.
3. Return `NOT_FOUND` if it does not exist.
4. Require the request to be `pending` and unlinked.
5. Generate the ticket UUID.
6. Generate one timestamp for both the ticket and request update.
7. Execute the purpose-specific atomic repository operation.
8. Return the created ticket and updated request.

Atomicity requirement:

- ticket insertion and request linking/status update must either both occur or neither occur;
- use D1 `batch()` with prepared statements;
- do not use a generic callback transaction helper;
- SQL must include expected state predicates;
- the repository must inspect D1 statement metadata and require the expected affected-row counts;
- an unexpected zero-row result is a conflict/internal consistency failure, never success.

The ticket starts as `accepted`, and the request becomes `accepted`.

No idempotency key is implemented. Duplicate invocation is outside the POC assumptions.

## 10.5 Link request to existing ticket

Service flow:

1. Validate IDs.
2. Load request and ticket.
3. Return `NOT_FOUND` if either is absent.
4. Require the request to be `pending` and unlinked.
5. Copy the current ticket status to the request.
6. Update the request with an expected-state predicate.
7. Return the existing ticket and updated request.

An existing ticket may be `accepted`, `in_progress`, or `done`. Linking to a `done` ticket immediately makes the request `done`.

Repeated linking is outside the POC assumptions. No special idempotent or relinking behavior is designed.

## 10.6 Start oldest accepted ticket

Service flow:

1. Select one ticket using:

```sql
WHERE status = 'accepted'
ORDER BY created_at ASC, id ASC
LIMIT 1
```

2. If none exists, return successful `data: null`.
3. Generate one timestamp.
4. Atomically:
   - update the selected ticket from `accepted` to `in_progress`;
   - update every linked request to `in_progress` using the same timestamp.
5. Return the updated ticket.

The selection and subsequent write are intentionally not an atomic claim. The POC assumes only one Dev Agent caller. The write itself uses an expected `accepted` predicate and synchronizes linked requests in one D1 batch.

## 10.7 Save pull-request string

Service flow:

1. Validate `ticketId` and the trimmed 1 to 200 character value.
2. Load or conditionally update the ticket.
3. Return `NOT_FOUND` if absent.
4. Replace `pull_request_url` with the supplied value.
5. Update `updated_at`.
6. Return the updated ticket.

This operation:

- can be called more than once;
- replaces the earlier value;
- does not validate URL syntax or provider;
- does not require a particular ticket status;
- does not update linked requests;
- does not need a D1 batch.

## 10.8 Complete ticket

Service flow:

1. Validate `ticketId`.
2. Load the ticket.
3. Return `NOT_FOUND` if absent.
4. Require transition `in_progress -> done`.
5. Generate one timestamp.
6. Atomically:
   - update the ticket to `done` with expected status `in_progress`;
   - update every linked request to `done` using the same timestamp.
7. Return the updated ticket.

The Domain API trusts its private caller. It does not require a stored pull-request value or verification evidence.

## 10.9 Get and list tickets

`getTicket` returns `NOT_FOUND` for an unknown ID.

`listTickets` supports pagination and an optional exact status filter. It uses the same count/data predicate and deterministic ordering:

```sql
ORDER BY created_at ASC, id ASC
LIMIT ? OFFSET ?
```

## 10.10 Append PO log

1. Validate and normalize the message.
2. Generate UUID and timestamp.
3. Insert one append-only row.
4. Return the DTO.

There is no update or delete operation for a PO log.

## 10.11 List PO logs

1. Normalize page and page size.
2. Count all logs.
3. Fetch oldest-first with `created_at ASC, id ASC`.
4. Return `PageResult<PoLogDto>`.

The UI may calculate and request the final page when it wants to open the newest log page. The Domain API itself keeps ordinary page semantics and does not introduce a `lastPage` input mode.

## 11. D1 atomic write design

Do not implement:

```ts
withTransaction<T>(db, callback);
```

Do not expose `D1DatabaseSession` as an application transaction abstraction.

Use purpose-specific repository operations:

```ts
createTicketAndLinkRequestAtomic(...)
startTicketAndSynchronizeRequestsAtomic(...)
completeTicketAndSynchronizeRequestsAtomic(...)
```

Each operation:

- prepares all required statements;
- passes them to `db.batch()`;
- checks `success` and affected-row metadata for every statement;
- returns rows only after the write set succeeds;
- maps unexpected D1 failures to an internal repository error;
- never embeds raw D1 error text in an RPC response.

For create-and-link, the SQL must ensure that a ticket is not retained when the request no longer satisfies `status = 'pending' AND linked_ticket_id IS NULL`. The implementation may use guarded `INSERT ... SELECT ... WHERE EXISTS`, followed by a guarded request update in the same batch, with strict result-count verification. The coding agent must not replace this with two unrelated autocommit calls.

## 12. Error handling

| Code                 | Use                                                                |
| -------------------- | ------------------------------------------------------------------ |
| `VALIDATION_ERROR`   | Schema failure, invalid page/status/field value                    |
| `NOT_FOUND`          | Requested request or ticket does not exist                         |
| `CONFLICT`           | Expected persisted state changed or write predicate matched no row |
| `INVALID_TRANSITION` | Requested ticket transition is not allowed                         |
| `INTERNAL_ERROR`     | Unexpected D1/runtime failure                                      |

These are conventional values of the open `code: string` field. They are not a closed type union.

Rules:

- Public messages are concise and stable.
- `fieldErrors` are permitted only for validation failures.
- Log internal diagnostic context using safe identifiers, not secrets or SQL parameter contents.
- Never serialize stack traces, SQL text, D1 messages, environment bindings, or implementation details.
- A missing oldest accepted ticket is not an error. Return `ok: true, data: null`.

## 13. Pagination

```ts
const offset = (page - 1) * pageSize;
const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
```

Repositories return an internal `{ rows, total }` result. Services compute `totalPages` from the internal `total` and return the public `PageResult<T>` (`items`, `page`, `pageSize`, `totalPages`) without `total`.

Rules:

- page-based pagination only;
- no cursor pagination;
- `page` defaults to 1;
- request/ticket page size defaults to 5 and is clamped to 50;
- PO-log page size defaults to 20 and is clamped to 100;
- no error when a valid page is beyond `totalPages`; return an empty `items` array with the correctly calculated `totalPages`;
- all lists use `created_at ASC, id ASC`.

## 14. Migration policy

- `0001_initial.sql` creates all three tables, foreign key, checks, and indexes.
- After a migration has been applied remotely, it is immutable.
- Future schema changes require a new numbered migration.
- Migrations must be safe for D1 and must not depend on runtime TypeScript.
- Local and remote environments use the same migration files.

## 15. Observability and privacy

The Worker may emit concise operational logs for:

- RPC operation name;
- success/failure category;
- safe record IDs;
- duration;
- normalized error code.

It must not log:

- complete request/ticket descriptions by default;
- pull-request tokens or credentials;
- prompts or model responses;
- embeddings;
- SQL statements with values;
- stack traces in caller-visible results.

## 16. Configuration

Required binding:

```ts
interface Env {
  DB: D1Database;
}
```

The Worker needs no AI, Vectorize, Workflow, Durable Object, KV, R2, Queue, GitHub, or secret binding.

`wrangler.jsonc` must:

- set the Worker `name` to `agentic-delivery-loop-domain-api`;
- declare the D1 binding as `DB` for the D1 database `adl-sql-db`;
- have no route or custom domain;
- include the Worker entrypoint;
- use the shared pinned compatibility date from the root architecture;
- participate in generated Worker type definitions (`cf:types`).

Dependencies: uses the exact versions from the root dependency baseline (`docs/ARCHITECTURE.md` → Dependency baseline, root `pnpm.overrides`, committed `pnpm-lock.yaml`). Module implementations must not independently select or change versions.

## 17. Validation procedure

Automated test packages are outside scope. Validate this Worker with:

1. dependency installation using the repository package manager;
2. TypeScript typecheck;
3. `cf:types`;
4. local D1 migration application (`db:migrate:local`);
5. local run (`wrangler dev`);
6. a manual RPC smoke script covering:
   - create and list request;
   - create ticket and link request;
   - link request to existing accepted/in-progress/done ticket;
   - start oldest accepted ticket;
   - save and replace pull-request string;
   - complete ticket;
   - append and list PO logs;
   - pagination and status filters;
   - normalized not-found, validation and transition errors.

The smoke script is validation tooling, not a test framework.

## 18. Forbidden implementation shortcuts

The coding agent must not:

- add a public `fetch()` API;
- add authentication, rate limiting, queues, or multi-tenant behavior;
- add AI, Agent, Workflow, Vectorize, or GitHub code;
- restore `patchRequest` or generic `patchTicket`;
- add delete RPCs;
- add generic transaction callbacks;
- split required atomic multi-table writes into independent autocommit calls;
- permit backward status transitions;
- use cursor pagination;
- expose raw database errors;
- select or change dependency versions independently of the root dependency baseline;
- add unit/integration/E2E test frameworks;
- add speculative retry, idempotency, relinking, or multi-agent concurrency machinery.
