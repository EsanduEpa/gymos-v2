import { describe, expect, it } from 'vitest';
import { exportRequestSignal, LatestRequestSequence } from '@gymos/contracts';

describe('Segment 08 client transport safeguards', () => {
  it('keeps newer dashboard data when the older refresh resolves last', async () => {
    const sequence = new LatestRequestSequence();
    let data = 'initial';
    const pending: Array<{ id: number; resolve: (value: string) => void }> = [];
    const refresh = () => new Promise<string>((resolve) => pending.push({ id: sequence.begin(), resolve }));
    const apply = async (request: Promise<string>, id: number) => {
      const value = await request;
      if (sequence.isCurrent(id)) data = value;
    };

    const older = refresh();
    const olderId = pending[0]!.id;
    const olderApplied = apply(older, olderId);
    const newer = refresh();
    const newerId = pending[1]!.id;
    const newerApplied = apply(newer, newerId);

    pending[1]!.resolve('newer dashboard');
    await newerApplied;
    pending[0]!.resolve('older dashboard');
    await olderApplied;

    expect(data).toBe('newer dashboard');
  });

  it('propagates caller cancellation to the proxied CSV fetch signal', () => {
    const request = new AbortController();
    const signal = exportRequestSignal(request.signal);
    request.abort();
    expect(signal.aborted).toBe(true);
  });
});
