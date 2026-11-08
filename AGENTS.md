# AGENTS.md

## Purpose

This repository implements the Agentic Delivery Loop platform using Cloudflare Workers, Cloudflare Agents SDK, D1, Workflows, Service Bindings, React, TypeScript, and Hono.

This document defines mandatory rules for AI agents generating, modifying, or refactoring code within the repository.

The goal is to keep the codebase:

- Simple
- Maintainable
- Consistent
- Cloudflare-native
- Easy to debug
- Easy to understand for future contributors

When requirements conflict with this document, explicit user instructions take precedence.

---

# Core Principles

## Keep Solutions Simple

Always choose the simplest approach that satisfies the requirement.

Avoid introducing complexity unless it provides clear value.

Examples:

Preferred:

```text
React useState
React Context
Simple service classes
Simple repository implementations
```

Avoid:

```text
Redux
MobX
Event sourcing
CQRS
Custom frameworks
Overly generic abstractions
Premature optimization
```

Introduce new dependencies only when there is a concrete requirement that cannot be solved reasonably with existing project libraries.

---

## Favor Readability Over Cleverness

Code should be understandable by an engineer seeing it for the first time.

Avoid:

```text
Complex generic types
Deep inheritance
Magic frameworks
Hidden behavior
```

Prefer:

```text
Explicit naming
Small functions
Clear control flow
Well-defined service boundaries
```

---

## Consistency First

When extending an existing module:

- Follow existing patterns
- Follow established folder structure
- Follow existing naming conventions
- Follow the existing architectural style

Do not introduce a new pattern when an accepted pattern already exists within the repository.

---

# Technology Standards

## Backend

Use:

```text
TypeScript
Hono
Cloudflare Workers
Cloudflare D1
Cloudflare Workflows
Cloudflare Service Bindings
Cloudflare Agents SDK
```

Do not introduce alternative backend frameworks unless explicitly requested.

Examples of frameworks that should not be introduced:

```text
Express
NestJS
Fastify
Koa
```

---

## Frontend

Use:

```text
React
TypeScript
Vite (if applicable)
```

Keep the UI stack intentionally lightweight.

Only introduce additional libraries when there is a demonstrated need.

Examples that should not be introduced without justification:

```text
Redux
MobX
Zustand
Material UI
Ant Design
Chakra UI
```

Use plain React capabilities whenever possible.

---

# Architecture Rules

## Layering

Every business domain must follow:

```text
HTTP Layer
    ↓
Service Layer
    ↓
Repository Layer
    ↓
Persistence Layer
```

Handlers must never directly access D1.

Handlers must always call services.

Services must contain business logic.

Repositories must contain persistence logic.

---

## Expected Module Structure

Business modules should generally follow:

```text
module/
├── http/
├── service/
├── repository/
├── schema/
├── rpc/
├── types/
```

The exact structure may vary when justified, but separation of concerns must remain intact.

---

## Domain Ownership

The Domain API Worker owns:

```text
Business data
Business rules
Business validation
D1 schema ownership
```

Agent Workers do not own persistence.

Agent Workers consume capabilities exposed by the Domain API Worker.

---

## Service Binding Communication

Cross-worker communication must occur through:

```text
Cloudflare Service Bindings
Typed RPC interfaces
```

Do not bypass service boundaries.

Avoid direct implementation coupling between workers.

---

## Direct Database Access Restrictions

Non-domain workers must not access D1 directly.

Examples:

```text
Calculator Agent Worker
PO Workflow Worker
Dev Agent Worker
```

must interact with the Domain API Worker instead of directly accessing D1.

The Domain API Worker remains the single source of truth for persisted business data.

---

# API Standards

## Framework

Use Hono for HTTP APIs.

New endpoints should follow existing Hono routing conventions.

---

## Validation

Validate inputs at API boundaries.

Never trust request payloads.

Validation should occur before entering business logic.

---

## Response Structure

Responses should be predictable and consistent.

Use explicit DTOs when appropriate.

Avoid leaking persistence models directly through APIs.

---

# Cloudflare Agents Rules

## Agent Framework

Use:

```text
Cloudflare Agents SDK
```

for agent implementations.

Do not introduce alternative orchestration frameworks unless explicitly requested.

Examples:

```text
LangGraph
CrewAI
AutoGen
```

---

## Agent Design

Agents should:

- Have clear responsibilities
- Use tools through well-defined interfaces
- Avoid accessing infrastructure directly when a domain service already exists

