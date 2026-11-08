export interface RpcError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export type RpcResult<T> = { ok: true; data: T } | { ok: false; error: RpcError };

export function isRpcSuccess<T>(result: RpcResult<T>): result is { ok: true; data: T } {
  return result.ok;
}
