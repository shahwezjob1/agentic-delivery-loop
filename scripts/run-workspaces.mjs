import { spawn } from 'node:child_process';
export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false, ...options });
    child.once('error', reject);
    child.once('exit', (code, signal) =>
      code === 0 ? resolve() : reject(new Error(`${command} failed (${signal ?? code})`)),
    );
  });
}
export async function runSequentially(steps) {
  for (const step of steps) {
    console.log(`\n==> ${step.label}`);
    await run(step.command, step.args);
  }
}