Keep agent behavior deterministic where possible.

---

## Tool Design

Tools should:

- Have a single responsibility
- Be reusable
- Have clearly documented inputs
- Have clearly documented outputs

Avoid massive tools that perform unrelated actions.

---

# Database Standards

## Migrations

Database migrations are append-only.

Never modify an existing migration file.

Always create a new migration for schema evolution.

Preferred:

```text
001_initial.sql
002_add_request_table.sql
003_add_ticket_table.sql
```

Avoid:

```text
Editing old migration files
Rewriting migration history
```

---

## Backward Compatibility

Schema changes should be additive whenever possible.

Avoid destructive changes unless explicitly requested.

---

# Logging Standards

## Structured Logging

Use structured logs.

Preferred:

```ts
console.log('request_created', {
  requestId,
  status,
  workflowInstanceId,
});
```

Avoid:

```ts
console.log('something happened');
```

---

## Logging Goals

Logs should make it easy to:

- Trace requests
- Debug failures
- Understand workflow execution
- Diagnose production issues

Log names should be descriptive and stable.

---

## Sensitive Data

Do not log:

```text
Secrets
Tokens
Passwords
Credentials
Sensitive customer data
```

---

# Error Handling

## Explicit Error Handling

Handle expected failures explicitly.

Examples:

```text
Validation failures
Missing records
Permission failures
Workflow failures
Service communication failures
```

---

## Useful Error Messages

Errors must provide enough information for debugging.

Avoid generic messages such as:

```text
Something went wrong
Operation failed
```

Prefer:

```text
Request not found
Workflow instance does not exist
Invalid request status transition
```

---

# Repository Documentation Requirements

## REPO_MAP.md

Agents must maintain a REPO_MAP.md document.

Purpose:

Provide a blueprint of the repository structure.

The document should contain:

### Folder Structure

A high-level hierarchical view of:

```text
Applications
Libraries
Modules
Configuration
Documentation
```

### File Inventory

For important files include:

```text
File path
Purpose
Major exports
Major classes
Major functions
```

### Function Signatures

For important functions include:

```text
Function name
Parameters
Return type
Responsibility
```

The goal is for an engineer to quickly understand:

- What exists
- Where it exists
- What it does

without opening every source file.

---

## ARCHITECTURE.md

Agents must maintain an ARCHITECTURE.md document.

Purpose:

Explain the soul, purpose, and behavior of the system.

The document should describe:

### Business Purpose

Why the application exists.

### System Responsibilities

What the application does.

### Architectural Principles

Core design decisions.

### Data Flow

How data moves through the system.

### Control Flow

How requests are processed.

### Service Interactions

How workers communicate.

### Agent Responsibilities

What each agent owns and performs.

### Workflow Execution

How workflows are initiated and completed.

### Persistence Responsibilities

What is persisted and where.

The goal is for a reader to understand:

- How the application works
- Why the application was designed this way
- How future changes should fit into the architecture

without reading implementation code.

---

# Code Generation Rules

## Preserve Existing Style

When modifying code:

- Reuse existing patterns
- Reuse existing abstractions
- Avoid unnecessary rewrites

---

## Minimize Scope

Only change what is required for the requested task.

Avoid unrelated refactoring.

Avoid opportunistic rewrites.

---

## Prefer Small Files

Keep files focused.

Avoid dumping unrelated responsibilities into a single file.

---

## Naming

Names must be descriptive.

Good:

```text
createRequest
updateRequestStatus
getRequestById
startPoWorkflow
```

Avoid:

```text
process
run
service
manager
helper
util
```

unless the name genuinely reflects the responsibility.

---

# Testing Policy

## Do Not Create Tests

This repository is currently a proof of concept.

Agents must not:

- Create unit tests
- Create integration tests
- Create end-to-end tests
- Create test fixtures
- Create test utilities
- Create test projects

unless the user explicitly overrides this rule.

Testing-related code generation is prohibited by default.

---

# Final Implementation Checklist

Before completing a task verify:

- Solution remains simple
- Hono is used for APIs
- Cloudflare Agents SDK is used for agents
- Layering rules are respected
- Service boundaries are respected
- Non-domain workers do not access D1 directly
- Migrations are append-only
- Structured logging is present
- REPO_MAP.md is updated when repository structure changes
- ARCHITECTURE.md is updated when architecture changes
- No unnecessary dependencies were introduced
- No tests were added
- Only requested scope was changed
