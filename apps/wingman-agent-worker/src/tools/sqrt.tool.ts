import type { Tool } from 'ai';

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
    execute: (args) => Math.sqrt(args.number),
  };
}
