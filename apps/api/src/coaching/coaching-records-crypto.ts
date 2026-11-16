import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';
import type { z } from 'zod';

function key() {
  const encoded = process.env.GYMOS_COACHING_DATA_KEY;
  if (!encoded || !/^[a-f0-9]{64}$/i.test(encoded)) throw new ServiceUnavailableException('Coaching records are temporarily unavailable');
  return Buffer.from(encoded, 'hex');
}

export function sealCoachingRecord(value: unknown, binding: string[]) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), nonce);
  cipher.setAAD(Buffer.from(JSON.stringify(binding)));
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return ['v1', nonce.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

export function openCoachingRecord<Schema extends z.ZodType>(sealed: string, binding: string[], schema: Schema): z.output<Schema> {
  const secret = key();
  try {
    const [version, nonce, tag, data, extra] = sealed.split('.');
    if (version !== 'v1' || !nonce || !tag || !data || extra !== undefined) throw Error('Invalid record');
    const decipher = createDecipheriv('aes-256-gcm', secret, Buffer.from(nonce, 'base64url'), { authTagLength: 16 });
    decipher.setAAD(Buffer.from(JSON.stringify(binding)));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    const decoded = Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]);
    return schema.parse(JSON.parse(decoded.toString('utf8')));
  } catch {
    throw new ServiceUnavailableException('Coaching records are temporarily unavailable');
  }
}
