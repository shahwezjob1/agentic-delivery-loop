# Dev Agent Worker Architecture

## 1. Purpose

The Dev Agent Worker is a private, Cloudflare-native coding assistant for the Agentic Delivery Loop POC. It takes the oldest accepted development ticket, modifies only the Wingman tool source area through the GitHub REST API, opens a pull request, waits for human merge and deployment, and then verifies the deployed Wingman capability.

This document and `REPO_MAP.md` are the implementation LLD for the Dev Agent Worker.

## 2. Scope

### In scope

- Persistent Dev chat implemented with `AIChatAgent`.
- Workers AI model calls through the `AI` binding.
- User-directed discussion and bounded tool use.
- Starting the oldest accepted ticket through Domain API RPC.
- GitHub branch, file, commit and pull-request operations through REST.
- Reads and writes limited to TypeScript files in the Wingman tools directory.
- Human-controlled PR review, merge and Wingman deployment.
- Headless verification through a private `WingmanAgent` Durable Object RPC call.
- Completing a ticket after the expected Wingman tool name is observed.
- Structured logs visible in Cloudflare Workers observability.

### Out of scope

- Pi, Think, OpenCode, custom agent harnesses or Cloudflare Computer.
- Autonomous background execution or continuing a turn after eviction.
- Repository clone, shell access, code execution, test execution or CI control.
- Public Dev Agent APIs other than traffic forwarded by the UI Worker.
- Authentication, authorization, rate limiting or multi-tenant isolation.
- Atomic ticket claim, lease, owner, lock or multi-Dev-Agent safety.
- Automatic merge, deployment, rollback or branch deletion.
- Semantic verification of tool arguments, output or final answer correctness.
- Production-grade retries, reconciliation or compensation workflows.
- Unit, integration, component or end-to-end tests.

## 3. Runtime topology

```text
Browser
  |
  | same-origin WebSocket/HTTP
  v
UI Worker (only public origin)
  |
  | private Service Binding request forwarding
  v
Dev Agent Worker
  |-- AI binding --------------------------> Workers AI
  |-- DOMAIN_API typed Service Binding ----> Domain API Worker
  |-- WINGMAN_AGENT Durable Object binding -> WingmanAgent instance
  `-- HTTPS fetch --------------------------> GitHub REST API
```

The Dev Agent Worker has no public route. The UI Worker forwards the Dev Agent WebSocket route to it through a Service Binding. `routeAgentRequest()` in the Dev Worker sends the forwarded request to the named `DevAgent` Durable Object.

The browser-selected Dev conversation ID is stored in `localStorage`. Refresh reconnects to the same Dev conversation. A different browser or cleared `localStorage` creates a separate Dev Agent instance. For this POC, operators must use one Dev conversation operationally; the backend does not prevent two instances from selecting the same ticket.

## 4. Cloudflare implementation choice

`DevAgent` extends `AIChatAgent<Env, DevAgentState>` from `@cloudflare/ai-chat`.

`AIChatAgent` is selected because this application is an interactive chat with bounded, user-initiated turns. It provides Durable Object-backed message persistence, resumable streaming, WebSocket synchronization and AI SDK tool support. The long human review wait occurs between turns, so Pi durable-run recovery is unnecessary.

Uses the exact versions from the root dependency baseline (`docs/ARCHITECTURE.md` → Dependency baseline, root `pnpm.overrides`, committed `pnpm-lock.yaml`). Module implementations must not independently select or change versions.

Required packages:

- `@agentic-delivery-loop/contracts` (workspace package)
- `agents`
- `@cloudflare/ai-chat`
- `ai`
- `@ai-sdk/provider`
- `zod`
- `wrangler` as a development dependency

## 5. Durable Object and routing configuration

Wrangler must configure:

- `compatibility_flags: ["nodejs_compat"]`.
- A current compatibility date valid for the baseline SDK versions.
- `AI` Workers AI binding.
- SQLite-backed `DevAgent` Durable Object binding and migration.
- `DOMAIN_API` Service Binding to `agentic-delivery-loop-domain-api`.
- Private `WINGMAN_AGENT` cross-Worker Durable Object namespace binding (`class_name: "WingmanAgent"`, `script_name: "agentic-delivery-loop-wingman-agent"`). This is not a Service Binding.
- `upload_source_maps: true`.
- Workers Logs and traces enabled.

Conceptual configuration:

```jsonc
{
  "main": "src/index.ts",
  "compatibility_flags": ["nodejs_compat"],
  "upload_source_maps": true,
  "ai": { "binding": "AI" },
  "durable_objects": {
    "bindings": [
      { "name": "DevAgent", "class_name": "DevAgent" },
      {
        "name": "WINGMAN_AGENT",
        "class_name": "WingmanAgent",
        "script_name": "agentic-delivery-loop-wingman-agent",
      },
    ],
  },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["DevAgent"] }],
  "services": [{ "binding": "DOMAIN_API", "service": "agentic-delivery-loop-domain-api" }],
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1,
    "traces": { "enabled": true },
  },
}
```

The exact generated Wrangler syntax must follow the installed Wrangler schema. Generate binding types with the `cf:types` script (`wrangler types` using the Dev, Domain API and Wingman Wrangler configurations) so both RPC surfaces are typed.

## 6. Environment contract

`Env` is generated into `worker-configuration.d.ts` by `wrangler types`; it is shown here for reference. `DOMAIN_API` type comes from `worker-configuration.d.ts` generated by `wrangler types` with the Domain API config supplied. The `WINGMAN_AGENT` stub type likewise comes from the generated types with the Wingman config supplied. No hand-written Domain API or Wingman service interface is defined in Dev.

```ts
interface Env {
  AI: Ai;
  DOMAIN_API: /* generated Domain API Service Binding type */;
  WINGMAN_AGENT: /* generated WingmanAgent Durable Object namespace type */;
  DevAgent: DurableObjectNamespace<DevAgent>;

