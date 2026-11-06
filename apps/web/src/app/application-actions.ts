'use server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { publicMemberApplicationInputSchema, memberApplicationInputSchema, memberApplicationDecisionSchema } from '@gymos/contracts';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
function value(data: FormData, name: string) { const item = data.get(name); return typeof item === 'string' ? item.trim() : ''; }
export async function submitPublicApplication(slug: string, data: FormData) {
  const parsed = publicMemberApplicationInputSchema.safeParse({ slug, fullName: value(data, 'fullName'), email: value(data, 'email'),
    phone: value(data, 'phone'), password: data.get('password'), consent: data.get('consent') === 'yes' });
  if (!parsed.success) redirect(`/apply/${encodeURIComponent(slug)}?error=invalid`);
  let response: Response;
  try { response = await fetch(apiUrl('/gyms/applications'), { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(parsed.data), cache: 'no-store' }); } catch { redirect(`/apply/${encodeURIComponent(slug)}?error=unavailable`); }
  if (response.status === 429) redirect(`/apply/${encodeURIComponent(slug)}?error=rate`);
  if (!response.ok) redirect(`/apply/${encodeURIComponent(slug)}?error=unavailable`);
  redirect('/login?application=1');
}
export async function submitAuthenticatedApplication(slug: string, data: FormData) {
  const parsed = memberApplicationInputSchema.safeParse({ fullName: value(data, 'fullName'), phone: value(data, 'phone'), consent: data.get('consent') === 'yes' });
  if (!parsed.success) redirect(`/gyms/${encodeURIComponent(slug)}/apply?error=invalid`);
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/applications`), { method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(parsed.data), cache: 'no-store' }); }
  catch { redirect(`/gyms/${encodeURIComponent(slug)}/apply?error=unavailable`); }
  if (response.status === 401) redirect('/login?error=expired');
  if (!response.ok) redirect(`/gyms/${encodeURIComponent(slug)}/apply?error=unavailable`);
  revalidatePath('/applications');
  redirect('/applications?submitted=1');
}
export async function decideMemberApplication(slug: string, applicationId: string, formData: FormData) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  const decision = value(formData, 'decision');
  const raw = decision === 'APPROVE' ? { decision, expectedVersion: Number(value(formData, 'expectedVersion')),
    membershipPlanId: value(formData, 'membershipPlanId'), dateOfBirth: value(formData, 'dateOfBirth') } : {
      decision, expectedVersion: Number(value(formData, 'expectedVersion')),
      applicantReason: value(formData, 'applicantReason'), privateNote: value(formData, 'privateNote') };
  const input = memberApplicationDecisionSchema.safeParse(raw);
  if (!input.success) redirect(`/gyms/${encodeURIComponent(slug)}/owner/applications?error=invalid`);
  const endpoint = input.data.decision === 'APPROVE' ? 'approve' : 'reject';
  try {
    const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/owner/applications/${encodeURIComponent(applicationId)}/${endpoint}`), {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(input.data), cache: 'no-store', signal: AbortSignal.timeout(20_000),
    });
    if (response.status === 401) redirect('/login?error=expired');
    if (response.status === 409) redirect(`/gyms/${encodeURIComponent(slug)}/owner/applications?error=conflict`);
    if (!response.ok) redirect(`/gyms/${encodeURIComponent(slug)}/owner/applications?error=outcome`);
  } catch (error) { if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT')) throw error;
    redirect(`/gyms/${encodeURIComponent(slug)}/owner/applications?error=outcome`); }
  revalidatePath(`/gyms/${slug}/owner/applications`);
  redirect(`/gyms/${slug}/owner/applications?updated=1`);
}

export async function consentToApplicationEnrollment(slug: string, operationId: string, data: FormData) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  const currentPassword = data.get('currentPassword');
  if (typeof currentPassword !== 'string' || currentPassword.length === 0 || currentPassword.length > 1024) {
    redirect('/applications?consent=invalid');
  }
  try {
    const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/member-enrollments/${encodeURIComponent(operationId)}/consent`), {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ decision: 'ACCEPT', currentPassword }), cache: 'no-store', signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401) redirect('/login?error=expired');
    if (!response.ok) redirect('/applications?consent=unavailable');
  } catch (error) { if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT')) throw error;
    redirect('/applications?consent=unavailable'); }
  revalidatePath('/applications');
  redirect('/applications?consent=recorded');
}

export async function readOwnerApplicationNotice(slug: string, noticeId: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  try {
    const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/owner/application-notifications/${encodeURIComponent(noticeId)}/read`), {
      method: 'POST', headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    if (response.status === 401) redirect('/login?error=expired');
  } catch (error) { if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT')) throw error; }
  revalidatePath(`/gyms/${slug}/owner/applications`);
}

export async function readApplicantApplicationNotice(noticeId: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  try {
    const response = await fetch(apiUrl(`/gyms/me/application-notifications/${encodeURIComponent(noticeId)}/read`), {
      method: 'POST', headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    if (response.status === 401) redirect('/login?error=expired');
  } catch (error) { if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT')) throw error; }
  revalidatePath('/applications');
}

export async function withdrawMemberApplication(applicationId: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  try {
    const response = await fetch(apiUrl(`/gyms/me/applications/${encodeURIComponent(applicationId)}/withdraw`), {
      method: 'POST', headers: { authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    if (response.status === 401) redirect('/login?error=expired');
    if (!response.ok) redirect('/applications?error=withdraw');
  } catch (error) { if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT')) throw error;
    redirect('/applications?error=withdraw'); }
  revalidatePath('/applications');
  redirect('/applications?withdrawn=1');
}
