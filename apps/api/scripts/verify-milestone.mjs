import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.argv.length !== 2) throw new Error('This command does not accept database targets or other arguments');
if (process.env.GYMOS_TEST_ALLOW_DOCKER !== '1') {
  throw new Error('Explicit GYMOS_TEST_ALLOW_DOCKER=1 is required');
}

const root = fileURLToPath(new URL('../../../', import.meta.url));
const environment = { ...process.env, TZ: 'UTC' };
for (const key of ['MASTER_DATABASE_URL', 'TENANT_DATABASE_URL', 'PROVISION_DATABASE_URL', 'JWT_SECRET']) {
  delete environment[key];
}

const child = spawn('pnpm', ['--dir', 'apps/web', 'exec', 'playwright', 'test', '--config', 'playwright.config.ts'], {
  cwd: root,
  env: environment,
  stdio: 'inherit',
});
child.on('error', (error) => {
  console.error(`Unable to start the isolated milestone runner: ${error.message}`);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  if (signal) console.error(`Isolated milestone runner ended by ${signal}`);
  process.exitCode = code ?? 1;
});
