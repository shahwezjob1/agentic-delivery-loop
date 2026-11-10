import { tool } from 'ai';
import { z } from 'zod';

export interface FactorialToolInput {
  n: number;
}
export interface FactorialToolOutput {
  result: number;
}

export function createFactorialTool() {
  return tool({
    description: `
Calculate the factorial of a non-negative integer. Use it whenever the user asks for the factorial of a number. Do NOT use it for negative integers or non-integers; those are unsupported, so say so instead of approximating.
`,
    inputSchema: z
      .object({
        n: z.number().finite().nonNegative().describe('Input number'),
      })
      .strict(),
    execute: async ({ n }): Promise<FactorialToolOutput> => {
      if (n === 0 || n === 1) return { result: 1 };
      let result = 1;
      for (let i = 2; i <= n; i++) {
        result *= i;
      }
      return { result };
    },
  });
}
