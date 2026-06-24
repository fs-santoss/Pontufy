import { Play, Info, Coins, Star } from 'lucide-react';
import Link from 'next/link';

export default function HeroCourse({ course }: { course: any }) {
  if (!course) return null;

  return (
    <div className="relative w-full min-h-[75vh] sm:min-h-[82vh] flex items-end pb-16 sm:pb-24">
      {/* Background */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${course.thumbnail})` }}
      >
        {/* Netflix-style gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 px-8 md:px-16 max-w-2xl">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500 text-white text-[11px] font-black rounded-sm mb-5 uppercase tracking-widest">
          <Star size={10} fill="white" strokeWidth={0} /> Em Destaque
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight mb-4 leading-[1.05]">
          {course.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm font-semibold mb-5">
          <span className="text-emerald-400 font-bold">{course.duration}</span>
          <span className="text-gray-600">•</span>
          <span className="text-gray-300">{course.modules} módulos</span>
          <span className="text-gray-600">•</span>
          <span className="flex items-center gap-1 text-amber-400 font-bold">
            <Coins size={13} fill="currentColor" /> +{course.pointsReward} pontos
          </span>
        </div>

        <p className="text-sm sm:text-base text-gray-300 mb-8 max-w-lg leading-relaxed line-clamp-2 sm:line-clamp-3">
          {course.description}
        </p>

        <div className="flex items-center gap-3">
          <Link
            href={`/player/${course.id}`}
            className="flex items-center gap-2.5 bg-white text-black font-black px-6 sm:px-8 py-3 rounded-md hover:bg-gray-200 transition-colors text-sm whitespace-nowrap"
          >
            <Play size={18} fill="black" strokeWidth={0} /> Assistir Agora
          </Link>
          <Link
            href={`/player/${course.id}`}
            className="flex items-center gap-2.5 bg-white/20 text-white font-bold px-5 sm:px-6 py-3 rounded-md hover:bg-white/30 transition-colors text-sm border border-white/20 whitespace-nowrap"
          >
            <Info size={17} /> Detalhes
          </Link>
        </div>
      </div>
    </div>
  );
}
