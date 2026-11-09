import { tool } from 'ai';
import { z } from 'zod';
import { buildBranchName } from '../github/branch-name';
import { assertHasActiveTicket, assertStatus } from '../agent/dev-state';
import {
  markPullRequestMerged,
  recordBranch,
  recordPullRequest,
} from '../agent/lifecycle.service';
import type { DevToolContext } from './tool-context';

const DESCRIPTIONS = {
  create_branch: `
Create the working branch for the active ticket from the base branch (or reuse it if
it already exists). Takes no arguments; the branch name is fixed by the system.
Call it once, right after the ticket starts, before any file work.
`,
  list_files: `
List files and folders under the allowed Wingman tools folder. Use it first to see which
tools already exist. The optional "path" must stay inside that folder. It does not show
file contents; use read_file for that.
`,
  read_file: `
Read one .ts file from the allowed tools folder on the working branch. Use it to copy the
style of an existing tool and to read the tool registry before editing. Always read a
file before overwriting it. Returns the file text.
`,
  write_file: `
Create or overwrite one .ts file under the allowed tools folder and commit it to the
working branch. "content" must be the COMPLETE new file, not a diff or a snippet. Write
only the files the ticket needs (the new tool file and the tool registry). The optional
"commitMessage" should be a short imperative sentence.
`,
  create_pull_request: `
Open the pull request for the working branch. Call it once, only after all files for the
ticket are written. "title" must include the ticket id; "body" summarizes what was added.
Do not call it again once a pull request exists.
`,
  get_pull_request_status: `
Check whether the open pull request has been merged. Call it when the user says the pull
request is merged or asks for its status. Takes no arguments. Merged is true only when
GitHub reports a merge; if false, ask the user to wait for review and merge.
`,
};

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
      description: DESCRIPTIONS.create_branch,
      inputSchema: z.object({}).strict(),
      execute: async () => {
        const s = active();
        assertStatus(s, 'ticket_started');
        const branch = buildBranchName(s.activeTicket.id);
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
      description: DESCRIPTIONS.list_files,
      inputSchema: z.object({ path: z.string().optional() }).strict(),
      execute: async ({ path }) => {
        const s = active();
        assertStatus(s, 'branch_ready', 'pr_open');
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
      description: DESCRIPTIONS.read_file,
      inputSchema: z.object({ path: z.string() }).strict(),
      execute: async ({ path }) => {
        const s = active();
        assertStatus(s, 'branch_ready', 'pr_open');
        const f = await c.github.readText(path, s.branch ?? c.config.github.baseBranch);
        return f ? { ok: true, ...f } : { ok: false, code: 'GITHUB_NOT_FOUND' };
      },
    }),
    write_file: tool({
      description: DESCRIPTIONS.write_file,
      inputSchema: z
        .object({ path: z.string(), content: z.string(), commitMessage: z.string().optional() })
        .strict(),
      execute: async ({ path, content, commitMessage }) => {
        const s = active();
        assertStatus(s, 'branch_ready', 'pr_open');
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
      description: DESCRIPTIONS.create_pull_request,
      inputSchema: z.object({ title: z.string().min(1), body: z.string().min(1) }).strict(),
      execute: async ({ title, body }) => {
        const s = active();
        assertStatus(s, 'branch_ready');
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
      description: DESCRIPTIONS.get_pull_request_status,
      inputSchema: z.object({}).strict(),
      execute: async () => {
        const s = active();
        assertStatus(s, 'pr_open');
        if (!s.pullRequest) throw new Error('INVALID_LIFECYCLE_STATE');
        const pr = await c.github.getPullRequest(s.pullRequest.number);
        const merged = pr.merged_at !== null;
        if (merged) c.setState(markPullRequestMerged(c.getState()));
        return { ok: true, number: pr.number, url: pr.html_url, state: pr.state, merged };
      },
    }),
  };
}
