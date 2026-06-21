import { triggerLessonCompletion } from "@/hooks/useApi";

interface VideoPlayerProps {
  lesson: {
    id: string;
    title: string;
    duration?: string;
  };
  onComplete?: () => void;
}

export default function VideoPlayer({ lesson, onComplete }: VideoPlayerProps) {
  if (!lesson) return null;

  const handleCompleteClick = async () => {
    await triggerLessonCompletion(lesson.id);
    if (onComplete) onComplete();
  };

  return (
    <div className="w-full flex flex-col bg-black h-full relative">
      <div className="flex-1 flex items-center justify-center relative overflow-hidden group">
        {/* Placeholder for actual video player */}
        <div className="absolute inset-0 bg-brand-slate flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-white text-2xl font-bold mb-2">{lesson.title}</h3>
            <p className="text-gray-300">Área do Player de Vídeo</p>
          </div>
        </div>
        
        {/* Mock Video Controls */}
        <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center">
          <div className="text-white text-sm">00:00 / {lesson.duration}</div>
          <button 
            onClick={handleCompleteClick}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-1.5 px-4 rounded text-sm transition-colors"
          >
            Marcar como Concluída
          </button>
        </div>
      </div>
    </div>
  );
}
