import { runSequentially } from './run-workspaces.mjs';
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
await runSequentially(
  [
    ['domain-api', '@agentic-delivery-loop/domain-api-worker'],
    ['wingman', '@agentic-delivery-loop/wingman-agent-worker'],
    ['po-workflow', '@agentic-delivery-loop/po-workflow-worker'],
    ['dev-agent', '@agentic-delivery-loop/dev-agent-worker'],
    ['ui', '@agentic-delivery-loop/ui-worker'],
  ].map(([label, pkg]) => ({
    label: `Deploy ${label}`,
    command: pnpm,
    args: ['--filter', pkg, 'deploy'],
  })),
);
