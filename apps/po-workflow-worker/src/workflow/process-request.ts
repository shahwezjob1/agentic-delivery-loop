import type { FeatureRequestDto } from '@agentic-delivery-loop/contracts';
import type { WorkflowStep } from 'cloudflare:workers';
import type { PoEnv } from '../env';
import { toEmbeddingText } from '../policies/text-normalizer';
import { embedRequestText } from '../ai/embedding.service';
import { queryCandidateMatches, upsertCanonicalVector } from '../vectorize/candidate-index';
import { loadCandidateTickets, commitPoDecision } from '../domain/domain-api.client';
import { decideCreateOrLink } from '../ai/po-decision.service';
import { appendSuccessfulPoLog } from '../logging/po-log';
import { logRequestFailure } from '../logging/system-log';
import { buildStepName, ZERO_RETRY_STEP_CONFIG } from './workflow-options';
import type { RequestProcessResult } from './workflow.types';
export async function processPendingRequest(input: {
  request: FeatureRequestDto;
  position: number;
  workflowInstanceId: string;
  step: WorkflowStep;
  env: PoEnv;
}): Promise<RequestProcessResult> {
  const name = (step: number, operation: string) =>
    buildStepName({ position: input.position, step, operation, requestId: input.request.id });
  let currentStep = name(1, 'normalize-and-embed');
  try {
    const embedded = await input.step.do(currentStep, ZERO_RETRY_STEP_CONFIG, async () =>
      embedRequestText({
        ai: input.env.AI,
        requestId: input.request.id,
        text: toEmbeddingText(input.request),
      }),
    );
    currentStep = name(2, 'query-vector-index');
    const matches = await input.step.do(currentStep, ZERO_RETRY_STEP_CONFIG, async () =>
      queryCandidateMatches({ index: input.env.TICKET_INDEX, embedding: embedded.embedding }),
    );
    currentStep = name(3, 'load-candidates');
    const candidates = await input.step.do(currentStep, ZERO_RETRY_STEP_CONFIG, async () =>
      loadCandidateTickets({ domainApi: input.env.DOMAIN_API, matches }),
    );
    currentStep = name(4, 'decide');
    const decision = await input.step.do(currentStep, ZERO_RETRY_STEP_CONFIG, async () =>
      decideCreateOrLink({ ai: input.env.AI, request: input.request, candidates }),
    );
    currentStep = name(5, 'commit');
    const commit = await input.step.do(currentStep, ZERO_RETRY_STEP_CONFIG, async () => {
      const committed = await commitPoDecision({
        domainApi: input.env.DOMAIN_API,
        request: input.request,
        decision,
        candidates,
      });
      await appendSuccessfulPoLog({
        domainApi: input.env.DOMAIN_API,
        request: input.request,
        commit: committed,
      });
      return committed;
    });
    currentStep = name(6, 'upsert-vector');
    await input.step.do(currentStep, ZERO_RETRY_STEP_CONFIG, async () => {
      if (commit.action === 'link') return { skipped: true };
      await upsertCanonicalVector({
        index: input.env.TICKET_INDEX,
        ticketId: commit.ticketId,
        embedding: embedded.embedding,
      });
      return { skipped: false };
    });
    return {
      outcome: commit.action === 'create' ? 'created' : 'linked',
      requestId: input.request.id,
      ticketId: commit.ticketId,
    };
  } catch (error) {
    logRequestFailure({
      workflowInstanceId: input.workflowInstanceId,
      requestId: input.request.id,
      batchPosition: input.position,
      failedStep: currentStep,
      error,
    });
    return { outcome: 'failed', requestId: input.request.id };
  }
}
