import { z } from 'zod';

// Browser validation works with the production CSP that blocks dynamic code evaluation.
if (typeof window !== 'undefined') z.config({ jitless: true });
