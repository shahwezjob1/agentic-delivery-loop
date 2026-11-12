import { tool } from 'ai';
import { z } from 'zod';

export interface CalcSquareRootToolInput {
  number: number;
}
export interface CalcSquareRootToolOutput {
  result: number;
}

export function createCalcSquareRootTool() {
  return tool({
    description: `
Calculate square root of a non-negative real number. Use it whenever the user asks to calculate square root. Do NOT use it for negative numbers; those are unsupported, so say so instead of approximating. Inputs must be real numbers, not text.
`,
    inputSchema: z
      .object({
        number: z.number().finite().nonnegative().describe('Number to calculate square root'),
      })
      .strict(),
    execute: async ({ number }): Promise<CalcSquareRootToolOutput> => ({ result: Math.sqrt(number) }),
  });
}
