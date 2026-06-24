'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, CheckCircle, ChevronRight, ArrowLeft, AlertCircle, Upload, X, FileText } from 'lucide-react';
import { generateTrainingCourse } from '@/actions/course-generator';
import type { GenerateTrainingResult } from '@/actions/course-generator';
import { saveCourse } from '@/lib/local-courses';
import { mutate } from 'swr';

type SuccessResult = Extract<GenerateTrainingResult, { success: true }>;

const ALLOWED_EXTENSIONS = [
  '.pdf', '.txt', '.md', '.docx', '.doc',
  '.pptx', '.xlsx', '.csv',
  '.mp4', '.mp3', '.wav', '.webm',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function AIWizard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [sector, setSector] = useState('tech');
  const [error, setError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeChecklist, setActiveChecklist] = useState(0);
  const [result, setResult] = useState<SuccessResult | null>(null);

  const sectorLabels: Record<string, string> = {
    tech: 'Tecnologia e Inovação',
    health: 'Saúde e Bem-Estar',
    retail: 'Varejo e Vendas',
    industry: 'Indústria e Manufatura',
  };

  const checklistItems = [
    'Processando materiais de referência...',
    'Enviando prompt para a IA...',
    'Estruturando módulos de ensino...',
    'Calibrando distribuição de recompensas (pts)...',
    'Finalizando formatação...',
  ];

  const addFiles = (newFiles: FileList | File[]) => {
    const valid: File[] = [];
    for (const f of Array.from(newFiles)) {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) continue;
      if (f.size > MAX_FILE_SIZE) continue;
      if (files.length + valid.length >= MAX_FILES) break;
      valid.push(f);
    }
    if (valid.length > 0) setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const extractTextFromFiles = async (): Promise<string> => {
    if (files.length === 0) return '';

    const clientTexts: string[] = [];
    const serverFiles: File[] = [];

    for (const f of files) {
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (ext === 'txt' || ext === 'md' || ext === 'csv') {
        const text = await f.text();
        clientTexts.push(`=== ${f.name} ===\n${text}`);
      } else {
        serverFiles.push(f);
      }
    }

    if (serverFiles.length > 0) {
      const formData = new FormData();
      serverFiles.forEach((f) => formData.append('files', f));
      try {
        const res = await fetch('/api/files/extract', { method: 'POST', body: formData });
        if (res.ok) {
          const { results } = await res.json();
          for (const r of results) {
            if (r.text) clientTexts.push(`=== ${r.name} ===\n${r.text}`);
          }
        }
      } catch (err) {
        console.error('[AIWizard] Erro ao extrair texto dos arquivos:', err);
      }
    }

    return clientTexts.join('\n\n');
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStep(2);
    setLoadingProgress(0);
    setActiveChecklist(0);
    setError('');

    try {
      const referenceContent = await extractTextFromFiles();

      const res = await generateTrainingCourse({
        prompt,
        sector: sectorLabels[sector] ?? sector,
        referenceContent: referenceContent || undefined,
      });

      if (!res.success) {
        setError(res.error);
        setStep(1);
        return;
      }

      saveCourse({
        id: res.course.id,
        title: res.course.title,
        description: res.course.description,
        status: res.course.status,
        createdAt: res.course.createdAt,
        cachedAt: Date.now(),
        lessons: res.course.lessons,
      });

      setResult(res);
      setStep(3);

      mutate('/api/courses?limit=50');
      mutate('/api/courses?page=1&limit=12');
      mutate('/api/courses/enrolled');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado ao gerar curso. Verifique o console do servidor.');
      setStep(1);
    }
  };

  useEffect(() => {
    if (step === 2) {
      const interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 95) return 95;
          const next = prev + 1;
          if (next > 15 && next <= 35) setActiveChecklist(1);
          if (next > 35 && next <= 60) setActiveChecklist(2);
          if (next > 60 && next <= 80) setActiveChecklist(3);
          if (next > 80) setActiveChecklist(4);
          return next;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [step]);

  if (step === 1) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s_ease-out]">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-brand-slate flex items-center gap-2">
            <Sparkles className="text-emerald-500" /> Assistente de IA
          </h2>
          <p className="text-brand-text mt-1">Crie treinamentos corporativos engajadores em segundos.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-rose-700">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-brand-slate mb-2">
              Setor/Vertical de Atuação
            </label>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-brand-slate rounded-lg p-3 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
            >
              <option value="tech">Tecnologia e Inovação</option>
              <option value="health">Saúde e Bem-Estar</option>
              <option value="retail">Varejo e Vendas</option>
              <option value="industry">Indústria e Manufatura</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-brand-slate mb-2">
              O que você deseja ensinar?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-32 bg-gray-50 border border-gray-200 text-brand-slate rounded-lg p-3 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all resize-none"
              placeholder="Ex: Crie um treinamento de LGPD focado na equipe de atendimento ao cliente, com foco prático em proteção de dados e cenários de call center..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-brand-slate mb-2">
              Material de Referência <span className="text-brand-text font-normal">(opcional)</span>
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ALLOWED_EXTENSIONS.join(',')}
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
                className="hidden"
              />
              <Upload size={24} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-brand-text">
                Arraste arquivos aqui ou <span className="text-emerald-600 font-semibold">clique para selecionar</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, Word, TXT, PowerPoint, Excel, MD, MP4, MP3 — até {MAX_FILES} arquivos, 10MB cada
              </p>
            </div>

            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 group">
                    <FileText size={16} className="text-emerald-600 flex-shrink-0" />
                    <span className="text-sm text-brand-slate truncate flex-1">{f.name}</span>
                    <span className="text-xs text-gray-400">{formatFileSize(f.size)}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="p-1 rounded hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X size={14} className="text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-brand-text">Custo da operação:</span>
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                1 Crédito de IA
              </span>
            </div>

            <button
              onClick={handleGenerate}
              className={`flex items-center justify-center gap-2 font-bold px-8 py-3 rounded-lg shadow-sm transition-all ${
                prompt.trim()
                  ? 'bg-gradient-pontufy text-emerald-900 hover:shadow-md hover:scale-[1.02]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Gerar Treinamento <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-12 text-center animate-[fadeIn_0.3s_ease-out]">
        <div className="w-16 h-16 bg-gradient-pontufy rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-100 animate-pulse">
          <Sparkles className="text-emerald-900" size={32} />
        </div>
        <h2 className="text-2xl font-black text-brand-slate mb-2">A IA está trabalhando...</h2>
        <p className="text-brand-text mb-10">Isso pode levar até 30 segundos.</p>

        <div className="w-full max-w-xl mx-auto h-2 bg-gray-100 rounded-full overflow-hidden mb-8">
          <div
            className="h-full bg-gradient-pontufy rounded-full transition-all duration-300 ease-out"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>

        <div className="w-full max-w-sm mx-auto text-left space-y-4">
          {checklistItems.map((item, index) => {
            const isCompleted = index < activeChecklist;
            const isActive = index === activeChecklist;
            return (
              <div
                key={index}
                className={`flex items-center gap-3 transition-all duration-500 ${
                  isCompleted ? 'text-emerald-600' : isActive ? 'text-brand-slate font-semibold' : 'text-gray-300'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle size={18} />
                ) : (
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      isActive ? 'border-brand-slate border-t-emerald-500 animate-spin' : 'border-gray-200'
                    }`}
                  />
                )}
                <span className="text-sm">{item}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (step === 3 && result) {
    const lessons = result.course.lessons;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s_ease-out]">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-brand-slate flex items-center gap-2">
              <CheckCircle className="text-emerald-500" /> Curso Criado!
            </h2>
            <p className="text-brand-text mt-1">
              <strong>{result.course.title}</strong> foi publicado com sucesso.
            </p>
          </div>
          <button
            onClick={() => {
              setStep(1);
              setPrompt('');
              setFiles([]);
              setResult(null);
            }}
            className="text-sm font-semibold text-brand-text hover:text-brand-slate flex items-center gap-1 transition-colors"
          >
            <ArrowLeft size={16} /> Criar outro
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6 text-sm">
          <span className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full">
            {result.lessonsCount} aulas
          </span>
          <span className="bg-gray-100 text-brand-text font-medium px-3 py-1 rounded-full">
            Provedor: {result.provider}
          </span>
          <span className="bg-gray-100 text-brand-text font-medium px-3 py-1 rounded-full">
            Créditos restantes: {result.creditsRemaining}
          </span>
          {!result.persisted && (
            <span className="bg-amber-50 text-amber-700 font-medium px-3 py-1 rounded-full">
              Salvo localmente
            </span>
          )}
        </div>

        {lessons.length > 0 && (
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-6 mb-8">
            <h3 className="font-bold text-brand-slate mb-4 text-lg">Estrutura do Curso</h3>
            <div className="divide-y divide-gray-100 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              {lessons.map((lesson, i) => (
                <div key={i} className="px-4 py-3 flex justify-between items-center">
                  <span className="text-sm font-medium text-brand-slate">{lesson.title}</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                    +{lesson.pointsAssigned} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={() => {
              window.location.href = '/admin';
            }}
            className="flex items-center gap-2 bg-gradient-pontufy text-emerald-900 font-bold px-8 py-3 rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all"
          >
            Voltar ao Painel
          </button>
        </div>
      </div>
    );
  }

  return null;
}
