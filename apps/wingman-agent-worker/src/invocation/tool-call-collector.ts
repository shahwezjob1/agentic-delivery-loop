import type { JsonValue, WingmanTurnResult } from '@agentic-delivery-loop/contracts';

function jsonSafe(value: unknown): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (typeof value === 'object') {
    const output: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value)) {
      if (child !== undefined && typeof child !== 'function') output[key] = jsonSafe(child);
    }
    return output;
  }
  if (typeof value === 'bigint') return value.toString();
  return String(value);
}

export async function collectWingmanTurnResult(
  result: ReturnType<typeof import('../agent/turn-executor').executeWingmanTurn>,
): Promise<WingmanTurnResult> {
  const resultView = result as unknown as Record<string, unknown>;
  const fieldNames = [
    'text',
    'reasoning',
    'reasoningText',
    'files',
    'sources',
    'toolCalls',
    'toolResults',
    'steps',
    'finishReason',
    'usage',
    'totalUsage',
    'warnings',
    'providerMetadata',
    'request',
    'response',
  ] as const;

  const entries = await Promise.all(
    fieldNames.map(
      async (fieldName) => [fieldName, await Promise.resolve(resultView[fieldName])] as const,
    ),
  );

  return jsonSafe(Object.fromEntries(entries)) as WingmanTurnResult;
}