  GITHUB_OWNER: string;
  GITHUB_REPOSITORY: string;
  GITHUB_BASE_BRANCH: string; // configured as "main"
  GITHUB_ALLOWED_ROOT: string; // apps/wingman-agent-worker/src/tools/
  GITHUB_MAX_FILE_BYTES: string; // 102400

  GITHUB_TOKEN: string;
}
```

`GITHUB_TOKEN` is a Wrangler secret. It must never be placed in vars, source control, logs, model context, tool results or state.

## 7. Model and chat loop

### Model

Use Workers AI model:

```text
@cf/meta/llama-3.3-70b-instruct-fp8-fast
```

Configuration:

- `temperature: 0.2`
- `maxOutputTokens: 4096`
- `stopWhen: stepCountIs(20)`

The model supports function calling and is large enough for the limited TypeScript editing task, so it is kept. Two things changed instead of the model:

- `maxOutputTokens` is raised from 1,500 to 4,096 because `write_file` carries a whole TypeScript file inside the tool-call arguments, and a truncated call fails or writes a broken file.
- The model sees only the one to four tools valid for the current phase (see "Phase-driven prompt and tools"). Small tool menus are the cheapest reliability gain for a function-calling model and also shrink the prompt, which lowers neuron use on the Workers AI free tier (10,000 neurons per day; confirm current pricing on the Workers AI pricing page).

If tool calling still proves unreliable in the manual smoke run, move to a larger function-calling model from the Workers AI catalog rather than adding code. Larger models burn the free daily neuron budget faster, so change the model only on evidence.

### Phase-driven prompt and tools

The system prompt and the visible tool set are recomputed from `DevAgentState.status` before every model step. A phase is one lifecycle status.

| Status           | Meaning                                       | Model-visible tools                                                        |
| ---------------- | --------------------------------------------- | -------------------------------------------------------------------------- |
| `idle`           | No active ticket                              | `start_oldest_accepted_ticket`                                             |
| `ticket_started` | Ticket is `in_progress`, no branch yet        | `create_branch`                                                            |
| `branch_ready`   | Branch exists with changes not yet in an open PR (first implementation, or edits after a merge) | `list_files`, `read_file`, `write_file`, `create_pull_request`             |
| `pr_open`        | A PR created by Dev is open; review/merge pending | `list_files`, `read_file`, `write_file`, `get_pull_request_status`, `verify_wingman_capability` |
| `pr_merged`      | Dev's latest PR confirmed merged by `get_pull_request_status` | `list_files`, `read_file`, `write_file`, `create_pull_request`, `get_pull_request_status`, `verify_wingman_capability` |

`write_file` stays available in `pr_open` so the user can ask for changes from review comments; each write adds a commit to the same branch and the open PR updates itself, and state stays `pr_open`. `create_pull_request` is hidden while Dev's own PR is open.

After a merge the file tools and `create_pull_request` stay visible so wrong code can be fixed on the same branch (merge-commit strategy). A `write_file` in `pr_merged` moves state to `branch_ready`: the new commits are neither reviewed nor deployed, so verification is hidden until a new PR is raised and merged. `create_pull_request` always creates a new PR; it does not look up existing PRs, and PRs opened by other people are not tracked or touched.

Mechanism (a direct equivalent of rebinding tools per node in LangGraph, except there is no graph):

```ts
streamText({
  model,
  messages,
  tools: allTools,                       // every tool is registered once
  prepareStep: ({ stepNumber }) => {
    const state = this.state;            // re-read: tools may have changed it this turn
    return {
      system: buildDevSystemPrompt({ state, ...config }),
      activeTools: PHASE_TOOLS[state.status],
    };
  },
});
```

Behavior notes for people coming from LangChain/LangGraph:

- Cloudflare Agents does not provide its own tool-binding layer; `AIChatAgent` runs the Vercel AI SDK `streamText()`. Per-step `system` and `activeTools` overrides through `prepareStep` are therefore the supported way to do state-dependent prompts and tools. Nothing here is blocked by the Cloudflare platform.
- The "state machine" is the Durable Object state (`this.state`) plus the `PHASE_TOOLS` table. There is no graph, checkpointer or conditional-edge API to learn.
- `prepareStep` runs before each model step inside one user turn. When `start_oldest_accepted_ticket` succeeds and updates state, the very next step already sees `create_branch` and the new prompt, so the user does not need to send another message.
- `activeTools` only hides tools from the model. Every tool still re-checks its lifecycle precondition in `execute()`, so a hidden or hallucinated call is rejected in code.
- Earlier tool calls and results stay in the history even when their tool is hidden now. That is expected and is the reason history is not pruned (see below).
- `prepareStep` and `activeTools` must exist in the baseline `ai` version. The root dependency compatibility spike must confirm this. Fallback if they do not: build the `tools` object and system prompt per turn from the current status, which gives the same behavior except that a phase change mid-turn is only visible on the next user message.

The prompt texts live in `src/agent/dev-prompt.ts` as readable multi-line template strings, one per phase, so they can be edited by hand. The coding standards are a separate multi-line string in `src/agent/coding-guidelines.ts` (see "Coding guidelines for generated tools").

### Chat turn

`onChatMessage()` performs:

1. Validate that the latest user text is present and has 1 to 1,000 trimmed characters. (Dev needs room for pasted PR review comments; the 1 to 100 limit stays for Wingman prompts, including the verification prompt.)
2. Convert the full persisted `this.messages` collection with `convertToModelMessages()`.
3. Do not call `pruneMessages()` and do not implement custom history pruning.
4. Call `streamText()` with the model, full converted history, the complete tool set, limits and the `prepareStep` callback above.
5. Return `result.toUIMessageStreamResponse({ onError })`. Stream errors (invalid tool calls, model failures) are logged as `chat_stream_failed` and the browser receives a short `Dev Agent error: <name>: <message>` instead of a generic failure.

The complete Dev conversation is sent while it fits the model context. If it exceeds the model context, return a clear error asking the user to start a new Dev conversation. Do not silently remove earlier messages.

### System prompt obligations

Every phase prompt shares a short common block (role, only use the listed tools, never merge or deploy, never reveal secrets, be brief) and then adds phase-specific guidance:

- `idle`: Nudge the agent to call `start_oldest_accepted_ticket` immediately when the user asks to begin or continue; if it reports no accepted ticket, say so and stop. Casual conversation is allowed, but do not describe work that has not started.
- `ticket_started`: Show the ticket name and description, then call `create_branch`. Do not write code yet.
- `branch_ready`: Include the ticket name and description and the coding guidelines. Inspect first (`list_files`, then `read_file` on one existing tool and on the tool registry), then write the new tool file and the registry change with `write_file`, then call `create_pull_request` once for this set of changes. Make the smallest change that satisfies the ticket or the requested fix. If a previous PR was merged, say that the new changes are not in any PR yet.
- `pr_open`: The PR is raised and must not be re-created. If the user says Wingman is already deployed with these changes and asks to verify, call `verify_wingman_capability`; a pass is recorded but does not complete the ticket; the user merges, then verification is repeated in `pr_merged`. Tell the user it awaits human review, merge and Wingman deployment. If the user asks for changes, edit with `write_file`. When the user says the PR is merged, or asks for status, call `get_pull_request_status`. Do not claim it is merged until the tool says so.
- `pr_merged`: The merge is confirmed. To check the work, ask the user to confirm Wingman has been deployed if they have not said so, then call `verify_wingman_capability` with a short natural-language prompt that should make Wingman use the new tool and the exact tool name it expects. To fix or change the code (wrong code merged, failed verification, or a user request), read the files, `write_file` on the same branch, and after the changes are complete call `create_pull_request` for a new PR. Do not call `create_pull_request` without new changes.

Prompt guidance controls the normal sequence. Security boundaries remain enforced in code.

## 8. Lifecycle state

```ts
type DevLifecycleStatus =
  | 'idle' // no active ticket
  | 'ticket_started' // ticket in_progress, no branch
  | 'branch_ready' // branch exists, no PR
  | 'pr_open' // PR raised, awaiting human review/merge
  | 'pr_merged'; // merge confirmed, verification allowed

