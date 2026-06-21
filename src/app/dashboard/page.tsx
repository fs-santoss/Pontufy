'use client';

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
    <main className="min-h-screen pb-20 bg-[#F8F9FA] text-slate-800">

      <SurpriseRewardToast />
      
      {/* Hero Section */}
      <HeroCourse course={heroCourse} />
      
      {/* Rest of the Dashboard */}
      <div className="relative z-20 -mt-10 space-y-12">
        <CourseRow title="Trilhas Recomendadas pela IA" courses={recommendedRoles} />
        <CourseRow title="Continue de onde parou" courses={coursesToDisplay} />
      </div>
    </main>
  );
}
