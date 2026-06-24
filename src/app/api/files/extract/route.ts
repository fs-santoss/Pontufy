import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'txt', 'md', 'docx', 'doc',
  'pptx', 'xlsx', 'csv',
  'mp4', 'mp3', 'wav', 'webm',
]);

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    await getSessionContext();
  } catch {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll('files') as File[];

  if (!files.length) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  const results: { name: string; text: string; extracted: boolean }[] = [];

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      results.push({ name: file.name, text: '', extracted: false });
      continue;
    }

    if (file.size > MAX_FILE_SIZE) {
      results.push({ name: file.name, text: `[Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB]`, extracted: false });
      continue;
    }

    try {
      const text = await extractText(file, ext);
      results.push({ name: file.name, text, extracted: text.length > 0 });
    } catch (err) {
      console.error(`[files/extract] Erro ao processar ${file.name}:`, err);
      results.push({ name: file.name, text: '', extracted: false });
    }
  }

  return NextResponse.json({ results });
}

async function extractText(file: File, ext: string): Promise<string> {
  switch (ext) {
    case 'txt':
    case 'md':
    case 'csv':
      return await file.text();

    case 'pdf':
      return await extractPdf(file);

    case 'docx':
    case 'doc':
      return await extractDocx(file);

    case 'pptx':
    case 'xlsx':
      return `[Arquivo ${ext.toUpperCase()}: ${file.name} — conteúdo disponível como referência]`;

    case 'mp4':
    case 'mp3':
    case 'wav':
    case 'webm':
      return `[Mídia: ${file.name} — transcrição não disponível, usar como material de apoio]`;

    default:
      return '';
  }
}

async function extractPdf(file: File): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const data = new Uint8Array(await file.arrayBuffer());
  const parser = new PDFParse({ data } as any);
  const result: any = await parser.getText();
  return (result.text as string).slice(0, 50000);
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await mammoth.extractRawText({ buffer });
  return result.value.slice(0, 50000);
}
