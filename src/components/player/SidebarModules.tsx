import { CheckCircle, PlayCircle, Coins } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  points: number;
  completed: boolean;
}

interface SidebarModulesProps {
  lessons: Lesson[];
  activeLesson: Lesson | null;
  completedCount: number;
  onLessonClick: (lesson: Lesson) => void;
}

export default function SidebarModules({ lessons, activeLesson, completedCount, onLessonClick }: SidebarModulesProps) {
  return (
    <div className="w-full h-full bg-white border-l border-gray-100 flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
        <h2 className="font-bold text-brand-slate text-lg">Conteúdo do Curso</h2>
        <div className="text-sm text-brand-text mt-1">{completedCount} / {lessons.length} Aulas concluídas</div>
      </div>

      <div className="flex-1">
        {lessons.map((lesson) => (
          <div
            key={lesson.id}
            onClick={() => onLessonClick(lesson)}
            className={`p-4 flex gap-3 cursor-pointer transition-colors border-b border-gray-50 ${
              activeLesson?.id === lesson.id ? 'bg-emerald-50/50' : 'hover:bg-gray-50'
            }`}
          >
            <div className="mt-0.5">
              {lesson.completed ? (
                <CheckCircle size={18} className="text-emerald-500" />
              ) : (
                <PlayCircle size={18} className={activeLesson?.id === lesson.id ? 'text-emerald-600' : 'text-gray-400'} />
              )}
            </div>
            <div className="flex-1">
              <h4 className={`text-sm ${activeLesson?.id === lesson.id ? 'font-bold text-emerald-900' : 'text-brand-slate'}`}>
                {lesson.title}
              </h4>
              <div className="flex items-center gap-3 mt-1 text-xs">
                {!lesson.completed && (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                    <Coins size={12} /> +{lesson.points} pts
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
