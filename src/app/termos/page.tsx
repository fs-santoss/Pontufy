export default function TermosPage() {
  return (
    <main className="min-h-screen bg-[#F8F9FA] text-brand-slate py-20 px-6">
      <div className="max-w-4xl mx-auto bg-white p-12 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-4xl font-extrabold mb-8">Termos de Serviço</h1>
        
        <div className="space-y-6 text-brand-slate/80 leading-relaxed">
          <p>
            <strong>Última atualização: 21 de Junho de 2026</strong>
          </p>
          
          <h2 className="text-2xl font-bold text-brand-slate mt-8">1. Aceitação dos Termos</h2>
          <p>
            Ao acessar e utilizar a plataforma Pontufy ("Serviço"), você concorda em cumprir e estar vinculado a estes Termos de Serviço. Se você não concorda com qualquer parte destes termos, não deve acessar o Serviço.
          </p>

          <h2 className="text-2xl font-bold text-brand-slate mt-8">2. Uso da Plataforma</h2>
          <p>
            A Pontufy é uma plataforma B2B de Learning Management System (LMS) focada em gamificação. O acesso é restrito a funcionários das empresas contratantes. Você se compromete a:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Não compartilhar suas credenciais de acesso.</li>
            <li>Não utilizar o sistema para fins ilícitos.</li>
            <li>Respeitar a propriedade intelectual dos cursos e trilhas gerados pela IA.</li>
          </ul>

          <h2 className="text-2xl font-bold text-brand-slate mt-8">3. Sistema de Pontos e Recompensas</h2>
          <p>
            Os pontos ("Pontufy Points") são virtuais, intransferíveis e não possuem valor monetário fora do ecossistema da empresa contratante. A conversão de pontos em prêmios no Clube de Benefícios está sujeita à política interna do RH de sua empresa e à disponibilidade de estoque nos parceiros.
          </p>

          <h2 className="text-2xl font-bold text-brand-slate mt-8">4. Limitação de Responsabilidade</h2>
          <p>
            A Pontufy S/A não se responsabiliza por interrupções temporárias do serviço causadas por manutenção, atualizações ou motivos de força maior.
          </p>
        </div>
      </div>
    </main>
  );
}
