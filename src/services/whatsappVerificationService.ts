// Interface para status do cliente no WhatsApp
export interface ClienteWhatsAppStatus {
  cliente: any | null;
  temAssinaturaAtiva: boolean;
  cursosAtivos: Array<{
    nome: string;
    dataInicio: string;
    dataFim: string;
    status: string;
  }>;
  proximosVencimentos: Array<{
    curso: string;
    dataVencimento: string;
  }>;
  creditoDisponivel: number;
  tipoCliente: 'PSICOLOGO' | 'ESTUDANTE' | 'OUTROS';
  mensagemPersonalizada: string;
}

// Normalizar número de telefone para comparação
const normalizarTelefone = (telefone: string): string => {
  // Remove todos os caracteres não numéricos
  return telefone.replace(/\D/g, '');
};

// Gerar mensagem personalizada baseada no status do cliente
const gerarMensagemPersonalizada = (status: Omit<ClienteWhatsAppStatus, 'mensagemPersonalizada'>): string => {
  const { cliente, temAssinaturaAtiva, cursosAtivos, proximosVencimentos, tipoCliente } = status;

  if (!cliente) {
    return "Olá! Não encontrei seu cadastro em nossa base. Para ter acesso ao atendimento, você precisa ser um cliente CEAP. Entre em contato conosco para mais informações! 📚";
  }

  const nomeCliente = cliente.nome.split(' ')[0]; // Primeiro nome
  const saudacao = tipoCliente === 'PSICOLOGO' ? `Dr(a). ${nomeCliente}` : nomeCliente;

  if (temAssinaturaAtiva) {
    let mensagem = `Olá, ${saudacao}! 👋\n\n`;
    mensagem += `Identificamos que você possui assinatura ativa em nossos cursos:\n\n`;
    
    cursosAtivos.forEach((curso, index) => {
      mensagem += `${index + 1}. 📖 ${curso.nome}\n`;
      mensagem += `   📅 Válido até: ${new Date(curso.dataFim).toLocaleDateString('pt-BR')}\n\n`;
    });

    if (proximosVencimentos.length > 0) {
      mensagem += `⚠️ Atenção: Você tem cursos com vencimento próximo:\n`;
      proximosVencimentos.forEach(venc => {
        mensagem += `• ${venc.curso} - Vence em ${new Date(venc.dataVencimento).toLocaleDateString('pt-BR')}\n`;
      });
      mensagem += `\n`;
    }

    if (status.creditoDisponivel > 0) {
      mensagem += `💰 Você possui R$ ${status.creditoDisponivel.toFixed(2)} em créditos disponíveis!\n\n`;
    }

    mensagem += `Como posso ajudá-lo hoje? 🤖✨`;
    
    return mensagem;
  } else {
    let mensagem = `Olá, ${saudacao}! 👋\n\n`;
    mensagem += `Encontrei seu cadastro, mas não localizei assinaturas ativas no momento.\n\n`;
    
    if (status.creditoDisponivel > 0) {
      mensagem += `💰 Você possui R$ ${status.creditoDisponivel.toFixed(2)} em créditos disponíveis para usar em novos cursos!\n\n`;
    }

    mensagem += `Gostaria de conhecer nossos cursos disponíveis ou tem alguma dúvida sobre nossos serviços? 📚✨`;
    
    return mensagem;
  }
};

// Função principal para verificar status do cliente via WhatsApp
export const verificarClienteWhatsApp = async (numeroTelefone: string): Promise<ClienteWhatsAppStatus> => {
  try {
    const telefoneNormalizado = normalizarTelefone(numeroTelefone);

    // TODO: Implementar busca real no banco de dados quando necessário
    // Por enquanto, retorna uma resposta padrão
    const cliente = null;

    if (!cliente) {
      return {
        cliente: null,
        temAssinaturaAtiva: false,
        cursosAtivos: [],
        proximosVencimentos: [],
        creditoDisponivel: 0,
        tipoCliente: 'OUTROS',
        mensagemPersonalizada: gerarMensagemPersonalizada({
          cliente: null,
          temAssinaturaAtiva: false,
          cursosAtivos: [],
          proximosVencimentos: [],
          creditoDisponivel: 0,
          tipoCliente: 'OUTROS'
        })
      };
    }

    // TODO: Implementar lógica completa quando dados estiverem disponíveis
    const status: Omit<ClienteWhatsAppStatus, 'mensagemPersonalizada'> = {
      cliente,
      temAssinaturaAtiva: false,
      cursosAtivos: [],
      proximosVencimentos: [],
      creditoDisponivel: 0,
      tipoCliente: 'OUTROS'
    };

    return {
      ...status,
      mensagemPersonalizada: gerarMensagemPersonalizada(status)
    };
  } catch (error) {
    console.error('Erro ao verificar cliente WhatsApp:', error);
    // Retornar resposta de erro sem quebrar
    return {
      cliente: null,
      temAssinaturaAtiva: false,
      cursosAtivos: [],
      proximosVencimentos: [],
      creditoDisponivel: 0,
      tipoCliente: 'OUTROS',
      mensagemPersonalizada: "Olá! Ocorreu um erro temporário. Por favor, tente novamente em alguns minutos ou entre em contato conosco. 🤖"
    };
  }
};

// Função auxiliar para buscar cliente por email (útil para outras integrações)
export const verificarClientePorEmail = async (email: string): Promise<ClienteWhatsAppStatus> => {
  try {
    // TODO: Implementar busca por email quando necessário
    return {
      cliente: null,
      temAssinaturaAtiva: false,
      cursosAtivos: [],
      proximosVencimentos: [],
      creditoDisponivel: 0,
      tipoCliente: 'OUTROS',
      mensagemPersonalizada: "Cliente não encontrado por email."
    };
  } catch (error) {
    console.error('Erro ao verificar cliente por email:', error);
    return {
      cliente: null,
      temAssinaturaAtiva: false,
      cursosAtivos: [],
      proximosVencimentos: [],
      creditoDisponivel: 0,
      tipoCliente: 'OUTROS',
      mensagemPersonalizada: "Erro ao buscar cliente por email."
    };
  }
};

// Função para obter estatísticas gerais dos clientes
export const getEstatisticasClientes = async () => {
  try {
    // TODO: Implementar estatísticas reais quando dados estiverem disponíveis
    return {
      totalClientes: 0,
      clientesPsicologos: 0,
      clientesComCredito: 0,
      vendasAtivas: 0,
      clientesAtivos: 0,
      taxaConversao: '0'
    };
  } catch (error) {
    console.error('Erro ao calcular estatísticas:', error);
    return {
      totalClientes: 0,
      clientesPsicologos: 0,
      clientesComCredito: 0,
      vendasAtivas: 0,
      clientesAtivos: 0,
      taxaConversao: '0'
    };
  }
}; 