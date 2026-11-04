import { failureSchema, idempotencyKeySchema, type ApiFailure } from '@gymos/contracts';
import type { z } from 'zod';
export * from './configuration.js';
export * from './members.js';
export * from './trainers.js';
export * from './notifications.js';
export * from './packs.js';
export * from './session-booking.js';
export * from './session-reads.js';
export * from './session-requests.js';
export * from './session-lifecycle.js';
export * from './member-lifecycle.js';
export * from './coaching.js';
export * from './finance.js';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Fetcher = (input: string, init: RequestInit) => Promise<Response>;
export type RequestOptions<T> = {
  method?: Method;
  response: z.ZodType<T>;
  body?: unknown;
  /** A server-held token for web; OS-secure token for native. Never log it. */
  accessToken?: string;
  /** Explicit server-held opaque context for the named read-only support API. */
  supportContext?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
};
export class ApiClientError extends Error {
  readonly kind: 'http' | 'network' | 'contract' | 'unknown-outcome';
  readonly status: number | undefined;
  readonly failure: ApiFailure | undefined;
  readonly retryable: boolean;
  constructor(kind: ApiClientError['kind'], status?: number, failure?: ApiFailure) {
    super(kind === 'unknown-outcome'
      ? 'The outcome is unknown. Check the operation before retrying.'
      : 'The API request could not be completed.');
    this.name = 'ApiClientError';
    this.kind = kind;
    this.status = status;
    this.failure = failure;
    this.retryable = kind === 'network' || (kind === 'http' && failure?.retryable === true);
  }
}
function targetUrl(baseUrl: string, path: string): string {
  let base: URL;
  try { base = new URL(baseUrl); }
  catch { throw new TypeError('Invalid API base origin'); }
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password
    || base.search || base.hash || base.pathname !== '/') {
    throw new TypeError('API base must be an HTTP(S) origin without credentials, path or query');
  }
  if (!path.startsWith('/') || path.startsWith('//') || /[\u0000-\u0020\\]/.test(path)) {
    throw new TypeError('API path must be an origin-relative path');
  }
  const target = new URL(path, base);
  if (target.origin !== base.origin || target.hash) throw new TypeError('Invalid API path');
  return target.toString();
}

export function createApiClient(baseUrl: string, fetcher: Fetcher = fetch) {
  // Validate configuration without waiting for the first request.
  targetUrl(baseUrl, '/');
  return {
    async request<T>(path: string, options: RequestOptions<T>): Promise<T> {
      const method = options.method ?? 'GET';
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw new TypeError('Unsupported API method');
      const mutation = method !== 'GET';
      if (!mutation && options.body !== undefined) throw new TypeError('GET cannot have a body');
      const headers = new Headers({ accept: 'application/json' });
      if (options.accessToken !== undefined) {
        if (options.accessToken.length > 16384 || !/^[A-Za-z0-9._~+/-]+=*$/.test(options.accessToken)) {
          throw new TypeError('Invalid bearer token');
        }
        headers.set('authorization', `Bearer ${options.accessToken}`);
      }
      if (options.idempotencyKey !== undefined) {
        if (!idempotencyKeySchema.safeParse(options.idempotencyKey).success) throw new TypeError('Invalid idempotency key');
        headers.set('idempotency-key', options.idempotencyKey);
      }
      if (options.supportContext !== undefined) {
        const allowed = (method === 'GET' && /^\/admin\/support-sessions\/[^/]+\/gyms\/[^/]+\/summary$/.test(path))
          || (method === 'DELETE' && /^\/admin\/support-sessions\/[^/]+$/.test(path));
        if (!allowed || !/^[A-Za-z0-9_-]{43}$/.test(options.supportContext)) throw new TypeError('Support context is limited to approved summary and exit requests');
        headers.set('x-gymos-support-context', options.supportContext);
      }
      const init: RequestInit = { method, headers, cache: 'no-store', redirect: 'manual' };
      if (options.signal) init.signal = options.signal;
      if (options.body !== undefined) {
        headers.set('content-type', 'application/json');
        init.body = JSON.stringify(options.body);
      }
      const url = targetUrl(baseUrl, path);
      let response: Response;
      try { response = await fetcher(url, init); }
      catch { throw new ApiClientError(mutation ? 'unknown-outcome' : 'network'); }
      let body: unknown;
      try { body = await response.json(); }
      catch { throw new ApiClientError(mutation ? 'unknown-outcome' : 'contract', response.status); }
      if (!response.ok) {
        const parsed = failureSchema.safeParse(body);
        // Legacy Nest errors are intentionally not promoted to trusted DTOs.
        // A command5xx or malformed/redirect response may follow a commit.
        const uncertain = (parsed.success && parsed.data.code === 'OUTCOME_UNKNOWN')
          || (mutation && (response.status >= 500 || response.status < 400 || !parsed.success));
        throw new ApiClientError(uncertain ? 'unknown-outcome' : 'http', response.status,
          parsed.success ? parsed.data : undefined);
      }
      const parsed = options.response.safeParse(body);
      if (!parsed.success) throw new ApiClientError(mutation ? 'unknown-outcome' : 'contract', response.status);
      return parsed.data;
    },
  };
}
