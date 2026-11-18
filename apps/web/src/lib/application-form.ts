import { gymSlugSchema } from '@gymos/contracts';

export function normalizeGymCode(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  const parsed = gymSlugSchema.safeParse(value.trim().toLowerCase());
  return parsed.data;
}

export function normalizeGymCodeSegment(value: string): string | undefined {
  try {
    return normalizeGymCode(decodeURIComponent(value));
  } catch {
    return undefined;
  }
}

export const applicationFieldErrors = {
  fullName: 'Enter a name between 2 and 120 characters.',
  email: 'Enter a valid email address.',
  phone: 'Enter a phone number of up to 40 characters.',
  password: 'Use 10 to 200 characters, include a number or symbol, and leave out leading or trailing spaces.',
  consent: 'Confirm that you want to apply to this gym.',
};

export type ApplicationFormState = {
  error?: string;
  fieldErrors?: Partial<typeof applicationFieldErrors>;
  draft?: { fullName: string; email: string; phone: string; consent: boolean };
  attempt?: number;
};
