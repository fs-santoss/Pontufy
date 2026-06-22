export default function DashboardLoading() {
  return (
    <main className="min-h-screen pb-20 bg-[#F8F9FA]">
      <div className="w-full h-[75vh] bg-gray-100 animate-pulse" />
      <div className="relative z-20 -mt-10 px-8 md:px-16 space-y-12">
        <div>
          <div className="h-6 w-48 bg-gray-200 rounded mb-4 animate-pulse" />
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-none w-[280px] h-[160px] bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
