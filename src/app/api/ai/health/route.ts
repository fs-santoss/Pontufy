import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { getAvailableProviders, getGeminiClient, getAnthropicClient, getOpenAIClient } from '@/lib/ai-clients';

const PING_PROMPT = 'Responda apenas a palavra: OK';

async function pingGemini(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const ai = getGeminiClient();
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: PING_PROMPT,
    });
    const text = res.text?.trim();
    if (!text) throw new Error('resposta vazia');
    return { ok: true, latencyMs: Date.now() - start };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - start, error: e?.message?.slice(0, 200) };
  }
}

async function pingAnthropic(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const client = getAnthropicClient();
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8,
      messages: [{ role: 'user', content: PING_PROMPT }],
    });
    const text = msg.content.find((b) => b.type === 'text');
    if (!text) throw new Error('resposta vazia');
    return { ok: true, latencyMs: Date.now() - start };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - start, error: e?.message?.slice(0, 200) };
  }
}

async function pingOpenAI(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const client = getOpenAIClient();
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 4,
      messages: [{ role: 'user', content: PING_PROMPT }],
    });
    const text = res.choices[0]?.message?.content;
    if (!text) throw new Error('resposta vazia');
    return { ok: true, latencyMs: Date.now() - start };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - start, error: e?.message?.slice(0, 200) };
  }
}

export async function GET() {
  try {
    const { role } = await getSessionContext();
    if (role !== 'admin_rh' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const available = getAvailableProviders();

  const [gemini, anthropic, openai] = await Promise.all([
    available.includes('gemini')    ? pingGemini()    : Promise.resolve(null),
    available.includes('anthropic') ? pingAnthropic() : Promise.resolve(null),
    available.includes('openai')    ? pingOpenAI()    : Promise.resolve(null),
  ]);

  const geminiKeyRaw = process.env.GEMINI_API_KEY;

  const providers = {
    gemini: gemini
      ? gemini
      : { ok: false, latencyMs: 0, error: geminiKeyRaw ? 'Chave com formato inválido (não começa com AIza)' : 'GEMINI_API_KEY ausente' },
    anthropic: anthropic ?? { ok: false, latencyMs: 0, error: 'ANTHROPIC_API_KEY ausente' },
    openai:    openai    ?? { ok: false, latencyMs: 0, error: 'OPENAI_API_KEY ausente' },
  };

  const anyOk = Object.values(providers).some((p) => p.ok);
  const overallStatus = anyOk ? 'degraded_or_ok' : 'all_failed_using_static_fallback';

  return NextResponse.json({ status: overallStatus, providers }, { status: anyOk ? 200 : 503 });
}
