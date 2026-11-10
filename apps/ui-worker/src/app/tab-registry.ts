export type AppTab = 'requests' | 'wingman' | 'tickets' | 'po-logs' | 'dev-agent';
export interface TabDefinition {
  id: AppTab;
  label: string;
}
export const TAB_DEFINITIONS = [
  { id: 'wingman', label: 'Wingman' },
  { id: 'requests', label: 'Requests' },
  { id: 'po-logs', label: 'PO Logs' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'dev-agent', label: 'Dev Agent' },
] as const;
export function parseTab(v: string | null): AppTab {
  return TAB_DEFINITIONS.some((x) => x.id === v) ? (v as AppTab) : 'requests';
}
