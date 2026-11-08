import { AIChatAgent } from '@cloudflare/ai-chat';
import { createAI } from 'agents/models/ai-sdk';
import { convertToModelMessages, stepCountIs, streamText } from 'ai';
import type { Env } from '../env';
import { loadConfig } from '../config';
import { DomainClient } from '../domain/domain-client';
import { GitHubClient } from '../github/github-client';
import { createLogger } from '../observability/logger';
import { createDevTools } from '../tools/tool-registry';
import { VerificationService } from '../verification/verification.service';
import { buildDevSystemPrompt } from './dev-prompt';
import { INITIAL_DEV_AGENT_STATE, type DevAgentState } from './dev-state';
function latest(messages: unknown[]): string {
  const m = messages.at(-1) as
    { role?: string; parts?: Array<{ type?: string; text?: string }> } | undefined;
  return m?.role === 'user'
    ? (m.parts
        ?.filter((p) => p.type === 'text')
        .map((p) => p.text ?? '')
        .join('')
        .trim() ?? '')
    : '';
}
export class DevAgent extends AIChatAgent<Env, DevAgentState> {
  initialState = INITIAL_DEV_AGENT_STATE;
  async onChatMessage(): Promise<Response> {
    const log = createLogger();
    try {
      const text = latest(this.messages);
      if (text.length < 1 || text.length > 100)
        return new Response('Prompt must contain 1 to 100 characters.', { status: 400 });
      const config = loadConfig(this.env);
      const domain = new DomainClient(this.env.DOMAIN_API, log);
      const github = new GitHubClient(
        {
          ...config.github,
          token: this.env.GITHUB_TOKEN,
          pathPolicy: {
            allowedRoot: config.github.allowedRoot,
            maxFileBytes: config.github.maxFileBytes,
          },
        },
        log,
      );
      const verification = new VerificationService(this.env.WINGMAN_AGENT, log);
      const context = {
        env: this.env,
        config,
        getState: () => this.state,
        setState: (n: DevAgentState) => this.setState(n),
        domain,
        github,
        verification,
        logger: log,
      };
      const result = streamText({
        model: createAI({ binding: this.env.AI })(config.model.name),
        system: buildDevSystemPrompt({
          state: this.state,
          allowedRoot: config.github.allowedRoot,
          baseBranch: config.github.baseBranch,
        }),
        messages: await convertToModelMessages(this.messages),
        tools: createDevTools(context),
        temperature: config.model.temperature,
        maxOutputTokens: config.model.maxOutputTokens,
        stopWhen: stepCountIs(config.model.maxSteps),
      });
      return result.toUIMessageStreamResponse();
    } catch (e) {
      log.error('chat_turn_failed', { errorCode: e instanceof Error ? e.name : 'UNKNOWN' });
      return new Response('The Dev Agent turn failed. Review Worker logs and retry.', {
        status: 500,
      });
    }
  }
}
