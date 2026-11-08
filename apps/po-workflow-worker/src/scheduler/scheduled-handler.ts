import type { PoEnv } from '../env';
import { logSchedulerError, logSchedulerInfo } from '../logging/system-log';
import {
  classifyWorkflowStatus,
  PO_WORKFLOW_INSTANCE_ID,
  type KnownWorkflowStatus,
} from './singleton-policy';
function isMissingInstance(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const candidate = error as Error & { code?: number | string; status?: number };
  return (
    candidate.status === 404 ||
    candidate.code === 404 ||
    candidate.code === 'NOT_FOUND' ||
    /not found|does not exist/i.test(candidate.message)
  );
}
export async function handleScheduled(_controller: ScheduledController, env: PoEnv): Promise<void> {
  let instance;
  try {
    instance = await env.PO_WORKFLOW.get(PO_WORKFLOW_INSTANCE_ID);
    const state = await instance.status();
    const action = classifyWorkflowStatus(state.status as KnownWorkflowStatus);
    if (action === 'skip-active') {
      logSchedulerInfo('po.scheduler.active-instance-skipped', {
        workflowInstanceId: PO_WORKFLOW_INSTANCE_ID,
        status: state.status,
      });
      return;
    }
    if (action === 'restart') {
      await instance.restart();
      logSchedulerInfo('po.scheduler.instance-restarted', {
        workflowInstanceId: PO_WORKFLOW_INSTANCE_ID,
        previousStatus: state.status,
      });
      return;
    }
    logSchedulerError(
      'po.scheduler.unknown-status',
      new Error(`Unrecognized workflow status: ${state.status}`),
      { workflowInstanceId: PO_WORKFLOW_INSTANCE_ID },
    );
  } catch (error) {
    if (isMissingInstance(error)) {
      try {
        await env.PO_WORKFLOW.create({ id: PO_WORKFLOW_INSTANCE_ID, params: { trigger: 'cron' } });
        logSchedulerInfo('po.scheduler.instance-created', {
          workflowInstanceId: PO_WORKFLOW_INSTANCE_ID,
        });
      } catch (createError) {
        logSchedulerError('po.scheduler.lifecycle-failed', createError, {
          workflowInstanceId: PO_WORKFLOW_INSTANCE_ID,
          operation: 'create',
        });
      }
      return;
    }
    logSchedulerError('po.scheduler.lifecycle-failed', error, {
      workflowInstanceId: PO_WORKFLOW_INSTANCE_ID,
      operation: instance ? 'status-or-restart' : 'get',
    });
  }
}
