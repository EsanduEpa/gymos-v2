'use server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { publicMemberApplicationInputSchema, memberApplicationInputSchema, memberApplicationDecisionSchema } from '@gymos/contracts';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import { applicationFieldErrors, normalizeGymCode, type ApplicationFormState } from '@/lib/application-form';
function value(data: FormData, name: string) { const item = data.get(name); return typeof item === 'string' ? item.trim() : ''; }
function invalidApplication(issues: ReadonlyArray<{ path: PropertyKey[] }>): ApplicationFormState {
  const fieldErrors: ApplicationFormState['fieldErrors'] = {};
  for (const { path: [field] } of issues) {
    if (typeof field !== 'string' || !Object.hasOwn(applicationFieldErrors, field)) continue;
    const name = field as keyof typeof applicationFieldErrors;
    fieldErrors[name] = applicationFieldErrors[name];
  }
  return { error: 'Check the highlighted fields and try again.', fieldErrors };
}
const unavailableGym = 'This gym is no longer accepting applications through this link. Check the code with your gym.';
const rateLimited = 'Too many attempts. Wait a moment before trying again.';

function applicationDraft(data: FormData, previous: ApplicationFormState, signedIn: boolean) {
  const draft = {
    fullName: value(data, 'fullName').slice(0, 120),
    email: signedIn ? '' : value(data, 'email').slice(0, 254),
    phone: value(data, 'phone').slice(0, 40),
    consent: data.get('consent') === 'yes',
  };
  const lastAttempt = previous?.attempt;
  const attempt = typeof lastAttempt === 'number' && Number.isSafeInteger(lastAttempt) ? lastAttempt + 1 : 1;
  return { draft, attempt };
}

export async function submitPublicApplication(slug: string, previous: ApplicationFormState, data: FormData): Promise<ApplicationFormState> {
  const state = applicationDraft(data, previous, false);
  const code = normalizeGymCode(slug);
  if (!code) return { ...state, error: unavailableGym };
  const parsed = publicMemberApplicationInputSchema.safeParse({ slug: code, fullName: value(data, 'fullName'), email: value(data, 'email'),
    phone: value(data, 'phone'), password: data.get('password'), consent: data.get('consent') === 'yes' });
  if (!parsed.success) return { ...state, ...invalidApplication(parsed.error.issues) };
  const unavailable = 'We couldn’t confirm your application. Wait a moment and try again.';
  let response: Response;
  try { response = await fetch(apiUrl('/gyms/applications'), { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(parsed.data), cache: 'no-store' }); } catch { return { ...state, error: unavailable }; }
  if (response.status === 429) return { ...state, error: rateLimited };
  if (response.status === 404) return { ...state, error: unavailableGym };
  if (!response.ok) return { ...state, error: unavailable };
  redirect('/login?application=1');
}
export async function submitAuthenticatedApplication(slug: string, previous: ApplicationFormState, data: FormData): Promise<ApplicationFormState> {
  const state = applicationDraft(data, previous, true);
  const parsed = memberApplicationInputSchema.safeParse({ fullName: value(data, 'fullName'), phone: value(data, 'phone'), consent: data.get('consent') === 'yes' });
  if (!parsed.success) return { ...state, ...invalidApplication(parsed.error.issues) };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  const unavailable = 'We couldn’t confirm your application. Check your application status before trying again.';
  let response: Response;
  try { response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/me/applications`), { method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(parsed.data), cache: 'no-store' }); }
  catch { return { ...state, error: unavailable }; }
  if (response.status === 401) redirect('/login?error=expired');
  if (response.status === 429) return { ...state, error: rateLimited };
  if (response.status === 404) return { ...state, error: unavailableGym };
  if (!response.ok) return { ...state, error: unavailable };
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
