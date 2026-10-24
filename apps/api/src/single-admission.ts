/** Private concurrency-one helper for existing API provisioning; not a service. */
import { AdmissionUnavailable } from './bounded-tenant-leases.js';
type ClockTimer = ReturnType<typeof setTimeout>;
type Turn = { resolve: () => void; reject: (error: AdmissionUnavailable) => void; timer?: ClockTimer; deadline: number };
export class SingleAdmission {
  private active = false;
  private stopping = false;
  private queue: Turn[] = [];
  private drainPromise?: Promise<void>;
  private finish?: () => void;
  private drainTimer?: ClockTimer;
  constructor(private readonly config: {
    admissionMs: number; drainMs: number; maxQueued: number; now: () => number;
    setTimer: (fn: () => void, delay: number) => ClockTimer;
    clearTimer: (id?: ClockTimer) => void; onDrainTimeout: () => void;
  } = {
    admissionMs: 3000, drainMs: 10000, maxQueued: 64, now: () => performance.now(),
    setTimer: (fn, delay) => setTimeout(fn, delay), clearTimer: (id) => clearTimeout(id), onDrainTimeout: () => {},
  }) {}
  async run<T>(work: () => Promise<T>): Promise<T> {
    await this.acquire();
    try { return await work(); }
    finally {
      this.active = false;
      this.pump();
      if (this.stopping) { this.config.clearTimer(this.drainTimer); this.finish?.(); }
    }
  }
  private async acquire(): Promise<void> {
    if (this.stopping) throw new AdmissionUnavailable('DRAINING');
    if (this.queue.length >= this.config.maxQueued) throw new AdmissionUnavailable('QUEUE_FULL');
    return new Promise<void>((resolve, reject) => {
      const turn: Turn = { resolve, reject, deadline: this.config.now() + this.config.admissionMs };
      turn.timer = this.config.setTimer(() => {
        const index = this.queue.indexOf(turn);
        if (index >= 0) { this.queue.splice(index, 1); reject(new AdmissionUnavailable('ADMISSION_TIMEOUT')); this.pump(); }
      }, this.config.admissionMs);
      turn.timer?.unref?.();
      this.queue.push(turn); this.pump();
    });
  }
  private pump(): void {
    if (this.active || this.stopping) return;
    while (this.queue.length) {
      const turn = this.queue.shift()!; this.config.clearTimer(turn.timer);
      if (this.config.now() >= turn.deadline) { turn.reject(new AdmissionUnavailable('ADMISSION_TIMEOUT')); continue; }
      this.active = true; turn.resolve(); return;
    }
  }
  drain(): Promise<void> {
    if (this.drainPromise) return this.drainPromise;
    this.stopping = true;
    for (const turn of this.queue.splice(0)) { this.config.clearTimer(turn.timer); turn.reject(new AdmissionUnavailable('DRAINING')); }
    this.drainPromise = new Promise<void>((resolve) => { this.finish = resolve; });
    if (!this.active) this.finish?.();
    else { this.drainTimer = this.config.setTimer(this.config.onDrainTimeout, this.config.drainMs); this.drainTimer?.unref?.(); }
    return this.drainPromise;
  }
}
