'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useEnrolledCourses } from '@/hooks/useApi';
import { useStore } from '@/store/useStore';
import { getCachedCourses, reconcileWithApi, type CachedCourse } from '@/lib/local-courses';
import { PlayCircle, CheckCircle2, BookOpen, Loader2 } from 'lucide-react';

type FilterStatus = 'all' | 'in_progress' | 'completed' | 'available';

function localToEnrolled(c: CachedCourse) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    totalLessons: c.lessons.length,
    completedLessons: 0,
    progress: 0,
    status: 'available' as const,
  };
}

export default function CoursesPage() {
  const { data: courses, isLoading } = useEnrolledCourses();
  const searchQuery = useStore((s) => s.searchQuery);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [localCourses, setLocalCourses] = useState<CachedCourse[]>([]);

  useEffect(() => {
    setLocalCourses(getCachedCourses());
  }, []);

  const apiCourses = Array.isArray(courses) ? courses : [];
  const apiIds = new Set(apiCourses.map((c: any) => c.id));
  reconcileWithApi(apiIds);
  const freshLocal = localCourses.filter((c) => !apiIds.has(c.id)).map(localToEnrolled);
  const merged = [...freshLocal, ...apiCourses];

  const filtered = merged
    .filter((c: any) => filter === 'all' || c.status === filter)
    .filter((c: any) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
    });

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'in_progress', label: 'Em Andamento' },
    { key: 'completed', label: 'Concluídos' },
    { key: 'available', label: 'Disponíveis' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );
  }

  return (
    <main className="pb-20 pt-8">
      <div className="max-w-[1200px] mx-auto px-6 md:px-16">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-brand-slate">Meus Cursos & Trilhas</h1>
          <p className="text-brand-text mt-1">Acompanhe seu progresso em todas as trilhas de aprendizagem.</p>
        </header>

        <div className="flex gap-2 mb-8 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                filter === f.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 text-brand-text hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-brand-text">
            {searchQuery ? `Nenhum curso encontrado para "${searchQuery}".` : 'Nenhum curso nesta categoria.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((course: any) => (
              <Link
                key={course.id}
                href={`/player/${course.id}`}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group block"
              >
                <div className="h-3 bg-gray-100 relative">
                  <div
                    className="h-full bg-gradient-pontufy transition-all duration-500"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-bold text-brand-slate text-lg leading-tight group-hover:text-emerald-700 transition-colors">
                      {course.title}
                    </h3>
                    {course.status === 'completed' ? (
                      <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0 mt-1" />
                    ) : course.status === 'in_progress' ? (
                      <PlayCircle size={20} className="text-amber-500 flex-shrink-0 mt-1" />
                    ) : (
                      <BookOpen size={20} className="text-gray-400 flex-shrink-0 mt-1" />
                    )}
                  </div>

                  {course.description && (
                    <p className="text-sm text-brand-text line-clamp-2 mb-4">{course.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-brand-text font-medium">
                      {course.completedLessons}/{course.totalLessons} aulas
                    </span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      course.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : course.status === 'in_progress'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {course.progress}%
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
