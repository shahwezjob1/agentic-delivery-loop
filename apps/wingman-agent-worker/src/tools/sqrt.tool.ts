import type { Tool } from 'ai';
import { InputSchema, OutputSchema } from './add.tool';

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
    inputSchema: {
      type: 'object',
      properties: {
        number: {
          type: 'number',
        },
      },
      required: ['number'],
    },
    outputSchema: {
      type: 'number',
    },
    execute: (args: InputSchema) => Math.sqrt(args.number),
  };
}
