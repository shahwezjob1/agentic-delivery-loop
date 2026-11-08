export interface WorkerErrorLog {
  event: string;
  route: string;
  operation?: string;
  page?: number;
  status?: string;
  rpcErrorCode?: string;
  errorName: string;
  message: string;
  timestamp: string;
}
export function errorMetadata(error: unknown) {
  return error instanceof Error
    ? { errorName: error.name, message: error.message }
    : { errorName: 'UnknownError', message: 'Unknown failure' };
}
export function logWorkerError(entry: WorkerErrorLog): void {
  console.error(entry);
}
