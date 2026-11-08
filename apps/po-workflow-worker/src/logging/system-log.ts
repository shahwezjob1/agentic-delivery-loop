function errorFields(error: unknown): { errorName: string; errorMessage: string; stack?: string } {
  if (error instanceof Error)
    return {
      errorName: error.name,
      errorMessage: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  return { errorName: 'UnknownError', errorMessage: String(error) };
}
export function logSchedulerInfo(event: string, context: Record<string, unknown>): void {
  console.info(event, context);
}
export function logSchedulerError(
  event: string,
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  console.error(event, { ...context, ...errorFields(error) });
}
export function logRequestFailure(input: {
  workflowInstanceId: string;
  requestId: string;
  batchPosition: number;
  failedStep: string;
  error: unknown;
}): void {
  console.error('po.request.failed', {
    workflowInstanceId: input.workflowInstanceId,
    requestId: input.requestId,
    batchPosition: input.batchPosition,
    failedStep: input.failedStep,
    ...errorFields(input.error),
  });
}
