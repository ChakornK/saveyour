import type { ClassifiedFailure, FailureCategory } from "./integration-contract";

export interface RetryDecision {
  retry: boolean;
  nextAttemptAt?: string;
}

const retryableCategories = new Set<FailureCategory>(["transient", "persistence", "media"]);

export const classifyFailure = (
  category: FailureCategory,
  code: string,
  error: unknown,
  attempt: number,
  correlationId: string,
  maxAttempts = 5,
): ClassifiedFailure => ({
  category,
  code,
  message: error instanceof Error ? error.message : "Operation failed",
  retryable: retryableCategories.has(category) && attempt < maxAttempts,
  attempt,
  correlationId,
});

export const retryDecision = (
  failure: ClassifiedFailure,
  baseDelayMs = 1000,
  jitter = Math.random(),
): RetryDecision => {
  if (!failure.retryable) return { retry: false };
  const delay = Math.min(baseDelayMs * 2 ** Math.max(0, failure.attempt - 1), 60_000);
  return { retry: true, nextAttemptAt: new Date(Date.now() + delay + Math.floor(delay * jitter)).toISOString() };
};
