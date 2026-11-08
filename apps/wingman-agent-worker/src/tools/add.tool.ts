import { tool } from 'ai';
import { z } from 'zod';

export interface AddToolInput {
  left: number;
  right: number;
}
export interface AddToolOutput {
  result: number;
}

export function createAddTool() {
  return tool({
    description: 'Add exactly two finite numbers. This tool performs addition only.',
    inputSchema: z
      .object({
        left: z.number().finite(),
        right: z.number().finite(),
      })
      .strict(),
    execute: async ({ left, right }): Promise<AddToolOutput> => ({ result: left + right }),
  });
}
