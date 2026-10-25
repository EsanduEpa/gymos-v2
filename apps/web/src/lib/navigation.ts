import { apiUrl } from '@/lib/gymos';

export type CurrentSession = {
  globalRole: 'SUPER_ADMIN' | 'USER';
  mustChangePassword: boolean;
  gyms: { id: string; slug: string; name: string; role: 'OWNER' | 'TRAINER' | 'MEMBER' }[];
};

export async function resolveCurrentSession(token: string): Promise<Response> {
  return fetch(apiUrl('/auth/session'), {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
}
