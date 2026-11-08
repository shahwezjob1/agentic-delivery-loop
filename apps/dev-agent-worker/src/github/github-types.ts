export interface GitHubRef {
  ref: string;
  object: { sha: string };
}
export interface GitHubContentFile {
  type: 'file';
  path: string;
  sha: string;
  content: string;
  encoding: 'base64';
  size: number;
}
export interface GitHubContentEntry {
  type: 'file' | 'dir';
  path: string;
  sha: string;
  size: number;
}
export interface GitHubCommitResult {
  content: { path: string; sha: string };
  commit: { sha: string };
}
export interface GitHubPullRequest {
  number: number;
  html_url: string;
  state: 'open' | 'closed';
  merged_at: string | null;
  head: { ref: string };
  base: { ref: string };
}
export interface CreatePullRequestInput {
  title: string;
  body: string;
  head: string;
  base: string;
}
export interface PutContentInput {
  path: string;
  content: string;
  message: string;
  branch: string;
  sha?: string;
}
