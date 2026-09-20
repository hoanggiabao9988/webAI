import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { apiKey } = await req.json();
  if (!apiKey || typeof apiKey !== 'string') {
    return NextResponse.json({ error: 'API key required' }, { status: 400 });
  }

  // Basic format check
  if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
    return NextResponse.json({ error: 'API key không hợp lệ. Key phải bắt đầu bằng AIza...' }, { status: 400 });
  }

  // Try a minimal request to verify key works
  try {
    const testRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET', signal: AbortSignal.timeout(8000) }
    );
    if (!testRes.ok) {
      const err = await testRes.json().catch(() => ({}));
      const msg = (err as { error?: { message?: string } })?.error?.message || 'API key không hợp lệ';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Không thể kết nối đến Google AI Studio. Kiểm tra lại key.' }, { status: 400 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set('baodevai_key', apiKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
  return res;
}
