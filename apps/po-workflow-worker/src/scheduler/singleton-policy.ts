export const PO_WORKFLOW_INSTANCE_ID = 'po-singleton' as const;
export type SingletonAction = 'create' | 'restart' | 'skip-active' | 'skip-unknown';
export type KnownWorkflowStatus =
  | 'queued'
  | 'running'
  | 'waiting'
  | 'waitingForPause'
  | 'paused'
  | 'complete'
  | 'errored'
  | 'terminated'
  | 'unknown';
export function isActiveWorkflowStatus(status: KnownWorkflowStatus): boolean {
  return ['queued', 'running', 'waiting', 'waitingForPause', 'paused'].includes(status);
}
export function classifyWorkflowStatus(status: KnownWorkflowStatus): SingletonAction {
  if (isActiveWorkflowStatus(status)) return 'skip-active';
  if (status === 'complete' || status === 'errored' || status === 'terminated') return 'restart';
  return 'skip-unknown';
}
