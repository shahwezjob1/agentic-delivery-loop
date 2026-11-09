import { tool } from 'ai';
import { z } from 'zod';

export interface MultToolInput {
  left: number;
  right: number;
}
export interface MultToolOutput {
  result: number;
}

export function createMultTool() {
  return tool({
    description: 'Multiply exactly two finite numbers. This tool performs multiplication only.',
    inputSchema: z
      .object({
        left: z.number().finite(),
        right: z.number().finite(),
      })
      .strict(),
    execute: async ({ left, right }): Promise<MultToolOutput> => ({ result: left * right }),
  });
}
