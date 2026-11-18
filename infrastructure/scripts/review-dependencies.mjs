import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifiedAuditCounts, blocksProposedAudit } from './dependency-audit-result.mjs';

const picomatchAdvisory = 'GHSA-fc5q-39xc-vjpf';
// Remove this exception after both release lines can use an upstream security fix.
const picomatchPatches = {
  '2.3.2': {
    lockHash: 'wzi26x4d5c7wj2agtwkc46foim',
    sha256: '9967ad9b08e361a47b56c0ac01e681ae558f611d018b7cb4b425c7696dd99ea4',
  },
  '4.0.7': {
    lockHash: 'pcfq5pdwek3uta7z4pgmfutqjq',
    sha256: '085781ed7d7de4980c10cff8b67e36e2765c0fbd22b1edd8e7ba6dce1773adb7',
  },
};

function readCommitted(revision, path) {
  return execFileSync('git', ['show', `${revision}:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function verifiedPicomatchFindings(advisories, manifest, lockfile, revision) {
  if (!manifest.pnpm?.auditConfig?.ignoreGhsas?.includes(picomatchAdvisory)) return 0;
  const advisory = Object.values(advisories ?? {}).find(item => item.github_advisory_id === picomatchAdvisory);
  if (!advisory) return 0;
  if (advisory.module_name !== 'picomatch' || advisory.severity !== 'high' || !Array.isArray(advisory.findings)) {
    throw new Error(`${picomatchAdvisory}: audit findings changed; recheck the local patch`);
  }
  const versions = new Set(advisory.findings.map(({ version }) => version));
  if (versions.size !== advisory.findings.length) throw new Error(`${picomatchAdvisory}: duplicate findings`);

  const snapshots = lockfile.split('\nsnapshots:\n')[1] ?? '';
  const installed = [...snapshots.matchAll(/^  picomatch@([^:\n]+):/gm)].map(match => match[1]);
  for (const version of versions) {
    const patch = picomatchPatches[version];
    const key = `picomatch@${version}`;
    const path = `patches/${key}.patch`;
    const matching = installed.filter(entry => entry === version || entry.startsWith(`${version}(`));
    if (!patch || manifest.pnpm.patchedDependencies?.[key] !== path || matching.length !== 1 ||
        matching[0] !== `${version}(patch_hash=${patch.lockHash})` ||
        createHash('sha256').update(readCommitted(revision, path)).digest('hex') !== patch.sha256) {
      throw new Error(`${picomatchAdvisory}: ${key} is missing its verified patch`);
    }
  }
  return versions.size;
}

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
    const manifest = JSON.parse(readCommitted(revision, 'package.json'));
    const lockfile = readCommitted(revision, 'pnpm-lock.yaml');
    // Audit every finding here, then verify any locally patched exception.
    const auditManifest = { ...manifest, pnpm: { ...manifest.pnpm, auditConfig: {} } };
    writeFileSync(join(directory, 'package.json'), JSON.stringify(auditManifest), { mode: 0o600 });
    writeFileSync(join(directory, 'pnpm-lock.yaml'), lockfile, { mode: 0o600 });
    const result = spawnSync('pnpm', ['audit', '--audit-level', 'high', '--json'], {
      cwd: directory, encoding: 'utf8', timeout: 120_000,
      env: { ...process.env, CI: 'true' }, maxBuffer: 16 * 1024 * 1024,
    });
    const counts = verifiedAuditCounts(result, label);
    const patchedHigh = verifiedPicomatchFindings(JSON.parse(result.stdout).advisories, manifest, lockfile, revision);
    if (patchedHigh > counts.high) throw new Error(`${label}: audit findings do not match severity totals`);
    const remaining = { ...counts, high: counts.high - patchedHigh };
    console.log(JSON.stringify({ revision: label, sha: revision, moderate: remaining.moderate, high: remaining.high,
      critical: remaining.critical, patchedHigh }));
    if (label === 'proposed' && blocksProposedAudit(remaining)) blocked = true;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
if (blocked) throw new Error('Proposed lockfile contains high or critical vulnerabilities');
