'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Award, Download, Loader2, BookOpen } from 'lucide-react';

interface Certificate {
  id: string;
  courseId: string;
  courseName: string;
  issuedAt: string;
}

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/certificates')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCertificates(data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleDownload = async (cert: Certificate) => {
    setDownloading(cert.id);
    try {
      const res = await fetch('/api/certificates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: cert.courseId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erro ao gerar certificado.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificado-${cert.courseName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Erro ao baixar certificado.');
    } finally {
      setDownloading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh] bg-[#0a0a0a]">
        <Loader2 className="animate-spin text-emerald-500" size={36} />
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-20 pt-24 bg-[#0a0a0a]">
      <div className="max-w-[800px] mx-auto px-6 md:px-16">
        <header className="mb-8 flex items-center gap-3">
          <Award size={28} className="text-emerald-400" />
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Meus Certificados</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Certificados emitidos pelos cursos que você concluiu.</p>
          </div>
        </header>

        {certificates.length === 0 ? (
          <div className="text-center py-24 bg-[#141414] border border-[#2a2a2a] rounded-xl">
            <BookOpen size={40} className="mx-auto text-gray-700 mb-4" />
            <p className="text-white font-semibold mb-1">Nenhum certificado ainda</p>
            <p className="text-gray-500 text-sm mb-6">Conclua um curso para receber seu certificado.</p>
            <Link
              href="/cursos"
              className="inline-block px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
            >
              Ver cursos disponíveis
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {certificates.map((cert) => {
              const issuedDate = new Date(cert.issuedAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              });
              const isThisDownloading = downloading === cert.id;

              return (
                <div
                  key={cert.id}
                  className="flex items-center justify-between gap-4 bg-[#141414] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#3a3a3a] transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 flex-shrink-0 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                      <Award size={20} className="text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-bold truncate">{cert.courseName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Emitido em {issuedDate}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(cert)}
                    disabled={isThisDownloading}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] hover:border-[#3a3a3a] disabled:opacity-50 transition-colors"
                  >
                    {isThisDownloading ? (
                      <><Loader2 size={15} className="animate-spin" /> Gerando...</>
                    ) : (
                      <><Download size={15} /> Baixar PDF</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
