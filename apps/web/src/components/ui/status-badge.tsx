export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const normalized = status.trim().toUpperCase();
  const tone = normalized === 'ACTIVE' || normalized === 'COMPLETE' || normalized === 'COMPLETED'
    ? 'success'
    : normalized === 'PENDING' || normalized === 'PENDING_CONFIRMATION'
      ? 'info'
      : normalized === 'INACTIVE' || normalized === 'SUSPENDED'
        ? 'warning'
        : normalized === 'FAILED' || normalized === 'EXPIRED' || normalized === 'DECLINED'
          ? 'danger'
          : 'neutral';
  return <span className={`ui-badge ui-badge-${tone} ${className}`.trim()}>{normalized}</span>;
}
