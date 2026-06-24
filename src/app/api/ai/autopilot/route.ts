import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { getSessionContext } from '@/backend/session';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const session = await getSessionContext();
    if (!session || session.role !== 'admin_rh') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { prompt } = await req.json();

    if (!prompt) {
      return new NextResponse('Prompt is required', { status: 400 });
    }

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: 'Você é um assistente especialista em RH e gamificação corporativa. Crie textos engajadores e diretos.',
      prompt: prompt,
      maxTokens: 500,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    console.error('Error generating autopilot stream:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
