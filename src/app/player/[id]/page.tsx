'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';

import VideoPlayer from '@/components/player/VideoPlayer';
import LessonContent from '@/components/player/LessonContent';
import SidebarModules from '@/components/player/SidebarModules';
import QuizModule from '@/components/player/QuizModule';
import PointsCelebration from '@/components/gamification/PointsCelebration';
import { useCourse, triggerLessonCompletion } from '@/hooks/useApi';
import { getCachedCourses } from '@/lib/local-courses';
import { Loader2, Download, BookOpen, Play } from 'lucide-react';

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
  const { data: apiCourse, error: apiError, isLoading, mutate } = useCourse(id);
  const [localCourse, setLocalCourse] = useState<any>(null);
  const [localChecked, setLocalChecked] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const cached = getCachedCourses().find((c) => c.id === id);
    if (cached) {
      let quiz = null;
      if (cached.quizJson) {
        try { quiz = JSON.parse(cached.quizJson); } catch {}
      }
      setLocalCourse({
        id: cached.id,
        title: cached.title,
        description: cached.description,
        lessons: cached.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          type: l.type,
          contentUrl: l.contentUrl,
          points: l.pointsAssigned,
          completed: false,
        })),
        quiz,
      });
    }
    setLocalChecked(true);
  }, [id]);

  const course = apiCourse && !apiCourse.error ? apiCourse : localCourse;

  if ((isLoading && !localChecked) || (!course && !apiError && !localChecked)) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-72px)]">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)] gap-4">
        <p className="text-brand-slate text-lg font-semibold">Curso nao encontrado.</p>
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
        <p className="text-brand-slate text-lg font-semibold">Este curso nao possui aulas.</p>
        <Link href="/dashboard" className="text-emerald-600 font-bold hover:underline">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  const completedCount = lessons.filter((l) => l.completed).length;
  const allCompleted = completedCount === lessons.length && lessons.length > 0;
  const quizzes: { module: string; questions: any[] }[] = course.quiz || [];
  const isTextLesson = activeLesson.type === 'text';
  const lessonContent = activeLesson.contentUrl || '';

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
      const res = await triggerLessonCompletion(activeLesson.id, {
        courseId: course.id,
        courseTitle: course.title,
        courseDescription: course.description,
        lessons: lessons.map((l) => ({
          id: l.id,
          title: l.title,
          type: l.type,
          contentUrl: l.contentUrl,
          points: l.points,
        })),
      });

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

  const currentIndex = lessons.findIndex((l) => l.id === activeLesson.id);
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  return (
    <div className="flex flex-col lg:overflow-hidden lg:h-full">
      <PointsCelebration
        points={earnedPoints}
        isVisible={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />

      <div className="flex-1 flex flex-col lg:flex-row lg:h-[calc(100vh-72px)]">
        <div className="flex-1 flex flex-col bg-white relative min-w-0">
          <div className="absolute top-4 left-4 z-50">
            <Link href="/dashboard" className="flex items-center gap-2 bg-black/60 hover:bg-black/80 text-white px-3 py-2 sm:px-4 rounded-full backdrop-blur-md text-xs sm:text-sm font-bold transition-all shadow-lg">
              ← Voltar para Inicio
            </Link>
          </div>

          {isTextLesson ? (
            <div className="flex-1 overflow-y-auto">
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 sm:px-10 pt-16 pb-8">
                <div className="flex items-center gap-2 text-emerald-200 text-sm mb-2">
                  <BookOpen size={16} />
                  <span>Aula {currentIndex + 1} de {lessons.length}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{activeLesson.title}</h1>
                <p className="text-emerald-100 mt-2 text-sm">{course.title}</p>
              </div>

              <div className="px-6 sm:px-10 py-8 max-w-4xl">
                {lessonContent ? (
                  <LessonContent content={lessonContent} />
                ) : (
                  <div className="text-center py-12">
                    <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-brand-text text-lg">Conteudo desta aula em breve.</p>
                    <p className="text-gray-400 text-sm mt-1">O conteudo educacional sera exibido aqui.</p>
                  </div>
                )}

                <div className="mt-10 pt-6 border-t border-gray-100 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleLessonComplete}
                      disabled={activeLesson.completed || isCompleting}
                      className={`px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 ${
                        activeLesson.completed
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md'
                      }`}
                    >
                      {activeLesson.completed
                        ? 'Aula Concluida'
                        : isCompleting
                          ? 'Concluindo...'
                          : `Concluir Aula e Ganhar ${activeLesson.points} Pontos`}
                    </button>

                    {activeLesson.completed && nextLesson && (
                      <button
                        onClick={() => setActiveLessonId(nextLesson.id)}
                        className="px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      >
                        Proxima Aula →
                      </button>
                    )}
                  </div>
                </div>

                {allCompleted && quizzes.length > 0 && (
                  <div className="mt-10 space-y-4 pt-6 border-t border-gray-100">
                    <h2 className="text-xl font-bold text-brand-slate flex items-center gap-2">
                      <span className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-sm font-bold">?</span>
                      Quiz de Avaliacao
                    </h2>
                    <p className="text-brand-text text-sm mb-4">Teste seus conhecimentos sobre o conteudo do curso.</p>
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
                  <div className="mt-6">
                    <button
                      onClick={handleDownloadCertificate}
                      disabled={isDownloading}
                      className="px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 bg-brand-slate text-white hover:bg-brand-slate/90 hover:shadow-md disabled:opacity-50"
                    >
                      <Download size={18} />
                      {isDownloading ? 'Gerando...' : 'Baixar Certificado'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="aspect-video lg:aspect-auto lg:h-[55%]">
                <VideoPlayer lesson={activeLesson} onComplete={handleLessonComplete} />
              </div>

              <div className="flex-1 p-5 sm:p-8 lg:overflow-y-auto">
                <div className="flex items-center gap-2 text-brand-text text-sm mb-2">
                  <Play size={16} />
                  <span>Aula {currentIndex + 1} de {lessons.length}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-slate mb-4">{activeLesson.title}</h1>

                {lessonContent && (
                  <div className="mt-4 max-w-3xl">
                    <LessonContent content={lessonContent} />
                  </div>
                )}

                <div className="mt-8 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleLessonComplete}
                      disabled={activeLesson.completed || isCompleting}
                      className={`px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 ${
                        activeLesson.completed
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md'
                      }`}
                    >
                      {activeLesson.completed
                        ? 'Aula Concluida'
                        : isCompleting
                          ? 'Concluindo...'
                          : `Concluir Aula e Ganhar ${activeLesson.points} Pontos`}
                    </button>

                    {activeLesson.completed && nextLesson && (
                      <button
                        onClick={() => setActiveLessonId(nextLesson.id)}
                        className="px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      >
                        Proxima Aula →
                      </button>
                    )}
                  </div>

                  {allCompleted && quizzes.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <h2 className="text-xl font-bold text-brand-slate">Quiz de Avaliacao</h2>
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
            </>
          )}
        </div>

        <div className="w-full lg:w-[360px] xl:w-[400px] lg:h-full shrink-0 border-t lg:border-t-0 border-gray-100">
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
