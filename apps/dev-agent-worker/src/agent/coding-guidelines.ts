// Conventions for a new Wingman tool. Keep in sync with apps/wingman-agent-worker/src/tools.
export const CODING_GUIDELINES = `
Coding guidelines for a new Wingman tool (copy the existing tools exactly):
- One tool per file, named <kebab-name>.tool.ts, inside the tools folder.
- Export one factory named create<PascalName>Tool() that returns tool({ ... }) from 'ai'.
- Also export small input/output interfaces named <Pascal>ToolInput and <Pascal>ToolOutput.
- Define inputSchema with z.object({ ... }).strict() (zod). Use z.number().finite() for numbers.
- Write a description that says what the tool does, when to use it, and when NOT to use it.
- execute is async and returns a small plain object such as { result }.
- Tools that need no Worker binding take no arguments and make no network calls.
- Register the tool in the tool registry file: import its factory and add one entry to the
  returned object. The key is the snake_case tool name (for example mult), and the tool
  file name uses the same name (mult.tool.ts).
- TypeScript only. No new dependencies, no console.log, no comments that repeat the code.
- Match the quotes, semicolons and indentation of the files you read.
`;
