// ═══════════════════════════════════════════════════════════════════════
// Next.js API Route — POST /api/postback
// Receptor server-to-server de comissões das redes afiliadas.
// ═══════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { handlePostback } from '@/backend/postbackHandler';
import type { PostbackPayload } from '@/backend/postbackHandler';

export async function POST(request: NextRequest) {
  try {
    const payload: PostbackPayload = await request.json();
    const signature = request.headers.get('x-pontufy-signature');

    const result = await handlePostback(payload, signature);

    const status = result.success ? 200 : 400;
    return NextResponse.json(result, { status });
  } catch {
    return NextResponse.json(
      { success: false, message: 'BAD_REQUEST' },
      { status: 400 },
    );
  }
}
