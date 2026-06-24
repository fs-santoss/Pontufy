import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';

export async function GET() {
  try {
    const { role } = await getSessionContext();
    if (role !== 'admin_rh') {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
  }

  const geminiKey = process.env.GEMINI_API_KEY || '';
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
  const openaiKey = process.env.OPENAI_API_KEY || '';
  const anthropicKey = process.env.ANTHROPIC_API_KEY || '';

  const providers: Record<string, { configured: boolean; keyPrefix?: string; envVar: string }> = {
    gemini: {
      configured: !!(geminiKey || googleKey),
      keyPrefix: geminiKey ? geminiKey.slice(0, 8) + '...' : googleKey ? googleKey.slice(0, 8) + '...' : undefined,
      envVar: geminiKey ? 'GEMINI_API_KEY' : googleKey ? 'GOOGLE_GENERATIVE_AI_API_KEY' : 'GEMINI_API_KEY (nao encontrada)',
    },
    openai: {
      configured: !!openaiKey,
      keyPrefix: openaiKey ? openaiKey.slice(0, 8) + '...' : undefined,
      envVar: openaiKey ? 'OPENAI_API_KEY' : 'OPENAI_API_KEY (nao encontrada)',
    },
    anthropic: {
      configured: !!anthropicKey,
      keyPrefix: anthropicKey ? anthropicKey.slice(0, 8) + '...' : undefined,
      envVar: anthropicKey ? 'ANTHROPIC_API_KEY' : 'ANTHROPIC_API_KEY (nao encontrada)',
    },
  };

  const anyConfigured = Object.values(providers).some((p) => p.configured);

  return NextResponse.json({
    status: anyConfigured ? 'ok' : 'no_providers',
    providers,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    hint: !anyConfigured
      ? 'Nenhuma chave de IA configurada. No Vercel: Settings > Environment Variables > Adicione GEMINI_API_KEY para TODOS os ambientes (Production, Preview, Development).'
      : undefined,
  });
}