interface ActiveTicketSummary {
  id: string;
  name: string;
  description: string;
  status: 'in_progress';
}

interface PullRequestSummary {
  number: number;
  url: string;
  branch: string;
  baseBranch: string;
}

interface DevAgentErrorState {
  phase: 'implementation' | 'pull_request' | 'verification';
  code: string;
  message: string;
  occurredAt: string;
}

interface DevAgentState {
  status: DevLifecycleStatus;
  activeTicket: ActiveTicketSummary | null;
  branch: string | null;
  pullRequest: PullRequestSummary | null;
  expectedToolName: string | null;
  lastVerification: WingmanVerificationResult | null;
  lastError: DevAgentErrorState | null;
}
```

Initial state has `status: "idle"` and all optional values `null`.

State is persisted through the Agent state API and synchronized to connected UI clients. No custom `getPublicState()` RPC method is required.

### State transitions

```text
idle
  -> ticket_started   start_oldest_accepted_ticket returned a ticket
                      (stays idle when no accepted ticket exists)

ticket_started
  -> branch_ready     create_branch succeeded

branch_ready
  -> branch_ready     write_file (more commits before the PR)
  -> pr_open          create_pull_request succeeded and its URL was saved

pr_open
  -> pr_open          write_file (commits update the open PR), or get_pull_request_status reports not merged
  -> pr_merged        get_pull_request_status reports merged_at !== null
  -> pr_open          verification passed while the PR is open; recorded only, ticket not completed (verify again after merge)

