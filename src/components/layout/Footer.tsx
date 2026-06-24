import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#0a0a0a] border-t border-[#1a1a1a] text-gray-500 py-8 px-6 pb-20 sm:pb-8 mt-auto">
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-base font-black text-white">
            <span className="text-emerald-400">Pontu</span>fy
          </span>
          <span className="text-xs text-gray-600">© 2026 Todos os direitos reservados.</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-xs">
          <Link href="/termos" className="hover:text-gray-300 transition-colors">Termos de Serviço</Link>
          <Link href="/privacidade" className="hover:text-gray-300 transition-colors">Política de Privacidade</Link>
          <Link href="mailto:ajuda@pontufy.com" className="hover:text-gray-300 transition-colors">ajuda@pontufy.com</Link>
        </div>
      </div>
    </footer>
  );
}
