import type { FeatureRequestDto, RpcResult } from '@agentic-delivery-loop/contracts';
import { tool } from 'ai';
import { z } from 'zod';
import { DomainRpcError, unwrapRpcResult } from '../domain/domain-rpc';

export const FEATURE_REQUEST_NAME_MAX_LENGTH = 50;
export const FEATURE_REQUEST_DESCRIPTION_MAX_LENGTH = 1000;

export interface CreateFeatureRequestToolInput {
  name: string;
  description: string;
}
export type CreateFeatureRequestToolResult =
  { ok: true; request: FeatureRequestDto } | { ok: false; error: string };

type DomainApiBinding = {
  createRequest(input: CreateFeatureRequestToolInput): Promise<RpcResult<FeatureRequestDto>>;
};

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function createFeatureRequestTool(domainApi: DomainApiBinding) {
  return tool({
    description: `
Record a feature request for a capability Wingman does not have yet. Use it only after the
user has agreed to raise a request or clearly asked for one, and you understand the
behaviour, inputs, outputs and at least one example. Do NOT use it for things an existing
tool can do, for vague ideas still being discussed, or for the same feature twice in this
conversation. Returns the created request, or an error message you should relay.
`,
    inputSchema: z
      .object({
        name: z
          .string()
          .transform(normalizeText)
          .pipe(z.string().min(1).max(FEATURE_REQUEST_NAME_MAX_LENGTH))
          .describe('Short title, at most 50 characters'),
        description: z
          .string()
          .transform(normalizeText)
          .pipe(z.string().min(1).max(FEATURE_REQUEST_DESCRIPTION_MAX_LENGTH))
          .describe(
            'Self-contained spec for a developer: behaviour, inputs, outputs, examples and edge cases; at most 1000 characters',
          ),
      })
      .strict(),
    execute: async (input): Promise<CreateFeatureRequestToolResult> => {
      try {
        const request = unwrapRpcResult(await domainApi.createRequest(input));
        return { ok: true, request };
      } catch (error) {
        if (error instanceof DomainRpcError) return { ok: false, error: error.message };
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Unable to create feature request.',
        };
      }
    },
  });
}
