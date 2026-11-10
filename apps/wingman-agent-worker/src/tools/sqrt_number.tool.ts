import { tool } from 'ai';
import { z } from 'zod';

export interface SqrtNumberToolInput {
  number: number;
}
export interface SqrtNumberToolOutput {
  result: number;
}

export function createSqrtNumberTool() {
  return tool({
    description: `
    Calculate the principal square root of a non-negative number. Use it whenever the user asks to
    calculate the square root of a number. Do NOT use it for negative numbers or non-numeric inputs;
    those are unsupported, so say so instead of approximating. Inputs must be real numbers, not text.
    `,    
    inputSchema: z
      .object({
        number: z.number().finite().nonnegative().describe('Number to calculate square root'),
      })
      .strict(),
    execute: async ({ number }): Promise<SqrtNumberToolOutput> => ({ result: Number(Math.sqrt(number).toFixed(2)) }),
  });
}
