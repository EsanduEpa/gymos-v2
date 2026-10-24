import { ServiceUnavailableException } from '@nestjs/common';
import type { PoolConfig } from 'pg';

export const DATABASE_POOL_LIMITS = Object.freeze({ master: 4, tenant: 2, provisioning: 1, maxTenantClients: 8, admissionMs: 3000, statementMs: 5000, idleMs: 60000, drainMs: 10000 });

/** Production pool configuration. No database URL or secret is returned in errors. */
export function databasePoolConfig(base: string | undefined, kind: 'master' | 'tenant' | 'provisioning', databaseName?: string): PoolConfig {
  try {
    if (!base) throw new Error('missing configuration');
    const url = new URL(base);
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') throw new Error('invalid scheme');
    if (!url.hostname || url.hash) throw new Error('invalid target');
    // libpg parses URL options over explicit configuration. Only reviewed TLS
    // switches survive; user/host/password/db/options/timeout overrides fail closed.
    for (const key of url.searchParams.keys()) if (!['sslmode', 'sslnegotiation'].includes(key)) throw new Error('unsupported option');
    const sslmode = url.searchParams.get('sslmode');
    if (sslmode && !['disable', 'require', 'verify-full'].includes(sslmode)) throw new Error('unsupported TLS mode');
    const negotiation = url.searchParams.get('sslnegotiation');
    if (negotiation && !['postgres', 'direct'].includes(negotiation)) throw new Error('unsupported TLS negotiation');
    const target = databaseName ?? decodeURIComponent(url.pathname.slice(1));
    if (!/^[a-z][a-z0-9_]{0,62}$/.test(target)) throw new Error('invalid database');
    url.pathname = `/${target}`;
    return {
      connectionString: url.toString(),
      max: DATABASE_POOL_LIMITS[kind],
      min: 0,
      connectionTimeoutMillis: DATABASE_POOL_LIMITS.admissionMs,
      statement_timeout: DATABASE_POOL_LIMITS.statementMs,
      // Explicit options override PGOPTIONS and may not be supplied by URL.
      options: `-c statement_timeout=${DATABASE_POOL_LIMITS.statementMs}`,
      idleTimeoutMillis: DATABASE_POOL_LIMITS.idleMs,
      application_name: `gymos-api-${kind}`,
    };
  } catch {
    throw new ServiceUnavailableException('Database configuration is unavailable');
  }
}
