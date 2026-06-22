'use client';
import { useState, use } from 'react';
import Link from 'next/link';

import VideoPlayer from '@/components/player/VideoPlayer';
import SidebarModules from '@/components/player/SidebarModules';
import QuizModule from '@/components/player/QuizModule';
import PointsCelebration from '@/components/gamification/PointsCelebration';
import { useCourse, triggerLessonCompletion } from '@/hooks/useApi';
import { Loader2, Download } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  type: string;
  points: number;
  completed: boolean;
  contentUrl?: string;
}

export default function CoursePlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: course, isLoading, mutate } = useCourse(id);

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  if (isLoading || !course) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-72px)]">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );
  }

  if (course.error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)] gap-4">
        <p className="text-brand-slate text-lg font-semibold">Curso não encontrado.</p>
        <Link href="/dashboard" className="text-emerald-600 font-bold hover:underline">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  const lessons: Lesson[] = course.lessons || [];
  const activeLesson = lessons.find((l) => l.id === activeLessonId) || lessons[0];

  if (!activeLesson) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)] gap-4">
        <p className="text-brand-slate text-lg font-semibold">Este curso não possui aulas.</p>
        <Link href="/dashboard" className="text-emerald-600 font-bold hover:underline">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  const completedCount = lessons.filter((l) => l.completed).length;
  const allCompleted = completedCount === lessons.length && lessons.length > 0;
  const quizzes: { module: string; questions: any[] }[] = course.quiz || [];
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadCertificate = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch('/api/certificates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: id }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erro ao gerar certificado.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificado-${course.title}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Erro ao baixar certificado.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLessonComplete = async () => {
    if (activeLesson.completed || isCompleting) return;

    setIsCompleting(true);
    try {
      const res = await triggerLessonCompletion(activeLesson.id);

      if (res.success) {
        setEarnedPoints(activeLesson.points);
        setShowCelebration(true);
        mutate();
      } else {
        alert(res.error || 'Erro ao completar a aula.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao concluir a aula.');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <PointsCelebration
        points={earnedPoints}
        isVisible={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />

      <div className="flex-1 flex h-[calc(100vh-72px)]">
        <div className="flex-1 flex flex-col bg-white relative">
          <div className="absolute top-4 left-4 z-50">
            <Link href="/dashboard" className="flex items-center gap-2 bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-full backdrop-blur-md text-sm font-bold transition-all shadow-lg">
              ← Voltar para Início
            </Link>
          </div>
          <div className="h-[60%] lg:h-[70%]">
            <VideoPlayer lesson={activeLesson} onComplete={handleLessonComplete} />
          </div>

          <div className="flex-1 p-8 overflow-y-auto">
            <h1 className="text-3xl font-extrabold text-brand-slate mb-4">{activeLesson.title}</h1>
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
              <button className="text-emerald-600 font-bold border-b-2 border-emerald-600 pb-1">Visão Geral</button>
              <button className="text-brand-text hover:text-brand-slate font-semibold pb-1">Anotações</button>
              <button className="text-brand-text hover:text-brand-slate font-semibold pb-1">Materiais</button>
            </div>
            <div className="mt-6 text-brand-slate/80 leading-relaxed max-w-3xl">
              <p>{course.description}</p>

              <div className="mt-8 space-y-4">
                <button
                  onClick={handleLessonComplete}
                  disabled={activeLesson.completed || isCompleting}
                  className={`px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 ${
                    activeLesson.completed
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md'
                  }`}
                >
                  {activeLesson.completed ? 'Aula Concluída' : `Concluir Aula e Ganhar ${activeLesson.points} Pontos`}
                </button>

                {allCompleted && quizzes.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h2 className="text-xl font-bold text-brand-slate">Quizzes do Curso</h2>
                    {quizzes.map((q, i) => (
                      <QuizModule
                        key={i}
                        module={q.module}
                        questions={q.questions}
                        onComplete={(score, total) => {
                          console.log(`Quiz "${q.module}": ${score}/${total}`);
                        }}
                      />
                    ))}
                  </div>
                )}

                {allCompleted && (
                  <button
                    onClick={handleDownloadCertificate}
                    disabled={isDownloading}
                    className="px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 bg-brand-slate text-white hover:bg-brand-slate/90 hover:shadow-md disabled:opacity-50"
                  >
                    <Download size={18} />
                    {isDownloading ? 'Gerando...' : 'Baixar Certificado'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="w-[350px] lg:w-[400px] h-full shrink-0">
          <SidebarModules
            lessons={lessons}
            activeLesson={activeLesson}
            completedCount={completedCount}
            onLessonClick={(lesson) => setActiveLessonId(lesson.id)}
          />
        </div>
      </div>
    </div>
  );
}