pr_merged
  -> branch_ready     write_file (new changes need a new PR; verification hidden)
  -> pr_open          create_pull_request succeeded (new PR; replaces the PR in state)
  -> idle             verification returned verified: true and the ticket was completed
  -> pr_merged        verification failed; user redeploys and retries, or fixes the code
```

Recoverable tool failures keep the current status and populate `lastError`. Fixing wrong merged code continues on the same branch and raises a new PR.

Starting another ticket is rejected unless state is `idle`.

## 9. Domain API integration

The Dev Agent uses typed Service Binding RPC only. It does not call a public Domain API URL.

Methods used (authoritative signatures come from the generated binding type; DTOs and inputs are imported from `@agentic-delivery-loop/contracts`):

| Method                                                   | Returns                                 | Caller                                                    |
| -------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------- |
| `startOldestAcceptedTicket()`                            | `Promise<RpcResult<TicketDto \| null>>` | `start_oldest_accepted_ticket` tool via lifecycle service |
| `saveTicketPullRequestUrl({ ticketId, pullRequestUrl })` | `Promise<RpcResult<TicketDto>>`         | `lifecycle.service.ts`, after PR creation                 |
| `completeTicket({ ticketId })`                           | `Promise<RpcResult<TicketDto>>`         | `lifecycle.service.ts`, after successful verification     |

The Dev domain adapter (`DomainClient`) calls `env.DOMAIN_API.x(...)`, passes the result through one `unwrapRpcResult()` helper that throws `DomainRpcError` (with `code: string`) on `ok: false`, and returns the direct business value to its caller.

Domain stores only the PR URL (`pullRequestUrl: string | null`). PR number and branch stay in `DevAgentState` and are never sent to Domain.

`startOldestAcceptedTicket()` executes in one D1 transaction inside Domain API:

1. Select the oldest `accepted` ticket.
2. Update it to `in_progress`.
3. Return the updated ticket.

It does not add claim tokens, locks, ownership or leases. If none exists, the tool returns a normal “no accepted ticket” result.

On successful verification, `lifecycle.service.ts` calls `completeTicket({ ticketId })`. Domain API is responsible for synchronizing linked request statuses in its own D1 transaction.

## 10. GitHub integration

### Authentication and permissions

Use a fine-grained GitHub personal access token restricted to the single target repository with:

- Contents: read and write.
- Pull requests: read and write.
- Metadata: read-only implicit access.

No Actions, Administration, Deployments, Environments, Secrets or Workflows permission is required.

Every request uses:

```text
Authorization: Bearer <GITHUB_TOKEN>
Accept: application/vnd.github+json
X-GitHub-Api-Version: <one pinned supported version>
User-Agent: agentic-delivery-loop-dev-agent
```

The API version is a source constant, not model input.

### Branch policy

The branch name is exactly:

```text
agent/ticket-<ticketId>
```

The ticket ID must match the application’s expected identifier format before interpolation and cannot contain `/`, `\\`, whitespace, `..` or ref-control characters.

Branch creation:

1. Read `heads/<GITHUB_BASE_BRANCH>`.
2. Build `refs/heads/agent/ticket-<ticketId>`.
3. If the branch does not exist, create it at the base branch SHA.
4. If the exact branch already exists, reuse it as simple POC recovery.
5. Never create numeric suffixes.

### Allowed repository area

GitHub file tools may read and write only:

```text
apps/wingman-agent-worker/src/tools/**/*.ts
```

The configured root must end with `/`. The policy allows any existing or new `.ts` file below this root. It does not deterministically limit the change to exactly one tool file plus one registry file. The model prompt should nevertheless request the smallest relevant change.

### Path validation order

For every model-provided path:

1. Require a non-empty string.
2. Reject NUL and control characters.
3. Reject backslashes instead of treating them as separators.
4. Reject a leading `/` and any absolute-path form.
5. Normalize with `path.posix.normalize()`.
6. Reject `.` and any normalized path equal to or beginning with `../`.
7. Require prefix `apps/wingman-agent-worker/src/tools/` with a path-boundary-safe comparison.
8. Require a final lowercase `.ts` extension.

Validation runs before any GitHub request.

### File content validation

- Input and decoded GitHub content must be valid UTF-8 text.
- Reject binary/NUL-containing content.
- Maximum encoded size is 100 KiB, exactly 102,400 bytes.
- Empty text is technically permitted by the broad POC write policy, although the model prompt must not erase unrelated files.
- Base64 conversion is internal to `GitHubClient` and never exposed to the model.

### File reads and writes

Use the GitHub Contents API for simplicity:

- List/read repository contents at the working branch.
- Create a new file without a SHA.
- Update an existing file using its current blob SHA.
- Each `putContent` call creates its own commit.
- A PR may therefore contain multiple commits.

Commit message format:

```text
ticket <ticketId>: update <relative-file-name>
```

If GitHub reports a SHA conflict, return structured code `GITHUB_CONTENT_CONFLICT`. Do not blindly overwrite. This case is not expected in the POC.

### Pull requests

Create a non-draft PR with:

- `head`: `agent/ticket-<ticketId>`
- `base`: `GITHUB_BASE_BRANCH`, configured as `main`
- title containing ticket ID and ticket name
- body containing ticket description, generated-file summary, POC verification note and human merge/deploy instructions

Before creating a PR, look for an existing PR with the exact head branch. Reuse its number and URL if present.

After creation, `lifecycle.service.ts` saves the PR URL through `saveTicketPullRequestUrl({ ticketId, pullRequestUrl })`, keeps PR number and branch in `DevAgentState`, and moves state to `pr_open`.

`get_pull_request_status` fetches the PR and reports `merged` as `merged_at !== null`; a merely closed PR is not merged. The first time it reports merged, lifecycle moves state to `pr_merged`. The PR number comes from `DevAgentState`, not from the model.

## 11. Tool catalog

All tools are server-side AI SDK tools with strict Zod schemas. Unknown fields are rejected. All tools are registered once; `PHASE_TOOLS` (section 7) decides which are visible per phase, and each tool also asserts its own lifecycle precondition.

### Domain tools

- `start_oldest_accepted_ticket({})` (phase `idle`)

There is no tool to select a ticket by ID and no `get_ticket` tool. Saving the PR URL (after PR creation) and completing the ticket (after successful verification) are internal `lifecycle.service.ts` operations, not model tools. There are no free-form ticket status or pull-request save tools.

### GitHub tools

- `create_branch({})` (phase `ticket_started`)
- `list_files({ path? })` (phases `branch_ready`, `pr_open`, `pr_merged`)
- `read_file({ path })` (phases `branch_ready`, `pr_open`, `pr_merged`)
- `write_file({ path, content, commitMessage? })` (phases `branch_ready`, `pr_open`, `pr_merged`)
- `create_pull_request({ title, body })` (phases `branch_ready`, `pr_merged`; always creates a new PR)
- `get_pull_request_status({})` (phases `pr_open`, `pr_merged`; the PR number is read from state)

The active ticket, branch and PR number come from lifecycle state. The model cannot provide owner, repository, token, arbitrary branch, base branch or PR number.

### Tool descriptions

Tool descriptions are part of the prompt and are written to say when to call the tool, when not to, and what comes next. The exact strings live in `src/tools/*.ts` (see REPO_MAP). Each description answers: what it does, when to use it, when not to, and what the result means for the next step.

### Verification tool

```ts
interface VerifyWingmanCapabilityInput {
  prompt: string;
  expectedToolName: string;
}
```

Both strings are trimmed and required. `prompt` must satisfy the same 1 to 100 character rule as browser Wingman chat (so it must be one short sentence). Visible in phases `pr_open` and `pr_merged`. `expectedToolName` is retained only by Dev and is never sent to Wingman.

## 12. Wingman verification integration

### Private RPC contract

The Dev Worker directly obtains a named `WingmanAgent` Durable Object stub through `WINGMAN_AGENT`, a cross-Worker Durable Object namespace binding (`script_name: "agentic-delivery-loop-wingman-agent"`), not a Service Binding. It does not call a public URL or Worker-level verification endpoint, and it does not emulate the browser WebSocket/chat transport.

Wingman exposes a generic public Durable Object RPC method that knows nothing about verification. Types are imported from `@agentic-delivery-loop/contracts` and shown here for reference:

```ts
interface InvokeWingmanTurnInput {
  prompt: string;
}

interface WingmanToolCall {
  toolCallId: string;
  toolName: string;
}

interface WingmanTurnResult {
  responseMessage: UIMessage;
  toolCalls: WingmanToolCall[];
}

invokeTurn(input: InvokeWingmanTurnInput): Promise<WingmanTurnResult>;
```

`invokeTurn()` does not accept `expectedToolName` and does not return `passed` or `verified`.

### Verification execution

For every attempt, Dev:

1. Requires lifecycle status `pr_open` or `pr_merged` with a PR in state. When the status is `pr_open`, it first fetches the PR; if `merged_at !== null` it moves state to `pr_merged`, so the model does not have to call `get_pull_request_status` before verifying.
2. Generates a new random conversation ID with `crypto.randomUUID()`.
3. Obtains the `WingmanAgent` stub with `getAgentByName(env.WINGMAN_AGENT, conversationId)`.
4. Calls `invokeTurn({ prompt })` and awaits the complete `WingmanTurnResult`.
5. Checks whether any `toolCalls[].toolName` exactly equals `expectedToolName`.
6. Returns a concise result with the normal Wingman response and simple tool log.
7. Drops the conversation ID from Dev state after the attempt.

There is no custom application timeout. Platform/runtime failures are returned as verification errors.

### Mechanical success condition

```ts
const conversationId = crypto.randomUUID();
const wingman = await getAgentByName(env.WINGMAN_AGENT, conversationId);
const result = await wingman.invokeTurn({ prompt: input.prompt });
const verified = result.toolCalls.some((call) => call.toolName === input.expectedToolName);
```

No other condition affects `verified`. In particular, verification does not check tool arguments, result correctness or final-answer correctness.

### Verification result

Imported from `@agentic-delivery-loop/contracts` (shared with UI), shown for reference:

```ts
interface WingmanVerificationResult {
  verified: boolean;
  expectedToolName: string;
  wingmanResponse: UIMessage;
  toolsCalled: Array<{ toolName: string }>;
}
```

The tool response should be directly understandable by the model and UI:

```text
Verified: expected tool "multiply" was called by Wingman.
Wingman response: <normal response text>
Tools called:
- multiply
```

or:

```text
Not verified: expected tool "multiply" was not called.
Wingman response: <normal response text>
Tools called:
- add
```

When `verified` is true and state was `pr_merged`, `lifecycle.service.ts` calls `completeTicket({ ticketId })`, clears active lifecycle fields and returns to `idle`. When false or when RPC fails, the ticket remains `in_progress`, state stays unchanged (`pr_merged` or `pr_open`) so verification can be retried after the user fixes or redeploys Wingman, and the user receives the result/error. When `verified` is true but state was `pr_open`, the result is stored in `lastVerification`, the ticket is not completed, state stays `pr_open`, and the tool result tells the model to ask the user to merge and verify again.

### Wingman implementation dependency

Wingman's `invokeTurn()` runs its normal turn executor (the same prompt, model, registry and real tools as browser chat) and returns `{ responseMessage, toolCalls }`. The detail is owned by the Wingman LLD. Dev must not duplicate Wingman model/tool logic.

### 12.1 Coding guidelines for generated tools

Yes, the agent can be given the project's coding standards. Two mechanisms work together:

1. **Written guidelines in the prompt.** A hand-maintained multi-line string in `src/agent/coding-guidelines.ts` states the conventions a new Wingman tool must follow (file name, factory name, strict Zod schema, description style, return shape, registry registration). It is injected into the `branch_ready`, `pr_open` and `pr_merged` prompts only.
2. **Worked examples from the repository.** The `branch_ready` prompt requires the agent to `read_file` one existing tool (for example `add.tool.ts`) and `tool-registry.ts` before writing. Real code in the same repo is a stronger style signal than prose and stays correct when the code evolves.

Because the allowed GitHub area is `apps/wingman-agent-worker/src/tools/` only, repository-wide files such as `AGENTS.md` or lint config are not readable by the agent. The guidelines string is therefore the only place where wider standards can be passed in. It must be updated whenever the Wingman tool conventions in the Wingman LLD change. Linting and typechecking of the generated code still happen in the human review and deployment step; the agent cannot run them.

## 13. Error handling

Tools return small, serializable success/error objects. Errors crossing RPC boundaries use stable string fields rather than `instanceof`.

```ts
interface ToolErrorResult {
  ok: false;
  code: string;
  message: string;
  retryable: boolean;
}
```

Representative codes:

- `NO_ACCEPTED_TICKET`
- `ACTIVE_TICKET_EXISTS`
- `INVALID_LIFECYCLE_STATE`
- `INVALID_REPOSITORY_PATH`
- `FILE_TOO_LARGE`
- `BINARY_CONTENT_REJECTED`
- `GITHUB_NOT_FOUND`
- `GITHUB_CONTENT_CONFLICT`
- `GITHUB_RATE_LIMITED`
- `GITHUB_REQUEST_FAILED`
- `PULL_REQUEST_NOT_MERGED`
- `WINGMAN_VERIFICATION_FAILED`
- `MODEL_CONTEXT_LIMIT`

Happy-path simplicity is preferred. No general retry framework, compensation engine or reconciliation process is required. Failures retain enough lifecycle state for the user to issue another chat message.

## 14. Observability

Enable Workers Logs, traces and source maps. Use `console.log`, `console.warn` and `console.error` with JSON objects; no logging library is required.

Common fields:

```ts
interface DevLogEvent {
  service: 'dev-agent-worker';
  event: string;
  level: 'info' | 'warn' | 'error';
  timestamp: string;
  conversationId?: string;
  ticketId?: string;
  phase?: DevLifecycleStatus;
  tool?: string;
  branch?: string;
  pullRequestNumber?: number;
  verificationStatus?: 'verified' | 'not_verified' | 'error';
  durationMs?: number;
  errorCode?: string;
}
```

Required event categories include:

- chat turn started/completed/failed;
- lifecycle state changed;
- Domain RPC started/completed/failed;
- GitHub request category completed/failed;
- branch created/reused;
- file read/written;
- PR created/reused/status checked;
- Wingman verification started/completed/failed;
- ticket completed.

Never log the GitHub token, authorization headers, complete repository file contents, complete prompts containing source code, or raw model/RPC objects when a small summary is enough.

## 15. Security and trust boundaries

- Browser input and model output are untrusted.
- Tool schemas validate model arguments.
- Path and content policies are enforced in deterministic code before network calls.
- Repository owner, repository, base branch and allowed root come only from environment configuration.
- GitHub authorization is constructed only inside `GitHubClient`.
- Dev never sends `expectedToolName` to Wingman.
- The Wingman turn result is untrusted for semantic correctness; this POC intentionally checks only the tool name.
- Service and Durable Object bindings are private. No backend public route is added.

## 16. Explicit invariants

1. At most one ticket is active per Dev Agent conversation.
2. A non-idle agent cannot start another ticket.
3. Active branch is always `agent/ticket-<activeTicket.id>`.
4. All GitHub file paths remain under the configured Wingman tools root and end in `.ts`.
5. Files never exceed 102,400 UTF-8 bytes.
6. GitHub token never enters model-visible data.
7. PR merge and Wingman deploy are human actions.
8. Verification always uses a fresh Wingman conversation ID.
9. Wingman never receives the expected tool name.
10. Verification is true only when the exact expected tool name appears in the returned `toolCalls`.
11. Ticket `done` is written only after true verification.
12. Dev conversation input is not deliberately pruned.
13. The model sees only the tools allowed for the current lifecycle status, and every tool re-checks that status in code.
14. `verify_wingman_capability` is available only after the PR merge is confirmed.

## 17. Manual validation

No automated test packages are added. Implementation completion requires:

- typecheck, `cf:types`, local run, and manual smoke validation, using the package scripts `dev` (`wrangler dev`), `typecheck`, `cf:types` and `deploy` (`wrangler deploy`).
- Manual smoke flow:
  1. Connect through UI Worker.
  2. In `idle`, confirm only `start_oldest_accepted_ticket` is offered and the agent calls it when asked to start.
  3. Confirm the ticket becomes `in_progress` and the agent proceeds to `create_branch` in the same turn.
  4. Confirm branch format.
  5. Confirm only `list_files`, `read_file`, `write_file` and `create_pull_request` are offered, the prompt shows the ticket description, and reads/writes reject paths outside the allowed root.
  6. Confirm the generated tool follows the coding guidelines and is registered in the tool registry.
  7. Confirm the PR is created, its URL saved, and `create_pull_request` is no longer offered while it is open.
  8a. After merge, confirm the file tools and `create_pull_request` are still offered; a `write_file` moves state to `branch_ready` and a new PR returns it to `pr_open`.
  8. Ask for a small change; confirm a new commit lands on the same branch.
  9. Confirm `verify_wingman_capability` is not offered before merge, and that `get_pull_request_status` says not merged.
  10. Merge and manually deploy Wingman, then confirm `get_pull_request_status` reports merged and verification becomes available.
  11. Invoke verification and confirm a fresh Wingman conversation, response and tool log.
  12. Confirm the ticket becomes `done` only when the expected tool name appears.
  13. Confirm structured events are visible in Cloudflare observability.

## 18. Authoritative references

- Cloudflare Agents: https://developers.cloudflare.com/agents/
- Cloudflare chat agents: https://developers.cloudflare.com/agents/agent-class/communication-channels/chat/chat-agents/
- Cloudflare Agent routing: https://developers.cloudflare.com/agents/agent-class/routing/
- Cloudflare Workers AI model: https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/
- Cloudflare Workers RPC: https://developers.cloudflare.com/workers/runtime-apis/rpc/
- Cloudflare Workers Logs: https://developers.cloudflare.com/workers/observability/logs/workers-logs/
- GitHub Contents API: https://docs.github.com/rest/repos/contents
- GitHub Git refs API: https://docs.github.com/rest/git/refs
- GitHub pull requests API: https://docs.github.com/rest/pulls/pulls
