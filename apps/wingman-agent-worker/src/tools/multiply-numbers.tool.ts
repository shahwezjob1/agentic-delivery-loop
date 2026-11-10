import { tool } from 'ai';
import { z } from 'zod';

export interface MultiplyNumbersToolInput {
  a: number;
  b: number;
}
export interface MultiplyNumbersToolOutput {
  product: number;
}

export function createMultiplyNumbersTool() {
  return tool({
    description: `
      Multiply two real numbers and return their product. Use it whenever the user asks to multiply, scale or
      expand two numbers, even easy ones. Do NOT use it for addition, subtraction, division, more than two numbers,
      or any other calculation; those are unsupported, so say so instead of approximating. Inputs must be real numbers,
      not text.
    `,    
    inputSchema: z
      .object({
        a: z.number().finite().describe('First number to multiply'),
        b: z.number().finite().describe('Second number to multiply'),
      })
      .strict(),
    execute: async ({ a, b }): Promise<MultiplyNumbersToolOutput> => ({ product: a * b }),
  });
}
