import { PlayCircle, Coins } from 'lucide-react';
import Link from 'next/link';

export default function CourseRow({ title, courses }: { title: string, courses: any[] }) {
  return (
    <div className="relative px-8 md:px-16 mb-12">
      <h2 className="text-xl font-bold text-brand-slate mb-4">{title}</h2>
      
      <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4">
        {courses.map((course) => (
          <Link 
            href={`/player/${course.id}`}
            key={course.id} 
            className="flex-none w-[280px] group cursor-pointer block"
          >
            <div className="relative h-[160px] rounded-lg overflow-hidden shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 group-hover:scale-105 border border-gray-200">
              <img 
                src={course.thumbnail} 
                alt={course.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/80 to-emerald-400/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <PlayCircle size={48} className="text-white drop-shadow-md" />
              </div>
              
              {/* Progress Bar (if exists) */}
              {course.progress !== undefined && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-200/50 backdrop-blur-sm">
                  <div 
                    className="h-full bg-emerald-500" 
                    style={{ width: `${course.progress}%` }}
                  ></div>
                </div>
              )}
            </div>
            
            <div className="mt-3">
              <h3 className="font-semibold text-brand-slate text-sm line-clamp-1">{course.title}</h3>
              <div className="flex items-center gap-1 mt-1 text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded text-xs font-bold">
                <Coins size={12} /> +{course.pointsReward} pts
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
