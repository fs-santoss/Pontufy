'use client';
import { useStore } from '@/store/useStore';
import { useCourses } from '@/lib/hooks/useCourses';
import type { Course } from '@/lib/hooks/useCourses';

import HeroCourse from '@/components/dashboard/HeroCourse';
import CourseRow from '@/components/dashboard/CourseRow';
import SurpriseRewardToast from '@/components/dashboard/SurpriseRewardToast';

/** Map a Prisma Course to the shape HeroCourse and CourseRow expect. */
function toCourseCard(c: Course) {
  const totalPoints = c.lessons.reduce((sum, l) => sum + l.pointsAssigned, 0);
  return {
    id: c.id,
    title: c.title,
    description: c.description ?? '',
    duration: `${c.lessons.length * 15}m`,
    pointsReward: totalPoints,
    modules: c.lessons.length,
    thumbnail:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1200',
  };
}

export default function Home() {
  const { courses, isLoading } = useCourses();

  const searchQuery = useStore((s) => s.searchQuery);

  const cards = courses.map(toCourseCard);
  const heroCourse = cards[0] ?? null;
  const remainingCourses = cards.slice(1);

  const filterCourses = (items: ReturnType<typeof toCourseCard>[]) => {
    if (!searchQuery) return items;
    return items.filter(
      (c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  };

  const filteredRemaining = filterCourses(remainingCourses);

  if (isLoading) {
    return (
      <main className="min-h-screen pb-20 bg-[#F8F9FA] text-slate-800">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-brand-text font-medium">Carregando cursos...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20 bg-[#F8F9FA] text-slate-800">
      <SurpriseRewardToast />

      {heroCourse && <HeroCourse course={heroCourse} />}

      <div className="relative z-20 -mt-10 space-y-12">
        {filteredRemaining.length > 0 && (
          <CourseRow title="Trilhas Disponíveis" courses={filteredRemaining} />
        )}

        {!heroCourse && filteredRemaining.length === 0 && !searchQuery && (
          <div className="px-8 md:px-16 py-16 text-center">
            <h2 className="text-2xl font-bold text-brand-slate mb-2">Nenhum curso publicado</h2>
            <p className="text-brand-text">Peça ao administrador para criar cursos via o Assistente de IA.</p>
          </div>
        )}

        {searchQuery && filteredRemaining.length === 0 && (
          <div className="px-8 md:px-16 py-8 text-center text-gray-500">
            Nenhum curso encontrado para &ldquo;{searchQuery}&rdquo;.
          </div>
        )}
      </div>
    </main>
  );
}
