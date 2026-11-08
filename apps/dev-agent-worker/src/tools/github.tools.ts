import { tool } from 'ai';
import { z } from 'zod';
import { buildBranchName } from '../github/branch-name';
import { assertHasActiveTicket } from '../agent/dev-state';
import { recordBranch, recordPullRequest } from '../agent/lifecycle.service';
import type { DevToolContext } from './tool-context';
export function createGitHubTools(c: DevToolContext) {
  const active = () => {
    const s = c.getState();
    assertHasActiveTicket(s);
    return s;
  };
  const deps = {
    domain: c.domain,
    github: c.github,
    getState: c.getState,
    setState: c.setState,
    log: c.logger,
  };
  return {
    create_branch: tool({
      description: 'Create or reuse the fixed branch for the active ticket.',
      inputSchema: z.object({}).strict(),
      execute: async () => {
        const s = active(),
          branch = buildBranchName(s.activeTicket.id);
        const existing = await c.github.getRef(`heads/${branch}`);
        if (!existing) {
          const base = await c.github.getRef(`heads/${c.config.github.baseBranch}`);
          if (!base) throw new Error('GITHUB_NOT_FOUND');
          await c.github.createRef(`refs/heads/${branch}`, base.object.sha);
        }
        c.setState(recordBranch(s, branch));
        return { ok: true, branch, reused: !!existing };
      },
    }),
    list_files: tool({
      description: 'List TypeScript files in the allowed tools area.',
      inputSchema: z.object({ path: z.string().optional() }).strict(),
      execute: async ({ path }) => {
        const s = active();
        return {
          ok: true,
          files: await c.github.listFiles(
            path ?? c.config.github.allowedRoot,
            s.branch ?? c.config.github.baseBranch,
          ),
        };
      },
    }),
    read_file: tool({
      description: 'Read a TypeScript file from the allowed tools area.',
      inputSchema: z.object({ path: z.string() }).strict(),
      execute: async ({ path }) => {
        const s = active();
        const f = await c.github.readText(path, s.branch ?? c.config.github.baseBranch);
        return f ? { ok: true, ...f } : { ok: false, code: 'GITHUB_NOT_FOUND' };
      },
    }),
    write_file: tool({
      description: 'Create or update a TypeScript file on the active branch.',
      inputSchema: z
        .object({ path: z.string(), content: z.string(), commitMessage: z.string().optional() })
        .strict(),
      execute: async ({ path, content, commitMessage }) => {
        const s = active();
        if (!s.branch) throw new Error('Create the branch before writing files.');
        const current = await c.github.readText(path, s.branch);
        const result = await c.github.putContent({
          path,
          content,
          branch: s.branch,
          message: commitMessage ?? `ticket ${s.activeTicket.id}: update ${path.split('/').at(-1)}`,
          ...(current ? { sha: current.sha } : {}),
        });
        return { ok: true, path, commitSha: result.commit.sha };
      },
    }),
    create_pull_request: tool({
      description: 'Create or reuse a pull request for the active branch.',
      inputSchema: z.object({ title: z.string().min(1), body: z.string().min(1) }).strict(),
      execute: async ({ title, body }) => {
        const s = active();
        if (!s.branch) throw new Error('Create the branch first.');
        let pr = (await c.github.listPullRequestsByHead(s.branch))[0];
        pr ??= await c.github.createPullRequest({
          title,
          body,
          head: s.branch,
          base: c.config.github.baseBranch,
        });
        await recordPullRequest(deps, {
          number: pr.number,
          url: pr.html_url,
          branch: s.branch,
          baseBranch: c.config.github.baseBranch,
        });
        return { ok: true, number: pr.number, url: pr.html_url };
      },
    }),
    get_pull_request_status: tool({
      description: 'Get pull request merge status.',
      inputSchema: z.object({ pullRequestNumber: z.number().int().positive() }).strict(),
      execute: async ({ pullRequestNumber }) => {
        const pr = await c.github.getPullRequest(pullRequestNumber);
        return {
          ok: true,
          number: pr.number,
          url: pr.html_url,
          state: pr.state,
          merged: pr.merged_at !== null,
        };
      },
    }),
  };
}
