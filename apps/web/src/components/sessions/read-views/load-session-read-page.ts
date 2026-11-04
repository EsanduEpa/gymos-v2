import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { memberSessionOverviewSchema, sessionReadPageSchema, sessionReadStateSchema } from '@gymos/contracts';
import type { MemberSessionOverview, SessionReadPage } from '@gymos/contracts';
import { apiUrl } from '@/lib/gymos';
import type { SessionReadFilters, SessionStateCount } from './session-read-view';

type Role = 'OWNER' | 'TRAINER' | 'MEMBER';
type Loaded = { data: SessionReadPage | null; filters: SessionReadFilters; failed: boolean; stateCounts: SessionStateCount[]; countsFailed: boolean; memberOverview: MemberSessionOverview | null; overviewFailed: boolean };

function safePositive(value: string | undefined, fallback: number, maximum = 1_000_000) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 && number <= maximum ? number : fallback;
}
function safeFilter(query: Record<string, string | undefined>, defaultMode: 'day' | 'month'): SessionReadFilters {
  const mode = query.mode === 'day' || query.mode === 'month' ? query.mode : defaultMode;
  return {
    mode,
    page: safePositive(query.page, 1), pageSize: safePositive(query.pageSize, 25, 100),
    ...(query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? { date: query.date } : {}),
    ...(query.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month) ? { month: query.month } : {}),
    ...(query.state && sessionReadStateSchema.safeParse(query.state).success ? { state: query.state } : {}),
    ...(query.q?.trim() ? { q: query.q.trim().slice(0, 100) } : {}),
    ...(query.memberId && /^[A-Za-z0-9_:-]{1,128}$/.test(query.memberId) ? { memberId: query.memberId } : {}),
  };
}
function localParts(instant: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant));
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { date: `${value.year}-${value.month}-${value.day}`, month: `${value.year}-${value.month}` };
}
function queryString(filters: SessionReadFilters, includeState = true) {
  const query: Record<string, string | number | undefined> = { page: filters.page, pageSize: filters.pageSize, q: filters.q, memberId: filters.memberId };
  if (filters.mode === 'day') query.date = filters.date;
  else query.month = filters.month;
  if (includeState) query.state = filters.state;
  return new URLSearchParams(Object.entries(query).flatMap(([key, value]) => value === undefined ? [] : [[key, String(value)]]));
}

async function getJson(path: string, token: string) {
  let response: Response;
  try { response = await fetch(apiUrl(path), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' }); }
  catch { return { status: 503, value: null }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 403 || response.status === 404) notFound();
  return { status: response.status, value: response.ok ? await response.json().catch(() => null) : null };
}

export async function loadSessionReadPage(input: {
  slug: string; token: string; role: Role; query: Record<string, string | undefined>; defaultMode: 'day' | 'month';
}): Promise<Loaded> {
  const { slug, token, role } = input;
  const endpoint = role === 'OWNER' ? 'sessions' : 'me/sessions';
  let filters = safeFilter(input.query, input.defaultMode);
  const explicitDate = filters.mode === 'day' ? filters.date : filters.month;
  if (!explicitDate) {
    const first = await getJson(`/gyms/${encodeURIComponent(slug)}/${endpoint}?page=1&pageSize=1`, token);
    const discovery = first.status === 200 ? sessionReadPageSchema.safeParse(first.value) : null;
    if (!discovery?.success) return { data: null, filters, failed: true, stateCounts: [], countsFailed: role === 'MEMBER' && filters.mode === 'month', memberOverview: null, overviewFailed: false };
    const local = localParts(discovery.data.asOf, discovery.data.timeZone);
    filters = { ...filters, ...(filters.mode === 'day' ? { date: local.date } : { month: local.month }) };
  }
  const result = await getJson(`/gyms/${encodeURIComponent(slug)}/${endpoint}?${queryString(filters)}`, token);
  const parsed = result.status === 200 ? sessionReadPageSchema.safeParse(result.value) : null;
  if (!parsed?.success) return { data: null, filters, failed: true, stateCounts: [], countsFailed: role === 'MEMBER' && filters.mode === 'month', memberOverview: null, overviewFailed: false };

  if (role === 'OWNER' && filters.mode === 'month') {
    const overviewQuery = new URLSearchParams({ month: filters.month!, page: String(filters.page), pageSize: String(filters.pageSize), ...(filters.q ? { q: filters.q } : {}) });
    const value = await getJson(`/gyms/${encodeURIComponent(slug)}/member-session-overview?${overviewQuery}`, token);
    const overview = value.status === 200 ? memberSessionOverviewSchema.safeParse(value.value) : null;
    return { data: parsed.data, filters, failed: false, stateCounts: [], countsFailed: false,
      memberOverview: overview?.success ? overview.data : null, overviewFailed: !overview?.success };
  }
  if (role !== 'MEMBER' || filters.mode !== 'month') return { data: parsed.data, filters, failed: false, stateCounts: [], countsFailed: false, memberOverview: null, overviewFailed: false };
  const states = sessionReadStateSchema.options;
  const counts = await Promise.all(states.map(async state => {
    const stateQuery = queryString({ ...filters, state, page: 1, pageSize: 1 });
    const value = await getJson(`/gyms/${encodeURIComponent(slug)}/me/sessions?${stateQuery}`, token);
    const page = value.status === 200 ? sessionReadPageSchema.safeParse(value.value) : null;
    return page?.success ? { state, totalCount: page.data.totalCount } : null;
  }));
  const stateCounts = counts.filter((value): value is SessionStateCount => value !== null);
  return { data: parsed.data, filters, failed: false, stateCounts, countsFailed: stateCounts.length !== states.length, memberOverview: null, overviewFailed: false };
}
