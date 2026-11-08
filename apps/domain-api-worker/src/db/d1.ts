import type { Env } from '../env';
import { internalError } from '../errors/app-error';
export function getDb(env: Env): D1Database {
  if (!env.DB) throw internalError();
  return env.DB;
}
