'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useEnrolledCourses } from '@/hooks/useApi';
import { useStore } from '@/store/useStore';
import { getCachedCourses, reconcileWithApi, type CachedCourse } from '@/lib/local-courses';
import { PlayCircle, CheckCircle2, BookOpen, Loader2, Clock, Award } from 'lucide-react';

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
  const [certCourseIds, setCertCourseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLocalCourses(getCachedCourses());
    fetch('/api/certificates')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCertCourseIds(new Set(data.map((c: any) => c.courseId)));
        }
      })
      .catch(() => {});
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

  const statusConfig = {
    completed: {
      icon: <CheckCircle2 size={16} className="text-emerald-400" />,
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      label: 'Concluído',
    },
    in_progress: {
      icon: <PlayCircle size={16} className="text-amber-400" />,
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      label: 'Em andamento',
    },
    available: {
      icon: <BookOpen size={16} className="text-gray-500" />,
      badge: 'bg-white/5 text-gray-400 border-white/10',
      label: 'Disponível',
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh] bg-[#0a0a0a]">
        <Loader2 className="animate-spin text-emerald-500" size={36} />
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-20 pt-24 bg-[#0a0a0a]">
      <div className="max-w-[1200px] mx-auto px-6 md:px-16">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">Meus Cursos & Trilhas</h1>
          <p className="text-gray-500 mt-1.5 text-sm">Acompanhe seu progresso em todas as trilhas de aprendizagem.</p>
        </header>

        {/* Filters */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                filter === f.key
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-900/30'
                  : 'bg-[#1f1f1f] text-gray-400 border-[#2a2a2a] hover:border-[#3a3a3a] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24 text-gray-600">
            {searchQuery
              ? `Nenhum curso encontrado para "${searchQuery}".`
              : 'Nenhum curso nesta categoria.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((course: any) => {
              const cfg = statusConfig[course.status as keyof typeof statusConfig] || statusConfig.available;
              const hasCert = certCourseIds.has(course.id);
              return (
                <Link
                  key={course.id}
                  href={`/player/${course.id}`}
                  className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden hover:border-[#3a3a3a] hover:bg-[#1a1a1a] transition-all duration-200 group block"
                >
                  {/* Progress bar at top */}
                  <div className="h-1 bg-[#1f1f1f]">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-bold text-white text-base leading-tight group-hover:text-emerald-400 transition-colors">
                        {course.title}
                      </h3>
                      {cfg.icon}
                    </div>

                    {course.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                        {course.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Clock size={12} />
                        <span>{course.completedLessons}/{course.totalLessons} aulas</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasCert && (
                          <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">
                            <Award size={11} /> Certificado
                          </span>
                        )}
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.badge}`}
                        >
                          {course.progress > 0 ? `${course.progress}%` : cfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
