import type { UIMessage } from 'ai';

export interface AgentActivityEvent {
  type: string;
  at: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface InvokeWingmanTurnInput {
  prompt: string;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/**
 * Complete JSON-safe result of an awaited Wingman invocation. The concrete
 * fields are owned by the AI SDK result and intentionally remain extensible.
 */
export type WingmanTurnResult = Record<string, JsonValue>;

export interface RunVerificationTurnInput {
  prompt: string;
}

export interface VerificationToolLogEntry {
  toolName: string;
  input: unknown;
  output?: unknown;
}

export interface WingmanVerificationResult {
  verified: boolean;
  expectedToolName: string;
  wingmanResponse: UIMessage;
  toolsCalled: VerificationToolLogEntry[];
}

export interface DevAgentState {
  status: 'idle' | 'running' | 'succeeded' | 'failed';
  ticketId?: string;
  branchName?: string;
  pullRequestUrl?: string;
  error?: string;
}
