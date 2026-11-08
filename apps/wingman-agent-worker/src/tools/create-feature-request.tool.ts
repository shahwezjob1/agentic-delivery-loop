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
    description:
      'Create one feature request after its name, description, and user intent are clear.',
    inputSchema: z
      .object({
        name: z
          .string()
          .transform(normalizeText)
          .pipe(z.string().min(1).max(FEATURE_REQUEST_NAME_MAX_LENGTH)),
        description: z
          .string()
          .transform(normalizeText)
          .pipe(z.string().min(1).max(FEATURE_REQUEST_DESCRIPTION_MAX_LENGTH)),
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
