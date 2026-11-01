// pnpm 9 JSON mode exits 1 for any severity, before applying --audit-level.
// Validate the complete result independently; never treat an audit failure as clean.
export function verifiedAuditCounts(result, label) {
  let report;
  try { report = JSON.parse(result.stdout || ''); } catch {
    throw new Error(`${label}: audit unavailable or invalid response; review fails closed`);
  }
  const counts = report.metadata?.vulnerabilities;
  const levels = ['info', 'low', 'moderate', 'high', 'critical'];
  if (result.error || result.signal || report.error || !counts ||
      levels.some(level => !Number.isSafeInteger(counts[level]) || counts[level] < 0) ||
      (result.status !== 0 && result.status !== 1) ||
      result.status !== (levels.some(level => counts[level] > 0) ? 1 : 0)) {
    throw new Error(`${label}: audit could not be verified; review fails closed`);
  }
  return counts;
}
export function blocksProposedAudit(counts) {
  return counts.high + counts.critical > 0;
}
