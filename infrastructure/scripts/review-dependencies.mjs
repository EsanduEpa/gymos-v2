import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifiedAuditCounts, blocksProposedAudit } from './dependency-audit-result.mjs';

// Read only committed manifests. Never install or execute code from either revision.
const revisions = {
  base: process.env.DEPENDENCY_BASE_SHA,
  proposed: process.env.DEPENDENCY_HEAD_SHA,
};
for (const value of Object.values(revisions)) {
  if (!value || !/^[a-f0-9]{40}$/.test(value)) {
    throw new Error('Dependency review requires full base and head commit SHAs');
  }
}
let blocked = false;
for (const [label, revision] of Object.entries(revisions)) {
  const directory = mkdtempSync(join(tmpdir(), 'gymos-dependency-review-'));
  try {
    for (const name of ['package.json', 'pnpm-lock.yaml']) {
      const content = execFileSync('git', ['show', `${revision}:${name}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      writeFileSync(join(directory, name), content, { mode: 0o600 });
    }
    const result = spawnSync('pnpm', ['audit', '--audit-level', 'high', '--json'], {
      cwd: directory, encoding: 'utf8', timeout: 120_000,
      env: { ...process.env, CI: 'true' }, maxBuffer: 16 * 1024 * 1024,
    });
    const counts = verifiedAuditCounts(result, label);
    console.log(JSON.stringify({ revision: label, sha: revision, moderate: counts.moderate, high: counts.high, critical: counts.critical }));
    if (label === 'proposed' && blocksProposedAudit(counts)) blocked = true;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
if (blocked) throw new Error('Proposed lockfile contains high or critical vulnerabilities');
