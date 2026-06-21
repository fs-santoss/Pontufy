'use client';
import { useState, useEffect } from 'react';
import { Sparkles, CheckCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import adminData from '@/data/admin.json';

export default function AIWizard() {
  const [step, setStep] = useState(1);
  const [prompt, setPrompt] = useState('');
  
  // Simulated Loading State
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeChecklist, setActiveChecklist] = useState(0);

  const checklistItems = [
    "Avaliando escopo do setor...",
    "Estruturando módulos de ensino...",
    "Calibrando distribuição de recompensas (pts)...",
    "Finalizando formatação..."
  ];

  // Start generation simulation
  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setStep(2);
    setLoadingProgress(0);
    setActiveChecklist(0);
  };

  useEffect(() => {
    if (step === 2) {
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setStep(3), 500); // Transition to review
            return 100;
          }
          const nextProgress = prev + 2; // Simulate steady progress
          // Update checklist based on progress percentage
          if (nextProgress > 25 && nextProgress <= 50) setActiveChecklist(1);
          if (nextProgress > 50 && nextProgress <= 80) setActiveChecklist(2);
          if (nextProgress > 80) setActiveChecklist(3);
          return nextProgress;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [step]);

  // Step 1: Definition
  if (step === 1) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s_ease-out]">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-brand-slate flex items-center gap-2">
            <Sparkles className="text-emerald-500" /> Assistente de IA
          </h2>
          <p className="text-brand-text mt-1">Crie treinamentos corporativos engajadores em segundos.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-brand-slate mb-2">Setor/Vertical de Atuação</label>
            <select className="w-full bg-gray-50 border border-gray-200 text-brand-slate rounded-lg p-3 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all">
              <option value="tech">Tecnologia e Inovação</option>
              <option value="health">Saúde e Bem-Estar</option>
              <option value="retail">Varejo e Vendas</option>
              <option value="industry">Indústria e Manufatura</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-brand-slate mb-2">O que você deseja ensinar?</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-32 bg-gray-50 border border-gray-200 text-brand-slate rounded-lg p-3 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all resize-none"
              placeholder="Ex: Crie um treinamento de LGPD focado na equipe de atendimento ao cliente, com foco prático em proteção de dados e cenários de call center..."
            ></textarea>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-brand-text">Custo da operação:</span>
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">1 Crédito de IA</span>
            </div>
            
            <button 
              onClick={handleGenerate}
              className={`flex items-center gap-2 font-bold px-8 py-3 rounded-lg shadow-sm transition-all ${
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

  // Step 2: Processing
  if (step === 2) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center animate-[fadeIn_0.3s_ease-out]">
        <div className="w-16 h-16 bg-gradient-pontufy rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-100 animate-pulse">
          <Sparkles className="text-emerald-900" size={32} />
        </div>
        <h2 className="text-2xl font-black text-brand-slate mb-2">A IA está trabalhando...</h2>
        <p className="text-brand-text mb-10">Isso levará apenas alguns segundos.</p>

        {/* Progress Bar */}
        <div className="w-full max-w-xl mx-auto h-2 bg-gray-100 rounded-full overflow-hidden mb-8">
          <div 
            className="h-full bg-gradient-pontufy rounded-full transition-all duration-300 ease-out"
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>

        {/* Animated Checklist */}
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
                {isCompleted ? <CheckCircle size={18} /> : <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${isActive ? 'border-brand-slate border-t-emerald-500 animate-spin' : 'border-gray-200'}`}></div>}
                <span className="text-sm">{item}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Step 3: Review
  if (step === 3) {
    // Mock generated structure based on user prompt
    const generatedModules = [
      {
        title: "Módulo 1: Fundamentos",
        lessons: [
          { title: "Introdução aos Conceitos Básicos", pts: 50 },
          { title: "Casos de Uso na Indústria", pts: 75 }
        ]
      },
      {
        title: "Módulo 2: Prática e Aplicação",
        lessons: [
          { title: "Mão na Massa: Simulações", pts: 100 },
          { title: "Checklist de Segurança", pts: 50 }
        ]
      }
    ];

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s_ease-out]">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-brand-slate flex items-center gap-2">
              <CheckCircle className="text-emerald-500" /> Estrutura Gerada
            </h2>
            <p className="text-brand-text mt-1">Revise os módulos propostos antes de publicar.</p>
          </div>
          <button onClick={() => setStep(1)} className="text-sm font-semibold text-brand-text hover:text-brand-slate flex items-center gap-1 transition-colors">
            <ArrowLeft size={16} /> Refazer
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-lg p-6 mb-8">
          <h3 className="font-bold text-brand-slate mb-4 text-lg">Syllabus Sugerido</h3>
          <div className="space-y-4">
            {generatedModules.map((mod, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-gray-50/50 px-4 py-3 font-bold text-brand-slate border-b border-gray-100">
                  {mod.title}
                </div>
                <div className="divide-y divide-gray-50">
                  {mod.lessons.map((lesson, j) => (
                    <div key={j} className="px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <span className="text-sm font-medium text-brand-slate">{lesson.title}</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">+{lesson.pts} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            className="flex items-center gap-2 bg-gradient-pontufy text-emerald-900 font-bold px-8 py-3 rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all"
            onClick={() => alert("Treinamento publicado com sucesso! O saldo de créditos de IA foi deduzido.")}
          >
            <Sparkles size={18} /> Publicar e Liberar para os Colaboradores
          </button>
        </div>
      </div>
    );
  }

  return null;
}
