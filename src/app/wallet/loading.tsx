export default function WalletLoading() {
  return (
    <main className="pb-20 pt-8">
      <div className="max-w-[1000px] mx-auto px-6 md:px-8">
        <div className="h-8 w-56 bg-gray-200 rounded mb-2 animate-pulse" />
        <div className="h-4 w-80 bg-gray-100 rounded mb-8 animate-pulse" />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8 animate-pulse">
          <div className="h-12 w-40 bg-gray-200 rounded mb-2" />
          <div className="h-6 w-24 bg-gray-100 rounded" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  );
}
