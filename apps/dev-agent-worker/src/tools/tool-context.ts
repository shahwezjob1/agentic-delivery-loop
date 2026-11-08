import type { DevConfig } from '../config';
import type { DomainClient } from '../domain/domain-client';
import type { Env } from '../env';
import type { GitHubClient } from '../github/github-client';
import type { DevLogger } from '../observability/logger';
import type { VerificationService } from '../verification/verification.service';
import type { DevAgentState } from '../agent/dev-state';
export interface DevToolContext {
  env: Env;
  config: DevConfig;
  getState(): DevAgentState;
  setState(n: DevAgentState): void;
  domain: DomainClient;
  github: GitHubClient;
  verification: VerificationService;
  logger: DevLogger;
}
