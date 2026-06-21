export default function MetricCard({ title, value, trend }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow">
      <h3 className="text-brand-text font-semibold text-sm mb-2 uppercase tracking-wide">{title}</h3>
      <div className="text-3xl font-black text-brand-slate mb-2">{value}</div>
      <div className="text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded">
        {trend}
      </div>
    </div>
  );
}
