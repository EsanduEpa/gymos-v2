'use server';

import { randomUUID } from 'node:crypto';
import { issueSessionPackInputSchema, issueSessionPackResultSchema } from '@gymos/contracts';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';

export type IssuePackActionState = { error?: string; success?: string; nextIdempotencyKey?: string };

export async function issueSessionPackAction(slug: string, memberId: string, previous: IssuePackActionState,
  formData: FormData): Promise<IssuePackActionState> {
  const submittedKey = formData.get('idempotencyKey');
  const nextIdempotencyKey = previous.nextIdempotencyKey ?? (typeof submittedKey === 'string' ? submittedKey : undefined);
  const parsed = issueSessionPackInputSchema.safeParse({
    credits: Number(formData.get('credits')), validityDays: Number(formData.get('validityDays')),
    price: formData.get('price'), currency: formData.get('currency'), idempotencyKey: formData.get('idempotencyKey'),
  });
  if (!parsed.success) return { error: 'Enter a whole credit count, validity, exact nonnegative price and gym currency.', nextIdempotencyKey };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try {
    response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}/session-packs`), {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data), cache: 'no-store',
    });
  } catch { return { error: 'The outcome is unknown. Retry with this same pack request before issuing another.', nextIdempotencyKey };
  }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 404) notFound();
  const result = issueSessionPackResultSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !result.success) return { error: response.status === 409
    ? 'This pack request conflicts with an earlier command or the member status changed. Refresh before retrying.'
    : 'The session pack could not be issued. Check the details and retry the same request if the outcome is unknown.', nextIdempotencyKey };
  revalidatePath(`/gyms/${encodeURIComponent(slug)}/owner/members/${encodeURIComponent(memberId)}`);
  return { success: `Issued ${result.data.pack.issuedCredits} session credits. No payment was recorded.`, nextIdempotencyKey: randomUUID() };
}
