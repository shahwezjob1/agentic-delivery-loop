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
    description: `
Multiply exactly two numbers and return their product. Use it whenever the user asks to
multiply two numbers, even easy ones. Do NOT use it for addition, subtraction, division,
more than two numbers, or any other calculation; those are unsupported, so say so instead
of approximating. Inputs must be real numbers, not text.
`,
    inputSchema: z
      .object({
        left: z.number().finite().describe('First number to multiply'),
        right: z.number().finite().describe('Second number to multiply'),
      })
      .strict(),
    execute: async ({ left, right }): Promise<MultToolOutput> => ({ result: left * right }),
  });
}
