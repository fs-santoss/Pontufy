/**
 * Validates connectivity to all three AI providers.
 * Run with: node scripts/validate-ai.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* file not present */ }
}

loadEnvFile(join(root, '.env'));
loadEnvFile(join(root, '.env.local'));

const GEMINI_KEY    = process.env.GEMINI_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_KEY    = process.env.OPENAI_API_KEY;

// ── Key format validation ────────────────────────────────────────────────────

function diagnoseGeminiKey(key) {
  if (!key) return { valid: false, reason: 'ausente' };
  if (key.startsWith('AIza')) return { valid: true };
  if (key.startsWith('AQ.')) {
    return {
      valid: false,
      reason: 'Token OAuth de curta duração (prefixo "AQ."). ' +
        'Este tipo de token é gerado pela CLI do Google/Gemini IDE e expira rapidamente. ' +
        'Ele NÃO funciona com a API REST do AI Studio. ' +
        'Obtenha uma API Key permanente em: https://aistudio.google.com/app/apikey',
    };
  }
  return {
    valid: false,
    reason: `Formato desconhecido (prefixo "${key.slice(0, 6)}…"). Esperado "AIza…".`,
  };
}

function diagnoseAnthropicKey(key) {
  if (!key) return { valid: false, reason: 'ausente' };
  if (key.startsWith('sk-ant-')) return { valid: true };
  return { valid: false, reason: `Formato inesperado (prefixo "${key.slice(0, 8)}…").` };
}

function diagnoseOpenAIKey(key) {
  if (!key) return { valid: false, reason: 'ausente' };
  if (key.startsWith('sk-')) return { valid: true };
  return { valid: false, reason: `Formato inesperado (prefixo "${key.slice(0, 6)}…").` };
}

// ── Live connectivity tests ──────────────────────────────────────────────────

async function checkGemini() {
  const diag = diagnoseGeminiKey(GEMINI_KEY);
  if (!diag.valid) return { status: 'invalid_key', reason: diag.reason };
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
    const res = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: 'Say OK' });
    return { status: 'ok', reply: res.text?.trim().slice(0, 40) };
  } catch (e) {
    const msg = e.message ?? String(e);
    if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      return { status: 'quota', reason: 'Cota gratuita atingida. Verifique billing em https://console.cloud.google.com/billing' };
    }
    if (msg.includes('401') || msg.includes('403') || msg.includes('credential')) {
      return { status: 'auth_error', reason: `Autenticação rejeitada: ${msg.slice(0, 120)}` };
    }
    return { status: 'error', reason: msg.slice(0, 120) };
  }
}

async function checkAnthropic() {
  const diag = diagnoseAnthropicKey(ANTHROPIC_KEY);
  if (!diag.valid) return { status: 'invalid_key', reason: diag.reason };
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Say OK' }],
    });
    const text = msg.content.find(b => b.type === 'text')?.text?.trim();
    return { status: 'ok', reply: text?.slice(0, 40) };
  } catch (e) {
    const msg = e.message ?? String(e);
    if (msg.includes('credit balance') || msg.includes('billing') || msg.includes('402')) {
      return { status: 'no_credits', reason: 'Saldo insuficiente. Recarregue em https://console.anthropic.com/billing' };
    }
    if (msg.includes('401') || msg.includes('invalid x-api-key')) {
      return { status: 'auth_error', reason: 'Chave inválida ou revogada.' };
    }
    if (msg.includes('429') || msg.includes('rate limit')) {
      return { status: 'rate_limit', reason: 'Rate limit atingido. Aguarde alguns segundos.' };
    }
    return { status: 'error', reason: msg.slice(0, 120) };
  }
}

async function checkOpenAI() {
  const diag = diagnoseOpenAIKey(OPENAI_KEY);
  if (!diag.valid) return { status: 'invalid_key', reason: diag.reason };
  try {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: OPENAI_KEY });
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 8,
      messages: [{ role: 'user', content: 'Say OK' }],
    });
    const text = res.choices[0]?.message?.content?.trim();
    return { status: 'ok', reply: text?.slice(0, 40) };
  } catch (e) {
    const msg = e.message ?? String(e);
    if (msg.includes('quota') || msg.includes('429') || msg.includes('insufficient_quota')) {
      return { status: 'quota', reason: 'Cota ou saldo esgotado. Verifique em https://platform.openai.com/billing' };
    }
    if (msg.includes('401') || msg.includes('Incorrect API key')) {
      return { status: 'auth_error', reason: 'Chave inválida ou revogada.' };
    }
    return { status: 'error', reason: msg.slice(0, 120) };
  }
}

// ── Output ───────────────────────────────────────────────────────────────────

const icons = {
  ok:          '✅',
  invalid_key: '🔑',
  no_credits:  '💳',
  quota:       '📊',
  rate_limit:  '⏳',
  auth_error:  '🚫',
  error:       '❌',
};

function fmt(name, r) {
  const icon = icons[r.status] ?? '❓';
  if (r.status === 'ok') return `${icon} ${name.padEnd(12)} → resposta: "${r.reply}"`;
  return `${icon} ${name.padEnd(12)} → [${r.status.toUpperCase()}] ${r.reason ?? ''}`;
}

console.log('\n🔍 Pontufy — Validação de Conexão com Provedores de IA\n');

const [gemini, anthropic, openai] = await Promise.all([checkGemini(), checkAnthropic(), checkOpenAI()]);

console.log(fmt('Gemini',    gemini));
console.log(fmt('Anthropic', anthropic));
console.log(fmt('OpenAI',    openai));

const results = [gemini, anthropic, openai];
const okCount      = results.filter(r => r.status === 'ok').length;
const activeCount  = results.filter(r => r.status !== 'invalid_key').length;

console.log();
if (okCount === 3) {
  console.log('✅  Todos os provedores operacionais. Cascade ativo com 3 opções.');
} else if (okCount > 0) {
  console.log(`⚠️  ${okCount}/3 provedor(es) operacional(is). O cascade vai usar o(s) disponível(is).`);
} else {
  console.log('❌  Nenhum provedor respondeu. O gerador usará o catálogo estático de cursos (sem downtime).');
  console.log('    Após corrigir as chaves/billing, rode este script novamente para confirmar.');
}
console.log();
