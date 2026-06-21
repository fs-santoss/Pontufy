import { Sparkles, Users } from 'lucide-react';
import Link from 'next/link';

export default function AISelectionTable({ courses }: { courses: any[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Sparkles className="text-brand-slate" size={20} />
          <h2 className="text-lg font-bold text-brand-slate">Cursos Gerados pela IA</h2>
        </div>
        <Link href="/admin/wizard" className="bg-gradient-pontufy text-emerald-900 font-bold px-4 py-2 rounded-lg text-sm shadow-sm hover:shadow-md transition-shadow">
          + Gerar Novo Curso
        </Link>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white text-brand-text text-xs uppercase tracking-wider border-b border-gray-100">
              <th className="px-6 py-4 font-semibold">Título do Curso</th>
              <th className="px-6 py-4 font-semibold text-center">Status</th>
              <th className="px-6 py-4 font-semibold text-center">Engajamento</th>
              <th className="px-6 py-4 font-semibold text-right">Data de Geração</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {courses.map((course) => (
              <tr key={course.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-brand-slate">{course.title}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    course.status === 'Publicado' 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {course.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center text-brand-slate font-medium flex items-center justify-center gap-1.5">
                  <Users size={16} className="text-brand-text" /> {course.enrolled}
                </td>
                <td className="px-6 py-4 text-right text-brand-text text-sm">{course.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
