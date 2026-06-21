'use client';
import { useState } from 'react';

import HeroCourse from '@/components/dashboard/HeroCourse';
import CourseRow from '@/components/dashboard/CourseRow';
import RewardRow from '@/components/dashboard/RewardRow';
import SurpriseRewardToast from '@/components/dashboard/SurpriseRewardToast';
import mockData from '@/data/mock.json';
import { useCourses, useRewards } from '@/hooks/useApi';

export default function Home() {
  const { data: dynamicCourses } = useCourses();
  const { data: dynamicRewards } = useRewards();

  const { heroCourse, continueWatching, recommendedRoles, rewardsAlmostThere } = mockData;
  const coursesToDisplay = dynamicCourses?.length ? dynamicCourses : continueWatching;
  const rewardsToDisplay = dynamicRewards?.length ? dynamicRewards.slice(0, 4) : rewardsAlmostThere;

  const [searchTerm, setSearchTerm] = useState('');

  const filterCourses = (courses: any[]) => {
    if (!searchTerm) return courses;
    return courses.filter(c => 
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const filteredRecommended = filterCourses(recommendedRoles);
  const filteredContinue = filterCourses(coursesToDisplay);

  return (
    <main className="min-h-screen pb-20 bg-[#F8F9FA] text-slate-800">

      <SurpriseRewardToast />
      
      {/* Hero Section */}
      <HeroCourse course={heroCourse} />
      
      {/* Rest of the Dashboard */}
      <div className="relative z-20 -mt-10 space-y-12">
        
        {/* Search Bar */}
        <div className="px-8 md:px-16 max-w-4xl">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar trilhas, cursos ou assuntos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-6 py-4 rounded-xl shadow-md border border-gray-100 text-brand-slate focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow bg-white"
            />
            <div className="absolute right-6 top-4 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
          </div>
        </div>

        {filteredRecommended.length > 0 && (
          <CourseRow title="Trilhas Recomendadas pela IA" courses={filteredRecommended} />
        )}
        
        {filteredContinue.length > 0 && (
          <CourseRow title="Continue de onde parou" courses={filteredContinue} />
        )}
        
        {filteredRecommended.length === 0 && filteredContinue.length === 0 && (
          <div className="px-8 md:px-16 py-8 text-center text-gray-500">
            Nenhum curso encontrado para "{searchTerm}".
          </div>
        )}
      </div>
    </main>
  );
}
