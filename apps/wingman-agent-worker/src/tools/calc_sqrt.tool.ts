import { tool } from 'ai';
import { z } from 'zod';

export interface CalcSqrtToolInput {
  num: number;
}
export interface CalcSqrtToolOutput {
  result: number;
}

export function createCalcSqrtTool() {
  return tool({
    description: `Calculate the principal square root of a non-negative real number. Use it whenever the user asks to calculate the square root of a number. Do NOT use it for negative numbers; those are unsupported, so say so instead of approximating.`,
    inputSchema: z
      .object({
        num: z.number().finite().nonnegative().describe('Number to calculate square root'),
      })
      .strict(),
    execute: async ({ num }): Promise<CalcSqrtToolOutput> => ({ result: Math.sqrt(num) }),
  });
}
