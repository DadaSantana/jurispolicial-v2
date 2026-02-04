export default function PoliticasPrivacidade() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Introdução</h2>
          <p className="mb-4">
            Esta Política de Privacidade descreve como o JurisPolicial ("nós", "nosso" ou "sistema") coleta, usa, armazena e protege suas informações pessoais. Ao utilizar nosso sistema de geração de relatórios de ocorrências policiais com inteligência artificial, você concorda com as práticas descritas nesta política.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Informações que Coletamos</h2>
          <p className="mb-4">Coletamos os seguintes dados pessoais dos usuários:</p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Nome completo</li>
            <li>Endereço de e-mail</li>
            <li>CPF</li>
            <li>Número de telefone</li>
          </ul>
          <p className="mb-4">
            <strong>Importante:</strong> Suas senhas são gerenciadas de forma segura pelo Firebase Authentication e não são armazenadas em nossos servidores.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Dados de Terceiros</h2>
          <p className="mb-4">
            Nosso sistema permite que usuários insiram dados de terceiros ao gerar relatórios de ocorrências. É responsabilidade do usuário:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Obter consentimento apropriado antes de inserir dados de terceiros</li>
            <li>Garantir a precisão das informações fornecidas</li>
            <li>Utilizar os dados apenas para fins legítimos relacionados ao relatório</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Uso das Informações</h2>
          <p className="mb-4">Utilizamos suas informações para:</p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Gerar relatórios de ocorrências policiais</li>
            <li>Processar dados através de nossa inteligência artificial</li>
            <li>Autenticar seu acesso ao sistema</li>
            <li>Enviar comunicações importantes sobre o serviço</li>
            <li>Melhorar nossos algoritmos e qualidade do serviço</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Proteção de Dados</h2>
          <p className="mb-4">
            Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações, incluindo:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Autenticação segura via Firebase Authentication</li>
            <li>Criptografia de dados em trânsito e em repouso</li>
            <li>Acesso restrito a dados pessoais</li>
            <li>Monitoramento regular de segurança</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Seus Direitos</h2>
          <p className="mb-4">Você tem direito a:</p>
          <ul className="list-disc list-inside mb-4 space-y-2">
            <li>Acessar seus dados pessoais</li>
            <li>Corrigir dados incorretos</li>
            <li>Solicitar a exclusão de seus dados</li>
            <li>Revogar seu consentimento a qualquer momento</li>
            <li>Receber seus dados em formato estruturado</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Retenção de Dados</h2>
          <p className="mb-4">
            Mantemos seus dados pessoais pelo tempo necessário para cumprir as finalidades descritas nesta política, a menos que um período de retenção mais longo seja exigido por lei ou necessário para resolver disputas.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Contato</h2>
          <p className="mb-4">
            Para questões sobre esta política de privacidade ou sobre seus dados pessoais, entre em contato conosco através do e-mail: [seu-email@dominio.com]
          </p>
        </section>

        <footer className="text-sm text-gray-600">
          <p>Última atualização: Março de 2025</p>
        </footer>
      </div>
    </div>
  );
}