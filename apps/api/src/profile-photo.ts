import { StreamableFile, UnprocessableEntityException } from '@nestjs/common';
import sharp from 'sharp';
import { z } from 'zod';
import { openCoachingRecord, sealCoachingRecord } from './coaching/coaching-records-crypto.js';

export const MAX_PROFILE_PHOTO_BYTES = 768 * 1024;

export async function prepareProfilePhoto(upload: Buffer) {
  return preparePhoto(upload, 384, 'cover');
}

export async function prepareProgressPhoto(upload: Buffer) {
  return preparePhoto(upload, 1600, 'inside');
}

async function preparePhoto(upload: Buffer, size: number, fit: 'cover' | 'inside') {
  try {
    if (!upload.length || upload.length > MAX_PROFILE_PHOTO_BYTES) throw new Error('Photo size');
    const photo = sharp(upload, { limitInputPixels: 16_000_000, failOn: 'warning' });
    const metadata = await photo.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) !== 1) {
      throw new Error('Unsupported photo');
    }
    return await photo.rotate().resize(size, size, { fit, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  } catch {
    throw new UnprocessableEntityException('Choose a JPEG, PNG, or WebP photo under 768 KB and 16 megapixels');
  }
}

export function sealProfilePhoto(photo: Buffer, gymId: string, role: string, actorId: string) {
  return sealCoachingRecord(photo.toString('base64'), ['profile-photo', gymId, role, actorId]);
}

export function streamProfilePhoto(sealed: string, gymId: string, role: string, actorId: string) {
  const data = openCoachingRecord(sealed, ['profile-photo', gymId, role, actorId], z.base64());
  return new StreamableFile(Buffer.from(data, 'base64'), { type: 'image/webp' });
}
