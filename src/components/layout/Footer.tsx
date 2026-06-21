import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-[#F8F9FA] py-8 px-6 mt-auto">
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-sm">
          &copy; 2026 Pontufy S/A Todos os direitos reservados.
        </div>
        <div className="flex gap-6 text-sm">
          <Link href="/termos" className="hover:text-emerald-400 transition-colors">Termos de Serviço</Link>
          <Link href="/privacidade" className="hover:text-emerald-400 transition-colors">Política de Privacidade</Link>
          <Link href="mailto:ajuda@pontufy.com" className="hover:text-emerald-400 transition-colors">Suporte: ajuda@pontufy.com</Link>
        </div>
      </div>
    </footer>
  );
}
