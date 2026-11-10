import { spawnSync } from 'node:child_process';
const wrangler = process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler';
const name = 'adl-vector-db';
const shell = process.platform === 'win32'; // .cmd files need a shell on Windows
const get = spawnSync(wrangler, ['vectorize', 'get', name, '--json'], {
  encoding: 'utf8',
  shell,
});
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
  { stdio: 'inherit', shell },
);
if (created.status !== 0) {
  console.error(`Failed to create ${name}: ${created.error?.message ?? `exit code ${created.status}`}`);
  process.exit(created.status ?? 1);
}
