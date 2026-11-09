import type { Tool } from 'ai';
import { z } from 'zod';

export const SqrtInputSchema = z.object({
  number: z.number(),
});

export const SqrtOutputSchema = z.number();

export function createSqrtTool(): Tool {
  return {
    name: 'sqrt',
    description: 'Calculate square root',
    parameters: [
      {
        name: 'number',
        type: 'number',
      },
    ],
    inputSchema: SqrtInputSchema,
    outputSchema: SqrtOutputSchema,
    execute: (args: z.infer<typeof SqrtInputSchema>) => Math.sqrt(args.number),
  };
}
