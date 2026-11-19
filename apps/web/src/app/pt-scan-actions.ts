'use server';

import { cookies } from 'next/headers';
import { sessionScanCodeSchema } from '@gymos/contracts';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export async function loadPtScan(slug: string, sessionId: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/^[A-Za-z0-9_:-]{1,128}$/.test(sessionId)) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/scan-code`), {
      headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    if (!response.ok) return null;
    const result = sessionScanCodeSchema.safeParse(await response.json());
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
