const MAX_ATTEMPTS = 3;

function isRetryableTransactionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; meta?: { code?: unknown }; cause?: unknown };
  const codes = [candidate.code, candidate.meta?.code];
  if (codes.some(code => code === 'P2034' || code === '40001' || code === '40P01')) return true;
  return candidate.cause !== error && isRetryableTransactionError(candidate.cause);
}

const pause = (milliseconds: number) => new Promise<void>(resolve => setTimeout(resolve, milliseconds));

/**
 * Re-run only a rolled-back database transaction after a serialization failure or deadlock.
 * Pass a callback that creates a fresh `$transaction` on each invocation; do not put network,
 * email, or other non-transactional effects inside that callback.
 */
export async function retrySessionTransaction<T>(runTransaction: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await runTransaction();
    } catch (error) {
      if (!isRetryableTransactionError(error) || attempt >= MAX_ATTEMPTS) throw error;
      await pause(5 * attempt);
    }
  }
}
