import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import type { PoEnv } from '../env';
import { loadPendingRequests } from '../domain/domain-api.client';
import { logSchedulerError, logSchedulerInfo } from '../logging/system-log';
import { processPendingRequest } from './process-request';
import { ZERO_RETRY_STEP_CONFIG } from './workflow-options';
import type { PoRunSummary, PoWorkflowParams } from './workflow.types';
export class PoWorkflow extends WorkflowEntrypoint<PoEnv, PoWorkflowParams> {
  override async run(
    event: WorkflowEvent<PoWorkflowParams>,
    step: WorkflowStep,
  ): Promise<PoRunSummary> {
    logSchedulerInfo('po.run.started', { workflowInstanceId: event.instanceId });
    let requests;
    try {
      requests = await step.do('load-pending-requests', ZERO_RETRY_STEP_CONFIG, async () =>
        loadPendingRequests({ domainApi: this.env.DOMAIN_API }),
      );
    } catch (error) {
      logSchedulerError('po.run.batch-load-failed', error, {
        workflowInstanceId: event.instanceId,
      });
      throw error;
    }
    const summary: PoRunSummary = { selected: requests.length, created: 0, linked: 0, failed: 0 };
    for (const [index, request] of requests.entries()) {
      const result = await processPendingRequest({
        request,
        position: index + 1,
        workflowInstanceId: event.instanceId,
        step,
        env: this.env,
      });
      if (result.outcome === 'created') summary.created += 1;
      else if (result.outcome === 'linked') summary.linked += 1;
      else summary.failed += 1;
    }
    logSchedulerInfo('po.run.completed', { workflowInstanceId: event.instanceId, ...summary });
    return summary;
  }
}
