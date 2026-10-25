import { access } from 'node:fs/promises';
import { createDisposableEnvironment } from './disposable-environment.js';
import { assertOwnedTarget } from './disposable-postgres.js';

it('keeps two concurrent environments physically separate and cleans only their own resources', async () => {
  const [first, second] = await Promise.all([
    createDisposableEnvironment(),
    createDisposableEnvironment(),
  ]);
  try {
    expect(first.runId).not.toBe(second.runId);
    expect(first.containerId).not.toBe(second.containerId);
    expect(first.port).not.toBe(second.port);
    expect(first.masterName).not.toBe(second.masterName);

    const firstClient = await first.connect(first.masterName);
    const secondClient = await second.connect(second.masterName);
    try {
      await firstClient.query(
        'CREATE TABLE public.run_probe (value TEXT NOT NULL)',
      );
      await firstClient.query('INSERT INTO public.run_probe VALUES ($1)', [
        first.runId,
      ]);
      await secondClient.query(
        'CREATE TABLE public.run_probe (value TEXT NOT NULL)',
      );
      await secondClient.query('INSERT INTO public.run_probe VALUES ($1)', [
        second.runId,
      ]);
      expect(
        (await firstClient.query('SELECT value FROM public.run_probe')).rows[0]
          .value,
      ).toBe(first.runId);
      expect(
        (await secondClient.query('SELECT value FROM public.run_probe')).rows[0]
          .value,
      ).toBe(second.runId);
    } finally {
      await firstClient.end();
      await secondClient.end();
    }

    const firstCleanup = await first.cleanup();
    expect(firstCleanup).toMatchObject({
      containerRemoved: true,
      manifestRemoved: true,
    });
    await expect(access(first.manifestPath)).rejects.toThrow();
    const surviving = await second.connect(second.masterName);
    try {
      expect(
        (await surviving.query('SELECT value FROM public.run_probe')).rows[0]
          .value,
      ).toBe(second.runId);
    } finally {
      await surviving.end();
    }
  } finally {
    await first.cleanup().catch(() => undefined);
    const secondCleanup = await second.cleanup();
    expect(secondCleanup).toMatchObject({
      containerRemoved: true,
      manifestRemoved: true,
    });
  }
}, 120_000);

it('cleans an injected failed run without adopting another target', async () => {
  const environment = await createDisposableEnvironment();
  const other = await createDisposableEnvironment();
  let replacement:
    Awaited<ReturnType<typeof createDisposableEnvironment>> | undefined;
  try {
    await expect(
      (async () => {
        throw new Error('INJECTED_STARTUP_FAILURE');
      })(),
    ).rejects.toThrow('INJECTED_STARTUP_FAILURE');
    expect(await environment.cleanup()).toMatchObject({
      containerRemoved: true,
      manifestRemoved: true,
    });
    const otherClient = await other.connect(other.masterName);
    await expect(otherClient.query('SELECT 1')).resolves.toMatchObject({
      rowCount: 1,
    });
    await otherClient.end();
    replacement = await createDisposableEnvironment();
    const replacementClient = await replacement.connect(replacement.masterName);
    await expect(replacementClient.query('SELECT 1')).resolves.toMatchObject({
      rowCount: 1,
    });
    await replacementClient.end();
  } finally {
    await environment.cleanup().catch(() => undefined);
    await other.cleanup().catch(() => undefined);
    await replacement?.cleanup().catch(() => undefined);
  }
}, 120_000);

it('refuses wrong host, name, port and marker before a database mutation', async () => {
  const environment = await createDisposableEnvironment();
  try {
    const names = environment.ownedDatabaseNames();
    let mutations = 0;
    const guardedMutation = (url: string, port = environment.port) => {
      assertOwnedTarget(url, environment.runId, names, port);
      mutations++;
    };
    expect(() =>
      guardedMutation(
        environment.masterUrl.replace('127.0.0.1', 'db.example.test'),
      ),
    ).toThrow();
    expect(() =>
      guardedMutation(
        environment.masterUrl.replace(
          environment.masterName,
          'shared_development',
        ),
      ),
    ).toThrow();
    expect(() =>
      guardedMutation(
        environment.masterUrl,
        String(Number(environment.port) + 1),
      ),
    ).toThrow();
    expect(mutations).toBe(0);

    const client = await environment.connect(environment.preflightName);
    const ownership = (
      await client.query<{ run_id: string; marker: string }>(
        'SELECT run_id, marker FROM "__gymos_test"."Ownership"',
      )
    ).rows[0];
    await client.query('DELETE FROM "__gymos_test"."Ownership"');
    await expect(
      environment.dropOwnedDatabase(environment.preflightName),
    ).rejects.toThrow('ownership marker');
    expect(
      (await client.query('SELECT current_database() AS name')).rows[0].name,
    ).toBe(environment.preflightName);
    await client.query(
      'INSERT INTO "__gymos_test"."Ownership" VALUES ($1, $2)',
      [ownership.run_id, ownership.marker],
    );
    await client.end();
  } finally {
    await environment.cleanup();
  }
}, 120_000);
