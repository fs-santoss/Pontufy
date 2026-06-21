export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#F8F9FA] text-brand-slate py-20 px-6">
      <div className="max-w-4xl mx-auto bg-white p-12 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-4xl font-extrabold mb-8">Política de Privacidade</h1>
        
        <div className="space-y-6 text-brand-slate/80 leading-relaxed">
          <p>
            <strong>Última atualização: 21 de Junho de 2026</strong>
          </p>
          
          <h2 className="text-2xl font-bold text-brand-slate mt-8">1. Coleta de Dados</h2>
          <p>
            A Pontufy S/A leva a sua privacidade a sério. Coletamos apenas as informações estritamente necessárias para o funcionamento do Learning Management System (LMS) e do sistema de gamificação. Isso inclui:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Nome e e-mail corporativo fornecidos pela sua empresa.</li>
            <li>Métricas de engajamento: aulas assistidas, tempo de permanência e trilhas concluídas.</li>
            <li>Histórico de pontuação e resgates no Clube de Benefícios.</li>
          </ul>

          <h2 className="text-2xl font-bold text-brand-slate mt-8">2. Uso das Informações</h2>
          <p>
            Utilizamos seus dados exclusivamente para:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Personalizar as recomendações de cursos utilizando nossa Inteligência Artificial.</li>
            <li>Processar o acúmulo e resgate de pontos com transparência.</li>
            <li>Fornecer relatórios anonimizados ou específicos para o setor de Recursos Humanos da sua empresa, conforme acordo B2B.</li>
          </ul>

          <h2 className="text-2xl font-bold text-brand-slate mt-8">3. Compartilhamento de Dados</h2>
          <p>
            Não vendemos nem alugamos seus dados pessoais para terceiros. O compartilhamento ocorre estritamente com os parceiros de e-commerce (ex: Amazon, Magalu) apenas no momento em que você decide resgatar um prêmio, para fins de faturamento e entrega.
          </p>

          <h2 className="text-2xl font-bold text-brand-slate mt-8">4. Seus Direitos (LGPD)</h2>
          <p>
            Em conformidade com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de solicitar o acesso, correção ou anonimização de seus dados pessoais. Tais solicitações devem ser mediadas pelo administrador do RH da sua empresa.
          </p>
        </div>
      </div>
    </main>
  );
}
