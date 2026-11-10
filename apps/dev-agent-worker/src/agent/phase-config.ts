import type { DevLifecycleStatus } from './dev-state';

export type DevToolName =
  | 'start_oldest_accepted_ticket'
  | 'create_branch'
  | 'list_files'
  | 'read_file'
  | 'write_file'
  | 'create_pull_request'
  | 'get_pull_request_status'
  | 'verify_wingman_capability';

// Tools the model can see in each phase. Tools still re-check the phase in execute().
export const PHASE_TOOLS: Record<DevLifecycleStatus, readonly DevToolName[]> = {
  idle: ['start_oldest_accepted_ticket'],
  ticket_started: ['create_branch'],
  branch_ready: ['list_files', 'read_file', 'write_file', 'create_pull_request'],
  pr_open: [
    'list_files',
    'read_file',
    'write_file',
    'get_pull_request_status',
    'verify_wingman_capability',
  ],
  pr_merged: [
    'list_files',
    'read_file',
    'write_file',
    'create_pull_request',
    'get_pull_request_status',
    'verify_wingman_capability',
  ],
};
