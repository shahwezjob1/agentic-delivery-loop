import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const files = [
  'apps/domain-api-worker/worker-configuration.d.ts',
  'apps/wingman-agent-worker/worker-configuration.d.ts',
  'apps/po-workflow-worker/worker-configuration.d.ts',
  'apps/dev-agent-worker/worker-configuration.d.ts',
  'apps/ui-worker/worker-configuration.d.ts',
];
const before = new Map(files.filter(existsSync).map((f) => [f, readFileSync(f, 'utf8')]));
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const r = spawnSync(pnpm, ['cf:types'], { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);
const changed = files.filter((f) => existsSync(f) && before.get(f) !== readFileSync(f, 'utf8'));
if (changed.length) {
  console.error(`Generated Cloudflare types changed:\n${changed.join('\n')}`);
  process.exit(1);
}
console.log('Generated Cloudflare types are current.');
