import type { PoEnv } from './env';
import { handleScheduled } from './scheduler/scheduled-handler';
export { PoWorkflow } from './workflow/po-workflow';
export default {
  scheduled(controller, env, ctx) {
    ctx.waitUntil(handleScheduled(controller, env));
  },
} satisfies ExportedHandler<PoEnv>;
