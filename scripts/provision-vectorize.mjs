import { spawnSync } from 'node:child_process';
const wrangler = process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler';
const name = 'adl-vector-db';
const get = spawnSync(wrangler, ['vectorize', 'get', name, '--json'], { encoding: 'utf8' });
if (get.status === 0) {
  const index = JSON.parse(get.stdout || '{}');
  const dimensions = index.config?.dimensions ?? index.dimensions;
  const metric = index.config?.metric ?? index.metric;
  if (dimensions !== 768 || metric !== 'cosine') {
    console.error(`Existing ${name} is incompatible: dimensions=${dimensions}, metric=${metric}`);
    process.exit(1);
  }
  console.log(`${name} already exists and is compatible.`);
  process.exit(0);
}
const created = spawnSync(
  wrangler,
  ['vectorize', 'create', name, '--dimensions', '768', '--metric', 'cosine'],
  { stdio: 'inherit' },
);
if (created.status !== 0) process.exit(created.status ?? 1);
