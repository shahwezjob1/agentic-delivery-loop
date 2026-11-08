import type { DevLifecycleStatus } from '../agent/dev-state';
export interface DevLogFields {
  conversationId?: string;
  ticketId?: string;
  phase?: DevLifecycleStatus;
  tool?: string;
  branch?: string;
  pullRequestNumber?: number;
  verificationStatus?: 'verified' | 'not_verified' | 'error';
  durationMs?: number;
  errorCode?: string;
  [key: string]: unknown;
}
export interface DevLogger {
  info(e: string, f?: DevLogFields): void;
  warn(e: string, f?: DevLogFields): void;
  error(e: string, f?: DevLogFields): void;
}
const forbidden = new Set(['authorization', 'token', 'content', 'prompt', 'raw']);
export function createLogger(base: DevLogFields = {}): DevLogger {
  const emit = (level: 'info' | 'warn' | 'error', event: string, fields: DevLogFields = {}) => {
    const safe = Object.fromEntries(
      Object.entries({ ...base, ...fields }).filter(([k]) => !forbidden.has(k.toLowerCase())),
    );
    console[level === 'info' ? 'log' : level](
      JSON.stringify({
        service: 'dev-agent-worker',
        event,
        level,
        timestamp: new Date().toISOString(),
        ...safe,
      }),
    );
  };
  return {
    info: (e, f) => emit('info', e, f),
    warn: (e, f) => emit('warn', e, f),
    error: (e, f) => emit('error', e, f),
  };
}
