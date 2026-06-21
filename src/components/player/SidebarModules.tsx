import { CheckCircle, PlayCircle, Coins } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  points: number;
  completed: boolean;
}

interface SidebarModulesProps {
  activeLesson: Lesson | null;
  onLessonClick: (lesson: Lesson) => void;
}

export default function SidebarModules({ activeLesson, onLessonClick }: SidebarModulesProps) {
  // Mock data for modules
  const modules = [
    {
      id: 'm1',
      title: '1. Introdução à IA Corporativa',
      lessons: [
        { id: 'l1', title: 'O que é IA Generativa?', duration: '12 min', points: 50, completed: true },
        { id: 'l2', title: 'Aplicações B2B', duration: '18 min', points: 50, completed: false },
      ]
    },
    {
      id: 'm2',
      title: '2. Liderança e Mudança',
      lessons: [
        { id: 'l3', title: 'Preparando a Equipe', duration: '20 min', points: 75, completed: false },
        { id: 'l4', title: 'Gestão de Riscos', duration: '15 min', points: 50, completed: false },
      ]
    }
  ];

  return (
    <div className="w-full h-full bg-white border-l border-gray-100 flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
        <h2 className="font-bold text-brand-slate text-lg">Conteúdo do Curso</h2>
        <div className="text-sm text-brand-text mt-1">1 / 4 Aulas concluídas</div>
      </div>
      
      <div className="flex-1">
        {modules.map((mod) => (
          <div key={mod.id} className="border-b border-gray-100">
            <div className="p-4 bg-gray-50 font-bold text-brand-slate cursor-pointer hover:bg-gray-100 transition-colors">
              {mod.title}
            </div>
            <div className="flex flex-col">
              {mod.lessons.map((lesson) => (
                <div 
                  key={lesson.id}
                  onClick={() => onLessonClick(lesson)}
                  className={`p-4 flex gap-3 cursor-pointer transition-colors ${
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
                      <span className="text-gray-400">{lesson.duration}</span>
                      
                      {/* Gamification Tag */}
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
        ))}
      </div>
    </div>
  );
}
