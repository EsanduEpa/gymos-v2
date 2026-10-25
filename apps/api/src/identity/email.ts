import { z } from 'zod';

// DEC-02: the same validator is imported by HTTP, service, CLI and fixture writers.
// Tenant contact email is not an identity link and is intentionally separate.
export const identityEmailSchema = z.string().trim().max(254)
  .regex(/^[!-~]+$/, 'Use an ASCII email without whitespace')
  .pipe(z.email())
  .transform((value) => value.toLowerCase());

export function normalizeIdentityEmail(value: unknown): string {
  return identityEmailSchema.parse(value);
}
