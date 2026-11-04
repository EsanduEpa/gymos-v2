import { describe, expect, it, vi } from 'vitest';
import { retrySessionTransaction } from './session-transactions.js';

describe('retrySessionTransaction', () => {
  it('replays a fresh transaction for serialization and deadlock errors with a bounded attempt count', async () => {
    const transaction = vi.fn()
      .mockRejectedValueOnce({ code: 'P2034' })
      .mockRejectedValueOnce({ code: '40P01' })
      .mockResolvedValue('committed');

    await expect(retrySessionTransaction(transaction)).resolves.toBe('committed');
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it('recognizes a PostgreSQL serialization code nested in Prisma metadata', async () => {
    const transaction = vi.fn()
      .mockRejectedValueOnce({ code: 'P2010', meta: { code: '40001' } })
      .mockResolvedValue('committed');

    await expect(retrySessionTransaction(transaction)).resolves.toBe('committed');
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it('does not retry constraint failures or other application errors', async () => {
    const error = { code: 'P2002' };
    const transaction = vi.fn().mockRejectedValue(error);

    await expect(retrySessionTransaction(transaction)).rejects.toBe(error);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('stops after three repeated retryable failures', async () => {
    const error = { code: '40P01' };
    const transaction = vi.fn().mockRejectedValue(error);

    await expect(retrySessionTransaction(transaction)).rejects.toBe(error);
    expect(transaction).toHaveBeenCalledTimes(3);
  });
});
