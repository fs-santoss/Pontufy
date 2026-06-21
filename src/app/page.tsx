'use client';
import Navbar from '@/components/layout/Navbar';
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

  return (
    <main className="min-h-screen bg-brand-gray pb-20">
      <Navbar />
      <SurpriseRewardToast />
      
      {/* Hero Section */}
      <HeroCourse course={heroCourse} />
      
      {/* Rest of the Dashboard */}
      <div className="relative z-20 -mt-10">
        <CourseRow title="Continuar de onde parou" courses={coursesToDisplay} />
        
        {/* Marketplace Preview inside Dashboard */}
        <RewardRow title="Recompensas a um passo de você" rewards={rewardsToDisplay} />
        
        <CourseRow title="Recomendados para seu cargo" courses={recommendedRoles} />
      </div>
    </main>
  );
}
