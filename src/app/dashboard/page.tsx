'use client';
import { useState } from 'react';
import { useStore } from '@/store/useStore';

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

  // Lendo o estado global levantado pela Navbar
  const searchQuery = useStore((s) => s.searchQuery);

  const filterCourses = (courses: any[]) => {
    if (!searchQuery) return courses;
    return courses.filter(c => 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
