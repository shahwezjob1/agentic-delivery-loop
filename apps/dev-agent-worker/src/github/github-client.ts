import type { DevLogger } from '../observability/logger';
import {
  assertAllowedToolPath,
  decodeReadableText,
  encodeWritableText,
  type RepositoryPathPolicy,
} from './path-policy';
import { GitHubRequestError, mapGitHubResponseError } from './github-errors';
import type {
  CreatePullRequestInput,
  GitHubCommitResult,
  GitHubContentEntry,
  GitHubContentFile,
  GitHubPullRequest,
  GitHubRef,
  PutContentInput,
} from './github-types';
export interface GitHubClientOptions {
  owner: string;
  repository: string;
  baseBranch: string;
  token: string;
  apiVersion: string;
  userAgent: string;
  pathPolicy: RepositoryPathPolicy;
}
const b64e = (b: Uint8Array) => {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
};
const b64d = (s: string) => Uint8Array.from(atob(s.replace(/\s/g, '')), (c) => c.charCodeAt(0));
export class GitHubClient {
  constructor(
    private o: GitHubClientOptions,
    private log: DevLogger,
  ) {}
  private headers() {
    return new Headers({
      Authorization: `Bearer ${this.o.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': this.o.apiVersion,
      'User-Agent': this.o.userAgent,
      'Content-Type': 'application/json',
    });
  }
  private repo(p: string) {
    return `/repos/${encodeURIComponent(this.o.owner)}/${encodeURIComponent(this.o.repository)}${p}`;
  }
  private async request<T>(
    p: string,
    init: RequestInit = {},
    nullable404 = false,
  ): Promise<T | null> {
    const started = Date.now();
    const r = await fetch(`https://api.github.com${this.repo(p)}`, {
      ...init,
      headers: this.headers(),
    });
    let body: unknown = null;
    if (r.status !== 204) body = await r.json().catch(() => null);
    this.log.info('github_request_completed', {
      category: p.split('/')[1],
      status: r.status,
      durationMs: Date.now() - started,
    });
    if (nullable404 && r.status === 404) return null;
    if (!r.ok) throw new GitHubRequestError(mapGitHubResponseError(r, body));
    return body as T;
  }
  getRef(ref: string) {
    return this.request<GitHubRef>(`/git/ref/${encodeURIComponent(ref)}`, {}, true);
  }
  createRef(ref: string, sha: string) {
    return this.request<GitHubRef>('/git/refs', {
      method: 'POST',
      body: JSON.stringify({ ref, sha }),
    }) as Promise<GitHubRef>;
  }
  async listFiles(path: string, ref: string) {
    const p = assertAllowedToolPath(
      path.endsWith('.ts') ? path : `${path.replace(/\/$/, '')}/placeholder.ts`,
      this.o.pathPolicy,
    ).replace(/placeholder\.ts$/, '');
    return (await this.request<GitHubContentEntry[]>(
      `/contents/${p}?ref=${encodeURIComponent(ref)}`,
    )) as GitHubContentEntry[];
  }
  async getContent(path: string, ref: string) {
    const p = assertAllowedToolPath(path, this.o.pathPolicy);
    const f = await this.request<GitHubContentFile>(
      `/contents/${p}?ref=${encodeURIComponent(ref)}`,
      {},
      true,
    );
    if (!f) return null;
    decodeReadableText(b64d(f.content), this.o.pathPolicy.maxFileBytes);
    return f;
  }
  async readText(path: string, ref: string) {
    const f = await this.getContent(path, ref);
    return f
      ? {
          path: f.path,
          sha: f.sha,
          content: decodeReadableText(b64d(f.content), this.o.pathPolicy.maxFileBytes),
        }
      : null;
  }
  putContent(i: PutContentInput) {
    const p = assertAllowedToolPath(i.path, this.o.pathPolicy);
    const content = b64e(encodeWritableText(i.content, this.o.pathPolicy.maxFileBytes));
    return this.request<GitHubCommitResult>(`/contents/${p}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: i.message,
        content,
        branch: i.branch,
        ...(i.sha ? { sha: i.sha } : {}),
      }),
    }) as Promise<GitHubCommitResult>;
  }
  listPullRequestsByHead(head: string) {
    return this.request<GitHubPullRequest[]>(
      `/pulls?state=all&head=${encodeURIComponent(`${this.o.owner}:${head}`)}`,
    ) as Promise<GitHubPullRequest[]>;
  }
  createPullRequest(i: CreatePullRequestInput) {
    return this.request<GitHubPullRequest>('/pulls', {
      method: 'POST',
      body: JSON.stringify(i),
    }) as Promise<GitHubPullRequest>;
  }
  getPullRequest(n: number) {
    return this.request<GitHubPullRequest>(`/pulls/${n}`) as Promise<GitHubPullRequest>;
  }
}
