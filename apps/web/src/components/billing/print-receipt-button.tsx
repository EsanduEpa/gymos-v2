'use client';

import { Button } from '@/components/ui';

export function PrintReceiptButton() {
  return <Button type="button" onClick={() => window.print()}>Print receipt</Button>;
}
