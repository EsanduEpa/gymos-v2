export type ProfileActionState = { status: 'idle' | 'success' | 'error'; message?: string; version?: number; fieldErrors?: Record<string, string> };

export const initialProfileActionState: ProfileActionState = { status: 'idle' };
