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
    description: `
Add exactly two numbers and return their sum. Use it whenever the user asks to add, sum or
total two numbers, even easy ones. Do NOT use it for subtraction, multiplication, division,
more than two numbers, or any other calculation; those are unsupported, so say so instead
of approximating. Inputs must be real numbers, not text.
`,
    inputSchema: z
      .object({
        left: z.number().finite().describe('First number to add'),
        right: z.number().finite().describe('Second number to add'),
      })
      .strict(),
    execute: async ({ left, right }): Promise<AddToolOutput> => ({ result: left + right }),
  });
}
