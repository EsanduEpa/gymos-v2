export const DEFAULT_DISPLAY_TIME_ZONE = 'Asia/Colombo';
const locale = 'en-GB';
const dateParts = { day: 'numeric', month: 'short', year: 'numeric' } as const;

export function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat(locale, { ...dateParts, timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

export function formatDisplayDateTime(value: string, timeZone = DEFAULT_DISPLAY_TIME_ZONE, showZone = false) {
  return new Intl.DateTimeFormat(locale, {
    ...dateParts,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
    ...(showZone ? { timeZoneName: 'shortOffset' } : {}),
  }).format(new Date(value));
}
