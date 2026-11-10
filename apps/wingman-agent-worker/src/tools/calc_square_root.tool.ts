import { tool } from 'ai';
import { z } from 'zod';

export interface CalcSquareRootToolInput {
  num: number;
}
export interface CalcSquareRootToolOutput {
  result: number | string;
}

export function createCalcSquareRootTool() {
  return tool({
    description: `
    Calculate square root. Use it whenever the user asks to calculate square root. Do NOT use it for other calculations; those are unsupported, so say so instead of approximating. Inputs must be real numbers, not text.
    `,    
    inputSchema: z
      .object({
        num: z.number().finite().describe('Number to calculate square root'),
      })
      .strict(),
    execute: async ({ num }): Promise<CalcSquareRootToolOutput> => {
      if (num < 0) {
        return { result: 'no real square root' };
      } else if (num === 0) {
        return { result: 0 };
      } else {
        return { result: Math.sqrt(num) };
      }
    },
  });
}
