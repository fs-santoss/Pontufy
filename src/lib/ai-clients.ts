import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

export type AIProvider = 'gemini' | 'anthropic' | 'openai';

// Gemini API Studio keys always start with "AIza".
// Tokens starting with "AQ." are short-lived OAuth access tokens from IDEs/gcloud
// and are not accepted by the generativelanguage.googleapis.com REST endpoint.
const GEMINI_APIKEY_RE = /^AIza/;

function isValidGeminiKey(key: string): boolean {
  return GEMINI_APIKEY_RE.test(key);
}

let _anthropic: Anthropic | null = null;
let _openai: OpenAI | null = null;
let _gemini: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (_gemini) return _gemini;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY ausente. Gere uma chave em https://aistudio.google.com/app/apikey',
    );
  }
  if (!isValidGeminiKey(apiKey)) {
    throw new Error(
      `GEMINI_API_KEY inválida (formato "${apiKey.slice(0, 4)}…"). ` +
      'A chave do AI Studio começa com "AIza". ' +
      'Tokens OAuth (AQ.*) não são aceitos neste endpoint. ' +
      'Gere uma nova em https://aistudio.google.com/app/apikey',
    );
  }
  _gemini = new GoogleGenAI({ apiKey });
  return _gemini;
}

export function getAnthropicClient(): Anthropic {
  if (_anthropic) return _anthropic;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY ausente. Obtenha em https://console.anthropic.com/settings/keys',
    );
  }
  _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}

export function getOpenAIClient(): OpenAI {
  if (_openai) return _openai;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY ausente. Obtenha em https://platform.openai.com/api-keys',
    );
  }
  _openai = new OpenAI({ apiKey });
  return _openai;
}

/**
 * Returns all providers that have a key present AND (for Gemini) a valid format,
 * in the order the cascade should be attempted: Gemini → Anthropic → OpenAI.
 */
export function getAvailableProviders(): AIProvider[] {
  const available: AIProvider[] = [];

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && isValidGeminiKey(geminiKey)) {
    available.push('gemini');
  } else if (geminiKey) {
    console.warn(
      `[ai-clients] GEMINI_API_KEY com formato inválido ("${geminiKey.slice(0, 6)}…") — ignorada.`,
    );
  }

  if (process.env.ANTHROPIC_API_KEY) available.push('anthropic');
  if (process.env.OPENAI_API_KEY) available.push('openai');

  return available;
}
