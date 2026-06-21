'use client';
import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import VideoPlayer from '@/components/player/VideoPlayer';
import SidebarModules from '@/components/player/SidebarModules';
import PointsCelebration from '@/components/gamification/PointsCelebration';

export default function CoursePlayerPage() {
  const [activeLesson, setActiveLesson] = useState({ 
    id: 'l1', 
    title: 'O que é IA Generativa?', 
    duration: '12 min', 
    points: 50, 
    completed: false 
  });
  
  const [showCelebration, setShowCelebration] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const handleLessonComplete = () => {
    if (!activeLesson.completed) {
      setEarnedPoints(activeLesson.points);
      setShowCelebration(true);
      // Mark as completed locally for the demo
      setActiveLesson({ ...activeLesson, completed: true });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-brand-gray overflow-hidden">
      <Navbar />
      
      {/* Points Celebration Overlay */}
      <PointsCelebration 
        points={earnedPoints} 
        isVisible={showCelebration} 
        onComplete={() => setShowCelebration(false)} 
      />

      <div className="flex-1 flex mt-[72px] h-[calc(100vh-72px)]">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="h-[60%] lg:h-[70%]">
            <VideoPlayer lesson={activeLesson} onComplete={handleLessonComplete} />
          </div>
          
          <div className="flex-1 p-8 overflow-y-auto">
            <h1 className="text-3xl font-extrabold text-brand-slate mb-4">{activeLesson.title}</h1>
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
              <button className="text-emerald-600 font-bold border-b-2 border-emerald-600 pb-1">Visão Geral</button>
              <button className="text-brand-text hover:text-brand-slate font-semibold pb-1">Anotações</button>
              <button className="text-brand-text hover:text-brand-slate font-semibold pb-1">Materiais</button>
            </div>
            <div className="mt-6 text-brand-slate/80 leading-relaxed max-w-3xl">
              <p>Nesta aula, vamos explorar os conceitos fundamentais da Inteligência Artificial Generativa e como ela se diferencia dos modelos tradicionais. Você aprenderá como essas tecnologias estão remodelando o mercado corporativo.</p>
            </div>
          </div>
        </div>

        {/* Udemy-style Sidebar */}
        <div className="w-[350px] lg:w-[400px] h-full shrink-0">
          <SidebarModules 
            activeLesson={activeLesson} 
            onLessonClick={(lesson: any) => setActiveLesson(lesson)} 
          />
        </div>
      </div>
    </div>
  );
}
