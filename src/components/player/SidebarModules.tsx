import { CheckCircle2, PlayCircle, Circle, Coins } from 'lucide-react';

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

export default function SidebarModules({
  lessons,
  activeLesson,
  completedCount,
  onLessonClick,
}: SidebarModulesProps) {
  const progress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="w-full h-full bg-[#141414] border-l border-[#2a2a2a] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#2a2a2a] flex-shrink-0">
        <h2 className="font-bold text-white text-sm mb-2">Conteúdo do Curso</h2>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>{completedCount}/{lessons.length} aulas</span>
          <span className="text-emerald-400 font-bold">{progress}%</span>
        </div>
        <div className="h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Lessons */}
      <div className="flex-1 overflow-y-auto">
        {lessons.map((lesson, index) => {
          const isActive = activeLesson?.id === lesson.id;
          return (
            <button
              key={lesson.id}
              onClick={() => onLessonClick(lesson)}
              className={`w-full text-left p-4 flex gap-3 transition-colors border-b border-[#1f1f1f] ${
                isActive
                  ? 'bg-emerald-500/10 border-l-2 border-l-emerald-500'
                  : 'hover:bg-[#1f1f1f] border-l-2 border-l-transparent'
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {lesson.completed ? (
                  <CheckCircle2 size={17} className="text-emerald-500" />
                ) : isActive ? (
                  <PlayCircle size={17} className="text-emerald-400" />
                ) : (
                  <Circle size={17} className="text-gray-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`text-xs leading-snug ${
                      isActive ? 'text-white font-bold' : 'text-gray-400 font-medium'
                    } ${lesson.completed ? 'line-through opacity-50' : ''}`}
                  >
                    <span className="text-gray-600 mr-1">{index + 1}.</span>
                    {lesson.title}
                  </p>
                </div>
                {!lesson.completed && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-400 font-bold">
                    <Coins size={10} /> +{lesson.points} pts
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
