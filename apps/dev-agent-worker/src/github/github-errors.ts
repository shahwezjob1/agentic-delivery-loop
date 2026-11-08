export type GitHubErrorCode =
  | 'GITHUB_NOT_FOUND'
  | 'GITHUB_CONTENT_CONFLICT'
  | 'GITHUB_RATE_LIMITED'
  | 'GITHUB_UNAUTHORIZED'
  | 'GITHUB_FORBIDDEN'
  | 'GITHUB_REQUEST_FAILED';
export interface GitHubErrorDetails {
  code: GitHubErrorCode;
  message: string;
  status?: number;
  retryable: boolean;
}
export class GitHubRequestError extends Error {
  constructor(readonly details: GitHubErrorDetails) {
    super(details.message);
  }
}
export function mapGitHubResponseError(r: Response, _b: unknown): GitHubErrorDetails {
  const m: Record<number, GitHubErrorDetails> = {
    401: {
      code: 'GITHUB_UNAUTHORIZED',
      message: 'GitHub authentication failed.',
      status: 401,
      retryable: false,
    },
    403: {
      code:
        r.headers.get('x-ratelimit-remaining') === '0' ? 'GITHUB_RATE_LIMITED' : 'GITHUB_FORBIDDEN',
      message: 'GitHub rejected the request.',
      status: 403,
      retryable: true,
    },
    404: {
      code: 'GITHUB_NOT_FOUND',
      message: 'GitHub resource was not found.',
      status: 404,
      retryable: false,
    },
    409: {
      code: 'GITHUB_CONTENT_CONFLICT',
      message: 'GitHub content changed concurrently.',
      status: 409,
      retryable: true,
    },
    422: {
      code: 'GITHUB_CONTENT_CONFLICT',
      message: 'GitHub rejected the content update.',
      status: 422,
      retryable: false,
    },
  };
  return (
    m[r.status] ?? {
      code: 'GITHUB_REQUEST_FAILED',
      message: `GitHub request failed with status ${r.status}.`,
      status: r.status,
      retryable: r.status >= 500,
    }
  );
}
