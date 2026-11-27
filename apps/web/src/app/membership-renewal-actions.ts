'use server';

import { renewMembershipSchema, renewalResultSchema } from '@gymos/contracts';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export type RenewalIntent = ReturnType<typeof renewMembershipSchema.parse>;
export type RenewalState = {
  error?: string;
  refresh?: boolean;
  retry?: RenewalIntent;
  result?: ReturnType<typeof renewalResultSchema.parse>;
};

export async function renewMembership(slug: string, memberId: string, intent: RenewalIntent): Promise<RenewalState> {
  const parsed = renewMembershipSchema.safeParse(intent);
  if (!parsed.success || parsed.data.expectedPlanVersion === undefined) return { error: 'Choose a plan and start policy before confirming.' };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { error: 'Sign in as a gym owner to renew a membership.' };

  const unknown = { error: 'The renewal outcome is unknown. Retry this renewal before recording another payment.', retry: parsed.data };
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}/memberships`), {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8_000),
    });
  } catch { return unknown; }
  if (response.status === 409 || response.status === 404) {
    return { error: 'The member, plan or start date could not be confirmed. Reload the current details and review before renewing.', refresh: true };
  }
  if (response.status === 401 || response.status === 403) return { error: 'This renewal requires Owner access to the selected gym.' };
  if (response.status >= 500) return unknown;
  if (!response.ok) return { error: 'The renewal was rejected. Check the membership details before trying again.', refresh: true };
  const result = renewalResultSchema.safeParse(await response.json().catch(() => null));
  if (!result.success || result.data.memberId !== memberId) return unknown;
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/members/${encodeURIComponent(memberId)}`);
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/members`);
  return { result: result.data };
}
