import { ERROR_CODES } from './error-codes';
export class AppError extends Error {
  readonly code: string;
  readonly fieldErrors?: Record<string, string[]>;
  override readonly cause?: unknown;
  constructor(options: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = 'AppError';
    this.code = options.code;
    if (options.fieldErrors) this.fieldErrors = options.fieldErrors;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}
export const validationError = (message: string, fieldErrors?: Record<string, string[]>) =>
  new AppError({ code: ERROR_CODES.VALIDATION_ERROR, message, fieldErrors });
export const notFoundError = (entity: string, id: string) =>
  new AppError({ code: ERROR_CODES.NOT_FOUND, message: `${entity} not found`, cause: { id } });
export const conflictError = (message: string) =>
  new AppError({ code: ERROR_CODES.CONFLICT, message });
export const invalidTransitionError = (message: string) =>
  new AppError({ code: ERROR_CODES.INVALID_TRANSITION, message });
export const internalError = (cause?: unknown) =>
  new AppError({ code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal operation failed', cause });
