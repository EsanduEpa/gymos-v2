'use client';
import { useState } from 'react';
export function GymLogo({ name, url }: { name: string; url: string | null }) {
  const [failed, setFailed] = useState(false);
  return <div className="gym-logo">{url && !failed ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={`${name} logo`} onError={() => setFailed(true)} />
  ) : name.slice(0, 1).toUpperCase()}</div>;
}
