import useSWR from 'swr';

// ── Types matching Prisma schema ───────────────────────────────────────

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  type: 'video' | 'text';
  contentUrl: string | null;
  pointsAssigned: number;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published';
  aiCreditsSpent: number;
  createdAt: string;
  updatedAt: string;
  lessons: Lesson[];
}

// ── Fetcher ────────────────────────────────────────────────────────────

const fetcher = (url: string): Promise<Course[]> =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`GET ${url} failed: ${r.status}`);
    return r.json();
  });

// ── Hook ───────────────────────────────────────────────────────────────

export function useCourses() {
  const { data, error, isLoading, mutate } = useSWR<Course[]>(
    '/api/courses',
    fetcher,
    { revalidateOnFocus: false, fallbackData: [] },
  );

  return {
    courses: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
