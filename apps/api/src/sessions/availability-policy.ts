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

export function resolvedStartSlots(localDate: string, startMinutes: number[], timeZone: string) {
  const midnightUtc = new Date(`${localDate}T00:00:00Z`).getTime();
  const [year, month, dayOfMonth] = localDate.split('-').map(Number);
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const partsAt = (instant: Date) => {
    const parts = Object.fromEntries(formatter.formatToParts(instant).map(part => [part.type, part.value]));
    return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour), minute: Number(parts.minute) };
  };
  const offsets = new Set<number>();
  // Every local time on this date maps within UTC midnight -14h to +38h.
  // Sampling that interval finds both offsets on a daylight-saving changeover.
  for (let hour = -15; hour <= 39; hour++) {
    const sample = new Date(midnightUtc + hour * 3_600_000);
    const local = partsAt(sample);
    const localUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
    offsets.add(Math.round((localUtc - sample.getTime()) / 60_000));
  }
  return startMinutes.flatMap(minute => {
    const hour = Math.floor(minute / 60);
    const minuteOfHour = minute % 60;
    const localTime = `${String(hour).padStart(2, '0')}:${String(minuteOfHour).padStart(2, '0')}`;
    return [...offsets].flatMap(offsetMinutes => {
      const start = new Date(midnightUtc + minute * 60_000 - offsetMinutes * 60_000);
      const actual = partsAt(start);
      if (actual.year !== year || actual.month !== month || actual.day !== dayOfMonth || actual.hour !== hour || actual.minute !== minuteOfHour) return [];
      const sign = offsetMinutes < 0 ? '-' : '+';
      const magnitude = Math.abs(offsetMinutes);
      return [{ start, end: new Date(start.getTime() + 3_600_000), localTime,
        offset: `${sign}${String(Math.floor(magnitude / 60)).padStart(2, '0')}:${String(magnitude % 60).padStart(2, '0')}` }];
    });
  });
}
