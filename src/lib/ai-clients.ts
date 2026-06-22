import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

let _anthropic: Anthropic | null = null;
let _openai: OpenAI | null = null;
let _gemini: GoogleGenAI | null = null;

export function getAnthropicClient(): Anthropic {
  if (_anthropic) return _anthropic;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY não configurada. Defina a variável de ambiente para usar o provedor Anthropic.',
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
      'OPENAI_API_KEY não configurada. Defina a variável de ambiente para usar o provedor OpenAI.',
    );
  }
  _openai = new OpenAI({ apiKey });
  return _openai;
}

export function getGeminiClient(): GoogleGenAI {
  if (_gemini) return _gemini;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY não configurada. Defina a variável de ambiente para usar o provedor Google Gemini.',
    );
  }
  _gemini = new GoogleGenAI({ apiKey });
  return _gemini;
}

export type AIProvider = 'gemini' | 'anthropic' | 'openai';

export function getConfiguredProvider(): AIProvider {
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  throw new Error(
    'Nenhum provedor de IA configurado. Defina GEMINI_API_KEY, ANTHROPIC_API_KEY ou OPENAI_API_KEY.',
  );
}
