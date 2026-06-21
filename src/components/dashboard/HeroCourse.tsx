import { Play, Info, Coins } from 'lucide-react';
import Link from 'next/link';

export default function HeroCourse({ course }: { course: any }) {
  if (!course) return null;

  return (
    <div className="relative w-full h-[75vh] flex items-center pt-20">
      {/* Background Image with Light Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${course.thumbnail})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-brand-gray via-transparent to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-8 md:px-16 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full mb-4 border border-emerald-100">
          Recomendado pela IA
        </div>
        
        <h1 className="text-5xl md:text-6xl font-extrabold text-brand-slate tracking-tight mb-4 leading-tight">
          {course.title}
        </h1>
        
        <div className="flex items-center gap-4 text-sm font-semibold text-brand-text mb-6">
          <span>{course.duration}</span>
          <span>•</span>
          <span>{course.modules} Módulos</span>
          <span>•</span>
          <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
            <Coins size={14} /> +{course.pointsReward} Pontos
          </span>
        </div>
        
        <p className="text-lg text-brand-slate/80 mb-8 max-w-xl leading-relaxed">
          {course.description}
        </p>
        
        <div className="flex items-center gap-4">
          <Link href={`/player/${course.id}`} className="flex items-center gap-2 bg-gradient-pontufy text-emerald-900 font-bold px-8 py-3 rounded-lg shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-105 transition-all">
            <Play size={20} fill="currentColor" /> Continuar Aprendendo
          </Link>
          <button className="flex items-center gap-2 bg-white text-brand-slate font-bold px-8 py-3 rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors">
            <Info size={20} /> Detalhes
          </button>
        </div>
      </div>
    </div>
  );
}
