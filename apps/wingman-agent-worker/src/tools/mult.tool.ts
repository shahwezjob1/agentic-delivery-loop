import type { Tool } from 'ai';

export function createMultTool(): Tool {
  return {
    name: 'mult',
    description: 'Multiply two finite numbers',
    execute: (args: any[]) => {
      if (args.length !== 2) {
        throw new Error('Expected two arguments');
      }
      return args[0] * args[1];
    },
  };
}