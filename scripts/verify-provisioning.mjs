import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const wrangler = process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler';
let failed = false;
function exec(args) {
  const r = spawnSync(wrangler, args, { encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`FAIL wrangler ${args.join(' ')}\n${r.stderr || r.stdout}`);
    failed = true;
  }
  return r;
}
exec(['whoami']);
const d1 = exec(['d1', 'list', '--json']);
if (d1.status === 0 && !JSON.parse(d1.stdout || '[]').some((x) => x.name === 'adl-sql-db')) {
  console.error('FAIL D1 adl-sql-db is missing');
  failed = true;
}
const vector = exec(['vectorize', 'get', 'adl-vector-db', '--json']);
if (vector.status === 0) {
  const x = JSON.parse(vector.stdout || '{}');
  if (
    (x.config?.dimensions ?? x.dimensions) !== 768 ||
    (x.config?.metric ?? x.metric) !== 'cosine'
  ) {
    console.error('FAIL adl-vector-db must use 768 dimensions and cosine');
    failed = true;
  }
}
for (const path of [
  'apps/domain-api-worker/wrangler.jsonc',
  'apps/dev-agent-worker/wrangler.jsonc',
]) {
  const text = readFileSync(path, 'utf8');
  if (text.includes('REPLACE_WITH_')) console.warn(`WARN unresolved placeholder in ${path}`);
}
process.exitCode = failed ? 1 : 0;
