import { spawnSync } from 'node:child_process';
const wrangler = process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler';
const name = 'adl-sql-db';
const list = spawnSync(wrangler, ['d1', 'list', '--json'], { encoding: 'utf8' });
if (list.status !== 0) {
  console.error(list.stderr || list.stdout);
  process.exit(list.status ?? 1);
}
const databases = JSON.parse(list.stdout || '[]');
const existing = databases.find((db) => db.name === name);
if (existing) {
  console.log(`${name} already exists. database_id=${existing.uuid ?? existing.id}`);
  process.exit(0);
}
const created = spawnSync(wrangler, ['d1', 'create', name], { stdio: 'inherit' });
if (created.status !== 0) process.exit(created.status ?? 1);
console.log('Copy the emitted database_id into apps/domain-api-worker/wrangler.jsonc.');
