export const SESSION_COOKIE = 'gymos_access_token';

export function apiUrl(path: string): string {
  const base = process.env.GYMOS_API_URL ?? 'http://127.0.0.1:3001';
  return `${base.replace(/\/$/, '')}${path}`;
}

export type GymTheme = {
  slug: string;
  name: string;
  theme: { primaryColor: string; logoUrl: string | null };
};

export type Member = {
  id: string;
  fullName: string;
  email: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
};
