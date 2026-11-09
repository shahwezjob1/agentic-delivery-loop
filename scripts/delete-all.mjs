// Wipes ALL remote application data: D1 rows and the Vectorize index. Run from the repo root:
//   node scripts/delete-all.mjs
import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';
const pnpm = isWindows ? 'pnpm.cmd' : 'pnpm';
const d1 = [
  'exec',
  'wrangler',
  'd1',
  'execute',
  'adl-sql-db',
  '--remote',
  '--config',
  'apps/domain-api-worker/wrangler.jsonc',
];

// On Windows .cmd files need a shell, so quote arguments that contain spaces.
const quote = (arg) => (isWindows && /\s/.test(arg) ? `"${arg}"` : arg);

function run(label, args, { allowFailure = false } = {}) {
  console.log(`\n${label}`);
  const result = spawnSync(pnpm, args.map(quote), { stdio: 'inherit', shell: isWindows });
  if (result.status !== 0) {
    if (allowFailure) {
      console.log('Command failed (continuing): index may not exist.');
      return;
    }
    console.error(`Failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

run('1/4 Deleting D1 rows (requests reference tickets, so requests go first)...', [
  ...d1,
  '--command',
  'DELETE FROM feature_requests; DELETE FROM po_logs; DELETE FROM tickets;',
]);
run('2/4 Verifying D1 tables are empty...', [
  ...d1,
  '--command',
  'SELECT (SELECT COUNT(*) FROM feature_requests) AS requests, (SELECT COUNT(*) FROM tickets) AS tickets, (SELECT COUNT(*) FROM po_logs) AS po_logs;',
]);
run(
  '3/4 Deleting Vectorize index adl-vector-db...',
  ['exec', 'wrangler', 'vectorize', 'delete', 'adl-vector-db', '--force'],
  { allowFailure: true },
);
run('4/4 Recreating Vectorize index (768 dimensions, cosine)...', ['provision:vectorize']);

console.log('\nDone. Wait a few seconds before the next PO run.');
