import type { Env } from './env';
export interface DevConfig {
  github: {
    owner: string;
    repository: string;
    baseBranch: string;
    allowedRoot: string;
    maxFileBytes: number;
    apiVersion: string;
    userAgent: string;
  };
  model: {
    name: '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
    temperature: 0.2;
    maxOutputTokens: 4096;
    maxSteps: 20;
  };
}
export function loadConfig(env: Env): DevConfig {
  const required = [
    env.GITHUB_OWNER,
    env.GITHUB_REPOSITORY,
    env.GITHUB_BASE_BRANCH,
    env.GITHUB_ALLOWED_ROOT,
    env.GITHUB_TOKEN,
  ];
  if (required.some((v) => !v?.trim())) throw new Error('Dev Agent configuration is incomplete.');
  const max = Number(env.GITHUB_MAX_FILE_BYTES);
  if (max !== 102400) throw new Error('GITHUB_MAX_FILE_BYTES must be 102400.');
  if (!env.GITHUB_ALLOWED_ROOT.endsWith('/'))
    throw new Error('GITHUB_ALLOWED_ROOT must end with /.');
  return {
    github: {
      owner: env.GITHUB_OWNER,
      repository: env.GITHUB_REPOSITORY,
      baseBranch: env.GITHUB_BASE_BRANCH,
      allowedRoot: env.GITHUB_ALLOWED_ROOT,
      maxFileBytes: max,
      apiVersion: '2022-11-28',
      userAgent: 'agentic-delivery-loop-dev-agent',
    },
    model: {
      name: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      temperature: 0.2,
      maxOutputTokens: 4096,
      maxSteps: 20,
    },
  };
}
