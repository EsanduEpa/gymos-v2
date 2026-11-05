export type AvailabilityRule = { kind: 'WEEKLY_WINDOW' | 'DATED_WINDOW' | 'BLOCK' | 'GYM_CLOSURE'; weekday: number | null; localDate: Date | null; startMinute: number | null; endMinute: number | null; effectiveFrom: Date | null; effectiveToExclusive: Date | null };
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const dayText = (value: Date) => value.toISOString().slice(0, 10);
export function allowedStartMinutes(localDate: string, rules: AvailabilityRule[], weekday: number) {
  if (rules.some(rule => rule.kind === 'GYM_CLOSURE' && rule.localDate && dayText(rule.localDate) === localDate)) return [];
  const dated = rules.filter(rule => rule.kind === 'DATED_WINDOW' && rule.localDate && dayText(rule.localDate) === localDate);
  const activeWeekly = rules.filter(rule => rule.kind === 'WEEKLY_WINDOW' && rule.weekday === weekday && rule.effectiveFrom && rule.effectiveToExclusive
    && day(rule.effectiveFrom.toISOString().slice(0, 10)) <= day(localDate) && day(localDate) < day(rule.effectiveToExclusive.toISOString().slice(0, 10)));
  const windows = dated.length ? dated : activeWeekly;
  const blocks = rules.filter(rule => rule.kind === 'BLOCK' && rule.localDate && dayText(rule.localDate) === localDate);
  const starts = new Set<number>();
  for (const window of windows) for (let start = window.startMinute ?? 0; start + 60 <= (window.endMinute ?? 0); start += 15) {
    if (!blocks.some(block => start < (block.endMinute ?? 0) && start + 60 > (block.startMinute ?? 0))) starts.add(start);
  }
  return [...starts].sort((a, b) => a - b);
}
