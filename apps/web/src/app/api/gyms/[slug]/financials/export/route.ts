import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { financeExportInputSchema } from '@gymos/contracts';
import { apiUrl, SESSION_COOKIE } from '@/lib/gymos';
import { exportRequestSignal } from '@/lib/export-request-signal';

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await request.formData();
  const kind = String(form.get('kind') ?? '');
  const actionType = String(form.get('actionType') ?? '');
  const input = financeExportInputSchema.safeParse({ kind, ...(form.get('from') ? { from: String(form.get('from')) } : {}),
    ...(form.get('to') ? { to: String(form.get('to')) } : {}), page: Number(form.get('page') ?? 1), pageSize: Number(form.get('pageSize') ?? 20),
    ...(actionType ? { actionType } : {}) });
  const destination = new URL(`/gyms/${encodeURIComponent(slug)}/owner/financials?tab=export&exportError=1`, request.url);
  if (!input.success) return NextResponse.redirect(destination, 303);
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.redirect(new URL('/login', request.url), 303);
  try {
    const response = await fetch(apiUrl(`/gyms/${encodeURIComponent(slug)}/financials/export`), { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(input.data), cache: 'no-store', signal: exportRequestSignal(request.signal) });
    if (response.status === 401) return NextResponse.redirect(new URL('/login?error=expired', request.url), 303);
    if (response.status === 403 || response.status === 404) return new NextResponse('Export is not available for this account.', { status: response.status });
    if (!response.ok) return NextResponse.redirect(destination, 303);
    const bytes = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') === 'text/csv; charset=utf-8' ? 'text/csv; charset=utf-8' : 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition') ?? 'attachment; filename="gymos-export.csv"';
    return new NextResponse(bytes, { status: 200, headers: { 'content-type': contentType, 'content-disposition': contentDisposition,
      'cache-control': 'no-store, private', 'x-content-type-options': 'nosniff' } });
  } catch { return NextResponse.redirect(destination, 303); }
}
