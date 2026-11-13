[![Watch the demo](https://youtu.be/XhGHICgEAKM)](https://youtu.be/XhGHICgEAKM)

# AGENTIC-DELIVERY-LOOP

This application has 3 main parts :-

1. Wingman is a small react agent with tools. If answering the users question requires a new tool then Wingman disucsses with the user and raises a feature request.
2. PO Workflow picks up the newly created feature requests ; deduplicates them via a RAG search ; links requests to correct dev tickets and creates new dev tickets if needed.
3. Dev Agent picks up the tickets makes code changes raises a PR waits for human to merge and deploy then validates the code changes.

## Why the PO Workflow ? Why not just Wingman checking existing requests to prevent deplicates ?

- For Production ready application adding a search tool strongly improves the system (in rare concurrent situation duplicates can still be created). But does not replace the PO Workflow.
- PO Workflow is not just deduplication. It's about refining the user requirement before it gets picked up by Dev Agent.
    - Refinement can be both technial and non technical. It can be deterministic or llm based or human in the loop.
    - Business value of the ticket needs to be checked. And accordingly prioritised or rejected.
    - Technical plan needs to be preparaed based on existing code for better latency, scalibility, reusability etc. 

# Setup and Deployment Commands

## Node and PNPM

node version 26.13.0

```
npm install --global pnpm@12.16.1
```

## Install

```
pnpm install --frozen-lockfile
```

## Authenticate

```
pnpm exec wrangler login
pnpm exec wrangler whoami
```

## Create D1 only if absent

```
pnpm exec wrangler d1 list
pnpm exec wrangler d1 create adl-sql-db --location apac
```

## Put the returned database ID in:

```
apps/domain-api-worker/wrangler.jsonc
```

## Create Vectorize only if absent

```
pnpm exec wrangler vectorize get adl-vector-db
pnpm exec wrangler vectorize create adl-vector-db --dimensions 768 --metric cosine
```

## Apply remote schema

```
pnpm db:migrate:remote
```

## Generate Cloudflare types

```
pnpm exec wrangler types apps/domain-api-worker/worker-configuration.d.ts --config apps/domain-api-worker/wrangler.jsonc

pnpm exec wrangler types apps/wingman-agent-worker/worker-configuration.d.ts --config apps/wingman-agent-worker/wrangler.jsonc --config apps/domain-api-worker/wrangler.jsonc

pnpm exec wrangler types apps/po-workflow-worker/worker-configuration.d.ts --config apps/po-workflow-worker/wrangler.jsonc --config apps/domain-api-worker/wrangler.jsonc

pnpm exec wrangler types apps/dev-agent-worker/worker-configuration.d.ts --config apps/dev-agent-worker/wrangler.jsonc --config apps/domain-api-worker/wrangler.jsonc --config apps/wingman-agent-worker/wrangler.jsonc

pnpm exec wrangler types apps/ui-worker/worker-configuration.d.ts --config apps/ui-worker/wrangler.jsonc --config apps/domain-api-worker/wrangler.jsonc --config apps/wingman-agent-worker/wrangler.jsonc --config apps/dev-agent-worker/wrangler.jsonc
```

## Deploy in dependency order

```
pnpm deploy:domain-api
pnpm deploy:wingman
pnpm deploy:po-workflow
pnpm deploy:dev-agent
pnpm --filter @agentic-delivery-loop/ui-worker build  
pnpm deploy:ui
```

## Add secret after Dev Agent exists

```
pnpm exec wrangler secret put GITHUB_TOKEN --config apps/dev-agent-worker/wrangler.jsonc
```

## UI assets must exist before UI deployment

```
pnpm --filter @agentic-delivery-loop/ui-worker build
pnpm deploy:ui
```

## To run sql scripts

Update the script before running
```
 pnpm exec wrangler d1 execute adl-sql-db --remote --config apps/domain-api-worker/wrangler.jsonc --file script.sql                              
```

## To delete a vector index

Add account id and cloudfare key in the script. Update ticket id used as index for vector.
```
 node .\scripts\delete-vector-index.mjs
```

## Delete all data

Commands are present in scripts/delete-all.sh

# Design Documentation

This package contains the consolidated decisions plus root and per-Worker Architecture and Repository Map documents. Read order: root `docs/ARCHITECTURE.md`, root `docs/REPO_MAP.md`, then each Worker pair.

# Prompt History

Relevant prompt history used for generating the code is in [`docs/PROMPT_HISTORY.md`](docs/PROMPT_HISTORY.md).
