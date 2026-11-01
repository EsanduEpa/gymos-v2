/** Reference-counted tenant resource manager. Pure helper, not a Nest provider. */
type Timer = ReturnType<typeof setTimeout>;
export type Resource<T> = { client: T; close: () => Promise<void> };
type Entry<T> = { name: string; resource: Resource<T>; refs: number; state: 'OPEN' | 'CLOSING'; lastReleasedAt: number; idleTimer?: Timer; closePromise?: Promise<void> };
type Waiter<T> = { name: string; maintenance: boolean; controlled: boolean; resolve: (entry: Entry<T>) => void; reject: (error: AdmissionUnavailable) => void; deadline: number; timer?: Timer };
export type Capacity = { resident: number; activeLeases: number; closing: number; queued: number; draining: boolean; drainTimedOut: boolean };
export type LeaseOptions = { maxResident: number; maxQueued: number; admissionMs: number; idleMs: number; drainMs: number; now: () => number; setTimer: (fn: () => void, delay: number) => Timer; clearTimer: (timer: Timer | undefined) => void; onDrainTimeout: (capacity: Capacity) => void; onCloseError: (state: { reason: string }) => void };
export class AdmissionUnavailable extends Error {
  readonly status = 503; readonly retryable = true; readonly reason: string;
  constructor(reason: string) { super('Tenant database is temporarily unavailable'); this.name = 'AdmissionUnavailable'; this.reason = reason; }
}
export class BoundedTenantLeases<T> {
  private readonly create: (name: string) => Resource<T>;
  private readonly options: LeaseOptions;
  #entries = new Map<string, Entry<T>>();
  #waiters: Waiter<T>[] = [];
  #suspended = new Set<string>();
  #administrativeReadsPaused = new Set<string>();
  #suspendWaiters = new Map<string, { promise: Promise<void>; resolve: () => void; reject: (error: Error) => void }>();
  #draining = false;
  #drainPromise: Promise<void> | undefined;
  #drainResolve: (() => void) | undefined;
  #drainTimer: Timer | undefined;
  #drainTimedOut = false;
  #pumping = false;
  constructor(create: (name: string) => Resource<T>, config: Partial<LeaseOptions> = {}) {
    this.create = create;
    this.options = { maxResident: 8, maxQueued: 64, admissionMs: 3000, idleMs: 60000, drainMs: 10000, now: () => performance.now(), setTimer: (fn, ms) => setTimeout(fn, ms), clearTimer: (id) => clearTimeout(id), onDrainTimeout: () => {}, onCloseError: () => {}, ...config };
  }
  snapshot(): Capacity {
    return { resident: this.#entries.size, activeLeases: [...this.#entries.values()].reduce((sum, entry) => sum + entry.refs, 0), closing: [...this.#entries.values()].filter((entry) => entry.state === 'CLOSING').length, queued: this.#waiters.length, draining: this.#draining, drainTimedOut: this.#drainTimedOut };
  }
  async withDatabase<Result>(name: string, work: (client: T) => Promise<Result>, maintenance = false, controlled = false): Promise<Result> {
    const entry = await this.#acquire(name, maintenance, controlled);
    try { return await work(entry.resource.client); }
    finally { this.#release(entry); }
  }
  async suspendDatabase(name: string): Promise<void> {
    if (!/^[a-z][a-z0-9_]{0,62}$/.test(name)) throw new AdmissionUnavailable('INVALID_TARGET');
    this.#suspended.add(name);
    for (let index = this.#waiters.length - 1; index >= 0; index -= 1) {
      const waiter = this.#waiters[index];
      if (waiter.name !== name) continue;
      this.#waiters.splice(index, 1);
      this.options.clearTimer(waiter.timer);
      waiter.reject(new AdmissionUnavailable('DRAINING'));
    }
    const entry = this.#entries.get(name);
    if (!entry) return;
    let pending = this.#suspendWaiters.get(name);
    if (!pending) {
      let resolve!: () => void;
      let reject!: (error: Error) => void;
      const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
      pending = { promise, resolve, reject };
      this.#suspendWaiters.set(name, pending);
    }
    if (entry.refs === 0) this.#close(entry);
    await pending.promise;
  }
  resumeDatabase(name: string): void {
    const entry = this.#entries.get(name);
    if (entry?.state === 'CLOSING') throw new AdmissionUnavailable('POOL_CLOSE_FAILED');
    this.#suspended.delete(name);
    this.#suspendWaiters.delete(name);
    this.#pump();
  }
  pauseAdministrativeReads(name: string): void {
    this.#administrativeReadsPaused.add(name);
    for (let index = this.#waiters.length - 1; index >= 0; index--) {
      const waiter = this.#waiters[index];
      if (waiter.name !== name || !waiter.maintenance || waiter.controlled) continue;
      this.#waiters.splice(index, 1); this.options.clearTimer(waiter.timer);
      waiter.reject(new AdmissionUnavailable('DRAINING'));
    }
  }
  resumeAdministrativeReads(name: string): void { this.#administrativeReadsPaused.delete(name); }
  #timer(fn: () => void, ms: number): Timer {
    const timer = this.options.setTimer(fn, ms);
    timer?.unref?.();
    return timer;
  }
  #acquire(name: string, maintenance: boolean, controlled: boolean): Promise<Entry<T>> {
    if (!/^[a-z][a-z0-9_]{0,62}$/.test(name)) return Promise.reject(new AdmissionUnavailable('INVALID_TARGET'));
    if (this.#draining) return Promise.reject(new AdmissionUnavailable('DRAINING'));
    if (this.#suspended.has(name) && !maintenance) return Promise.reject(new AdmissionUnavailable('DRAINING'));
    if (maintenance && !controlled && this.#administrativeReadsPaused.has(name)) return Promise.reject(new AdmissionUnavailable('DRAINING'));
    if (this.#waiters.length >= this.options.maxQueued) return Promise.reject(new AdmissionUnavailable('QUEUE_FULL'));
    return new Promise<Entry<T>>((resolve, reject) => {
      const waiter: Waiter<T> = { name, maintenance, controlled, resolve, reject, deadline: this.options.now() + this.options.admissionMs };
      waiter.timer = this.#timer(() => {
        const index = this.#waiters.indexOf(waiter);
        if (index < 0) return;
        this.#waiters.splice(index, 1);
        reject(new AdmissionUnavailable('ADMISSION_TIMEOUT'));
        this.#pump();
      }, this.options.admissionMs);
      this.#waiters.push(waiter);
      this.#pump();
    });
  }
  #settleWaiter(waiter: Waiter<T>): void {
    this.#waiters.shift();
    this.options.clearTimer(waiter.timer);
  }
  #pump(): void {
    if (this.#pumping || this.#draining) return;
    this.#pumping = true;
    try {
      while (this.#waiters.length) {
        const waiter = this.#waiters[0];
        if (this.options.now() >= waiter.deadline) { this.#settleWaiter(waiter); waiter.reject(new AdmissionUnavailable('ADMISSION_TIMEOUT')); continue; }
        let entry = this.#entries.get(waiter.name);
        if (entry?.state === 'CLOSING') return;
        if (!entry && this.#entries.size >= this.options.maxResident) {
          const idle = [...this.#entries.values()].filter((candidate) => candidate.state === 'OPEN' && candidate.refs === 0).sort((a, b) => a.lastReleasedAt - b.lastReleasedAt)[0];
          if (idle) this.#close(idle);
          return;
        }
        if (!entry) {
          try {
            // Factory is synchronous; allocation is reserved before any query/await.
            const resource = this.create(waiter.name);
            entry = { name: waiter.name, resource, refs: 0, state: 'OPEN', lastReleasedAt: this.options.now(), idleTimer: undefined, closePromise: undefined };
            this.#entries.set(waiter.name, entry);
          } catch {
            this.#settleWaiter(waiter); waiter.reject(new AdmissionUnavailable('CLIENT_ALLOCATION_FAILED')); continue;
          }
        }
        this.options.clearTimer(entry.idleTimer);
        entry.idleTimer = undefined;
        entry.refs++;
        this.#settleWaiter(waiter);
        waiter.resolve(entry);
      }
    } finally { this.#pumping = false; }
  }
  #release(entry: Entry<T>): void {
    if (entry.refs <= 0) throw new Error('Lease reference underflow');
    entry.refs--;
    if (entry.refs === 0) {
      entry.lastReleasedAt = this.options.now();
      if (this.#draining || this.#suspended.has(entry.name)) this.#close(entry);
      else entry.idleTimer = this.#timer(() => { entry.idleTimer = undefined; if (entry.refs === 0 && entry.state === 'OPEN') this.#close(entry); }, this.options.idleMs);
    }
    this.#pump();
    this.#finishDrain();
  }
  #close(entry: Entry<T>): void {
    if (entry.state !== 'OPEN' || entry.refs !== 0) return;
    entry.state = 'CLOSING';
    this.options.clearTimer(entry.idleTimer);
    entry.idleTimer = undefined;
    // Slot stays occupied until physical close succeeds. Never close refs>0.
    entry.closePromise = Promise.resolve().then(() => entry.resource.close()).then(() => {
      if (this.#entries.get(entry.name) === entry) this.#entries.delete(entry.name);
      this.#suspendWaiters.get(entry.name)?.resolve();
      this.#suspendWaiters.delete(entry.name);
      this.#pump();
      this.#finishDrain();
    }, () => {
      // Quarantine until explicit recovery: no capacity overflow or unsafe retry.
      this.options.onCloseError({ reason: 'POOL_CLOSE_FAILED' });
      this.#suspendWaiters.get(entry.name)?.reject(new AdmissionUnavailable('POOL_CLOSE_FAILED'));
      this.#finishDrain();
    });
  }
  drain(): Promise<void> {
    if (this.#drainPromise) return this.#drainPromise;
    this.#draining = true;
    this.#drainPromise = new Promise((resolve) => { this.#drainResolve = resolve; });
    for (const waiter of this.#waiters.splice(0)) { this.options.clearTimer(waiter.timer); waiter.reject(new AdmissionUnavailable('DRAINING')); }
    this.#drainTimer = this.#timer(() => { this.#drainTimedOut = true; this.options.onDrainTimeout(this.snapshot()); }, this.options.drainMs);
    for (const entry of this.#entries.values()) if (entry.refs === 0) this.#close(entry);
    this.#finishDrain();
    return this.#drainPromise;
  }
  #finishDrain(): void {
    if (this.#draining && this.#entries.size === 0) { this.options.clearTimer(this.#drainTimer); this.#drainResolve?.(); }
  }
}
