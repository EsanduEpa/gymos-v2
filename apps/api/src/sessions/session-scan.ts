import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const sessionScanTokenPattern = /^GymOSPT1\.\d{13}\.[A-Za-z0-9_-]{43}$/;
const lifetimeMs = 2 * 60_000;

type ScanBinding = {
  gymId: string;
  id: string;
  memberId: string;
  trainerId: string;
  version: number;
  command: 'START' | 'COMPLETE';
};

function signature(binding: ScanBinding, expiry: number) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new ConflictException('PT scan signing is unavailable');
  const body = JSON.stringify([
    'gymos/pt-scan/v1', binding.gymId, binding.id, binding.memberId, binding.trainerId,
    binding.version, binding.command, expiry,
  ]);
  return createHmac('sha256', secret).update(body).digest('base64url');
}

export function createSessionScan(binding: ScanBinding, now: Date) {
  const expiry = now.getTime() + lifetimeMs;
  return {
    token: `GymOSPT1.${expiry}.${signature(binding, expiry)}`,
    expiresAt: new Date(expiry).toISOString(),
    command: binding.command,
  };
}

export function assertSessionScan(token: string | undefined, binding: ScanBinding, now: Date) {
  // Staff can record the ordinary manual action when a scan is unavailable.
  if (token === undefined) return;
  if (sessionScanTokenPattern.test(token)) {
    const [, timestamp, signed] = token.split('.');
    const expiry = Number(timestamp);
    if (expiry > now.getTime() && expiry <= now.getTime() + lifetimeMs &&
        timingSafeEqual(Buffer.from(signed!), Buffer.from(signature(binding, expiry)))) return;
  }
  throw new UnprocessableEntityException('The PT code expired or does not match this booking and action');
}
