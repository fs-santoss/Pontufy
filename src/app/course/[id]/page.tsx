'use client';
import { useState } from 'react';

import VideoPlayer from '@/components/player/VideoPlayer';
import SidebarModules from '@/components/player/SidebarModules';
import PointsCelebration from '@/components/gamification/PointsCelebration';
import { triggerLessonCompletion } from '@/hooks/useApi';

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

  const [isCompleting, setIsCompleting] = useState(false);

  const handleLessonComplete = async () => {
    if (activeLesson.completed || isCompleting) return;
    
    setIsCompleting(true);
    try {
      const res = await triggerLessonCompletion(activeLesson.id);
      
      if (res.success) {
        setEarnedPoints(activeLesson.points);
        setShowCelebration(true);
        setActiveLesson(prev => ({ ...prev, completed: true }));
      } else {
        alert(res.error || 'Erro ao completar a aula.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao concluir a aula.');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden h-full">

      {/* Points Celebration Overlay */}
      <PointsCelebration 
        points={earnedPoints} 
        isVisible={showCelebration} 
        onComplete={() => setShowCelebration(false)} 
      />

      <div className="flex-1 flex h-[calc(100vh-72px)]">
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
              
              <div className="mt-8">
                <button 
                  onClick={handleLessonComplete}
                  disabled={activeLesson.completed || isCompleting}
                  className={`px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 ${
                    activeLesson.completed 
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md'
                  }`}
                >
                  {activeLesson.completed ? 'Aula Concluída' : `Concluir Aula e Ganhar ${activeLesson.points} Pontos`}
                </button>
              </div>
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
