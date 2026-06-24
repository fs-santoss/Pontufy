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
import { Loader2, Download, BookOpen, Play, ArrowLeft, Trophy, CheckCircle2 } from 'lucide-react';

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
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <Loader2 className="animate-spin text-emerald-500" size={36} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a] gap-4">
        <BookOpen size={48} className="text-gray-700" />
        <p className="text-white text-lg font-bold">Curso não encontrado.</p>
        <Link href="/dashboard" className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors">
          ← Voltar ao Início
        </Link>
      </div>
    );
  }

  const lessons: Lesson[] = course.lessons || [];
  const activeLesson = lessons.find((l) => l.id === activeLessonId) || lessons[0];

  if (!activeLesson) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a0a] gap-4">
        <p className="text-white text-lg font-bold">Este curso não possui aulas.</p>
        <Link href="/dashboard" className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors">
          ← Voltar ao Início
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
    <div className="flex flex-col h-screen bg-[#0a0a0a] overflow-hidden">
      <PointsCelebration
        points={earnedPoints}
        isVisible={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />

      {/* Top bar (Udemy-style) */}
      <div className="h-14 flex-shrink-0 bg-[#141414] border-b border-[#2a2a2a] flex items-center px-4 gap-4 z-40">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">Voltar</span>
        </Link>
        <div className="h-5 w-px bg-[#2a2a2a]" />
        <h1 className="text-sm font-bold text-white truncate flex-1">{course.title}</h1>
        <div className="text-xs text-gray-500 hidden sm:block">
          {completedCount}/{lessons.length} aulas
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {isTextLesson ? (
            <div className="flex-1 overflow-y-auto">
              {/* Lesson header */}
              <div className="bg-[#141414] border-b border-[#2a2a2a] px-6 sm:px-10 py-6">
                <div className="flex items-center gap-2 text-gray-600 text-xs mb-2">
                  <BookOpen size={13} />
                  <span>Aula {currentIndex + 1} de {lessons.length}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">{activeLesson.title}</h2>
                <p className="text-gray-500 mt-1 text-sm">{course.title}</p>
              </div>

              {/* Content */}
              <div className="px-6 sm:px-10 py-8 max-w-4xl">
                {lessonContent ? (
                  <LessonContent content={lessonContent} />
                ) : (
                  <div className="text-center py-16">
                    <BookOpen size={40} className="mx-auto text-gray-700 mb-4" />
                    <p className="text-gray-500">Conteúdo desta aula em breve.</p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-10 pt-6 border-t border-[#2a2a2a]">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleLessonComplete}
                      disabled={activeLesson.completed || isCompleting}
                      className={`px-6 py-3 rounded-lg font-bold transition-all text-sm flex items-center gap-2 ${
                        activeLesson.completed
                          ? 'bg-[#1f1f1f] text-gray-600 cursor-not-allowed border border-[#2a2a2a]'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      {activeLesson.completed ? (
                        <>
                          <CheckCircle2 size={16} /> Aula Concluída
                        </>
                      ) : isCompleting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Concluindo...
                        </>
                      ) : (
                        `Concluir e Ganhar ${activeLesson.points} Pontos`
                      )}
                    </button>

                    {activeLesson.completed && nextLesson && (
                      <button
                        onClick={() => setActiveLessonId(nextLesson.id)}
                        className="px-6 py-3 rounded-lg font-bold transition-all text-sm flex items-center gap-2 bg-white text-black hover:bg-gray-200"
                      >
                        Próxima Aula →
                      </button>
                    )}
                  </div>
                </div>

                {/* Quiz section */}
                {allCompleted && quizzes.length > 0 && (
                  <div className="mt-10 space-y-4 pt-8 border-t border-[#2a2a2a]">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center">
                        <span className="text-emerald-400 font-black text-sm">?</span>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">Quiz de Avaliação</h2>
                        <p className="text-xs text-gray-500">Teste seus conhecimentos sobre o curso.</p>
                      </div>
                    </div>
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

                {/* Certificate */}
                {allCompleted && (
                  <div className="mt-6">
                    <button
                      onClick={handleDownloadCertificate}
                      disabled={isDownloading}
                      className="px-6 py-3 rounded-lg font-bold transition-all text-sm flex items-center gap-2 bg-[#1f1f1f] text-white hover:bg-[#2a2a2a] border border-[#2a2a2a] disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Gerando...
                        </>
                      ) : (
                        <>
                          <Download size={16} /> Baixar Certificado
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Video */}
              <div className="aspect-video lg:aspect-auto lg:flex-none lg:h-[55%] bg-black">
                <VideoPlayer lesson={activeLesson} onComplete={handleLessonComplete} />
              </div>

              {/* Video lesson info */}
              <div className="flex-1 overflow-y-auto bg-[#0f0f0f] p-5 sm:p-8">
                <div className="flex items-center gap-2 text-gray-600 text-xs mb-2">
                  <Play size={13} />
                  <span>Aula {currentIndex + 1} de {lessons.length}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white mb-4">{activeLesson.title}</h2>

                {lessonContent && (
                  <div className="mt-4 max-w-3xl">
                    <LessonContent content={lessonContent} />
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleLessonComplete}
                    disabled={activeLesson.completed || isCompleting}
                    className={`px-6 py-3 rounded-lg font-bold transition-all text-sm flex items-center gap-2 ${
                      activeLesson.completed
                        ? 'bg-[#1f1f1f] text-gray-600 cursor-not-allowed border border-[#2a2a2a]'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                    }`}
                  >
                    {activeLesson.completed ? (
                      <><CheckCircle2 size={16} /> Aula Concluída</>
                    ) : isCompleting ? (
                      <><Loader2 size={16} className="animate-spin" /> Concluindo...</>
                    ) : (
                      `Concluir e Ganhar ${activeLesson.points} Pontos`
                    )}
                  </button>

                  {activeLesson.completed && nextLesson && (
                    <button
                      onClick={() => setActiveLessonId(nextLesson.id)}
                      className="px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 bg-white text-black hover:bg-gray-200 transition-colors"
                    >
                      Próxima Aula →
                    </button>
                  )}
                </div>

                {allCompleted && quizzes.length > 0 && (
                  <div className="mt-8 space-y-4 pt-6 border-t border-[#2a2a2a]">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Trophy size={18} className="text-amber-400" /> Quiz de Avaliação
                    </h2>
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
                    className="mt-4 px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 bg-[#1f1f1f] text-white hover:bg-[#2a2a2a] border border-[#2a2a2a] disabled:opacity-50 transition-colors"
                  >
                    {isDownloading ? (
                      <><Loader2 size={16} className="animate-spin" /> Gerando...</>
                    ) : (
                      <><Download size={16} /> Baixar Certificado</>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar (Udemy-style) */}
        <div className="hidden lg:flex w-[340px] xl:w-[380px] flex-shrink-0 border-l border-[#2a2a2a] flex-col">
          <SidebarModules
            lessons={lessons}
            activeLesson={activeLesson}
            completedCount={completedCount}
            onLessonClick={(lesson) => setActiveLessonId(lesson.id)}
          />
        </div>
      </div>

      {/* Mobile sidebar (bottom sheet trigger) */}
      <div className="lg:hidden border-t border-[#2a2a2a] bg-[#141414] max-h-[40vh] overflow-hidden">
        <SidebarModules
          lessons={lessons}
          activeLesson={activeLesson}
          completedCount={completedCount}
          onLessonClick={(lesson) => setActiveLessonId(lesson.id)}
        />
      </div>
    </div>
  );
}
