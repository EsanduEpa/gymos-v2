import 'server-only';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { existingEndpointContracts, currentSessionSchema } from '@gymos/contracts/legacy';
import { resolveCurrentSession } from './navigation';
import { apiUrl, gymRoleUrl, SESSION_COOKIE, type GymRole } from './gymos';

export async function requireGymContext(slug: string, expectedRole: GymRole) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  const current = await resolveCurrentSession(token);
  if (current.status === 401) redirect('/login');
  if (current.status === 403) redirect('/change-password');
  if (!current.ok) throw new Error('Account unavailable');
  const session = currentSessionSchema.parse(await current.json());
  if (session.globalRole === 'SUPER_ADMIN') redirect('/admin');
  const gym = session.gyms.find(candidate => candidate.slug === slug);
  if (!gym) notFound();
  if (gym.role !== expectedRole) redirect(gymRoleUrl(gym));
  const access = await fetch(apiUrl(`/gyms/${slug}/access`), { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (access.status === 401) redirect('/login');
  if (access.status === 403 || access.status === 404) notFound();
  if (!access.ok) throw new Error('Gym unavailable');
  const checked = existingEndpointContracts.E06.response.parse(await access.json());
  if (checked.slug !== slug || checked.role !== gym.role || checked.gymId !== gym.id) notFound();
  let themeResponse: Response | undefined;
  try { themeResponse = await fetch(apiUrl(`/gyms/${slug}/theme`), { cache: 'no-store' }); } catch { /* Classic fallback */ }
  if (themeResponse?.status === 404) notFound();
  const theme = existingEndpointContracts.E04.response.safeParse(await themeResponse?.json().catch(() => null));
  return { token, session, gym, theme: themeResponse?.ok && theme.success && theme.data.slug === slug ? theme.data.theme : { primaryColor: '#007A35', logoUrl: null } };
}
