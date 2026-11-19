'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { loadPtScan } from '@/app/pt-scan-actions';

export function MemberPtCode({ slug, sessionId }: { slug: string; sessionId: string }) {
  const [code, setCode] = useState<{ image: string; expiresAt: string; command: 'START' | 'COMPLETE' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!code) return;
    const timeout = window.setTimeout(() => {
      setCode(null);
      setMessage('This code expired. Generate a new one when your trainer is ready.');
    }, Math.max(0, Date.parse(code.expiresAt) - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [code]);

  async function requestCode() {
    setLoading(true);
    setCode(null);
    setMessage('');
    try {
      const result = await loadPtScan(slug, sessionId);
      if (!result) throw new Error('Unavailable');
      const qr = await import('qrcode');
      const image = await qr.toDataURL(result.token, { width: 240, margin: 4, errorCorrectionLevel: 'M' });
      setCode({ image, expiresAt: result.expiresAt, command: result.command });
    } catch {
      setMessage('The booking code is unavailable. Refresh your booking or ask your trainer to record the session manually.');
    } finally {
      setLoading(false);
    }
  }

  return <div>
    <button type="button" className="ui-button ui-button-secondary" onClick={requestCode} disabled={loading}>
      {loading ? 'Preparing…' : code ? 'Generate a fresh PT QR code' : 'Show PT QR code'}
    </button>
    {code ? <>
      <Image src={code.image} width={240} height={240} alt="Personal training booking QR code" unoptimized/>
      <p>Ask your trainer to scan this code to {code.command === 'START' ? 'start' : 'complete'} your session. The code expires after two minutes.</p>
    </> : null}
    {message ? <p role="status">{message}</p> : null}
  </div>;
}

const scanPattern = /^GymOSPT1\.\d{13}\.[A-Za-z0-9_-]{43}$/;

async function readCapture(file: File) {
  if (!file.type.startsWith('image/') || file.size > 12 * 1024 * 1024) return null;
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(scale * bitmap.width));
    canvas.height = Math.max(1, Math.round(scale * bitmap.height));
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const { default: decode } = await import('jsqr');
    return decode(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)?.data ?? null;
  } finally {
    bitmap.close();
  }
}

export function StaffPtScan({ token, onToken, locked, onReading }: {
  token: string;
  onToken: (token: string) => void;
  locked: boolean;
  onReading: (reading: boolean) => void;
}) {
  const [message, setMessage] = useState('');

  async function scan(file: File | undefined) {
    if (!file) return;
    onReading(true);
    onToken('');
    setMessage('');
    try {
      const value = await readCapture(file);
      if (!value || !scanPattern.test(value)) throw new Error('Unreadable');
      onToken(value);
    } catch {
      setMessage('Could not read a GymOS PT code. Try a clear photo of the member’s code or use the manual action.');
    } finally {
      onReading(false);
    }
  }

  return <details>
    <summary>Scan member PT code</summary>
    <label>Capture or upload the QR code
      <input type="file" accept="image/*" capture="environment" disabled={locked}
        onChange={event => { void scan(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }}/>
    </label>
    {token ? <p role="status">QR code read. Submit to verify it against this booking.
      <button className="ui-button ui-button-secondary" type="button" disabled={locked} onClick={() => onToken('')}>Use manual action</button>
    </p> : null}
    {message ? <p role="status">{message}</p> : null}
  </details>;
}
