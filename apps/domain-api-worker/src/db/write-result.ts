import { conflictError, internalError } from '../errors/app-error';
export interface ExpectedWriteResult {
  operation: string;
  expectedChanges: number;
}
function changes(result: D1Result<unknown>): number {
  return result.meta.changes ?? 0;
}
export function requireSuccessfulWrite(
  result: D1Result<unknown>,
  expectation: ExpectedWriteResult,
): void {
  if (!result.success) throw internalError();
  if (changes(result) !== expectation.expectedChanges)
    throw conflictError(`${expectation.operation} conflicted with current state`);
}
export function requireSuccessfulBatch(
  results: D1Result<unknown>[],
  expectations: ExpectedWriteResult[],
): void {
  if (results.length !== expectations.length) throw internalError();
  results.forEach((result, index) => requireSuccessfulWrite(result, expectations[index]!));
}
