import type { RpcResult } from '@agentic-delivery-loop/contracts';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error';
import { ERROR_CODES } from '../errors/error-codes';
import { rpcSuccess } from './rpc-result';
function zodFields(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_root';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
export async function toRpcResult<T>(work: () => Promise<T>): Promise<RpcResult<T>> {
  const started = Date.now();
  try {
    const data = await work();
    console.log('domain_rpc_success', { durationMs: Date.now() - started });
    return rpcSuccess(data);
  } catch (error) {
    if (error instanceof ZodError)
      return {
        ok: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Input validation failed',
          fieldErrors: zodFields(error),
        },
      };
    if (error instanceof AppError) {
      console.log('domain_rpc_failure', { code: error.code, durationMs: Date.now() - started });
      const e: { code: string; message: string; fieldErrors?: Record<string, string[]> } = {
        code: error.code,
        message: error.message,
      };
      if (error.fieldErrors) e.fieldErrors = error.fieldErrors;
      return { ok: false, error: e };
    }
    console.error('domain_rpc_failure', {
      code: ERROR_CODES.INTERNAL_ERROR,
      durationMs: Date.now() - started,
    });
    return {
      ok: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal operation failed' },
    };
  }
}
