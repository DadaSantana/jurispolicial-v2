import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { zapiService, ZApiWebhookPayload } from './services/zapiService';
import { openaiService } from './services/openaiService';
import { clienteService, Cliente, UserService } from './services/clienteService';
import { asaasWebhook } from './webhooks/asaasWebhook';

// Inicializar Firebase Admin
admin.initializeApp();

// Configurar CORS
const corsHandler = cors({ origin: true });

// Instanciar serviços
const userService = new UserService();

/**
 * Webhook principal para receber mensagens do WhatsApp via Z-API
 * Adaptado para gerar relatórios policiais
 */
export const whatsappWebhook = functions.https.onRequest(async (req, res) => {
  // Aplicar CORS
  corsHandler(req, res, async () => {
    try {
      // Verificar método HTTP
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
      }

      // Verificar se tem body
      if (!req.body) {
        return res.status(400).json({ error: 'Body da requisição é obrigatório' });
      }

      const webhookPayload: ZApiWebhookPayload = req.body;

      functions.logger.info('📨 Webhook recebido', {
        type: webhookPayload.type,
        phone: webhookPayload.phone,
        fromMe: webhookPayload.fromMe,
        status: webhookPayload.status,
        messageId: webhookPayload.messageId
      });

      // Verificar se é uma mensagem válida recebida
      if (!zapiService.isValidReceivedMessage(webhookPayload)) {
        functions.logger.info('⚠️ Mensagem ignorada - não é uma mensagem recebida válida');
        return res.status(200).json({ message: 'Mensagem ignorada' });
      }

      // Extrair informações da mensagem
      const messageInfo = zapiService.extractMessageInfo(webhookPayload);
      
      functions.logger.info('💬 Processando mensagem para relatório policial', {
        phone: messageInfo.phone,
        message: messageInfo.message,
        senderName: messageInfo.senderName
      });

      // Buscar usuário por telefone
      const user = await userService.findByPhone(messageInfo.phone);
      
      // Verificar se está aguardando e-mail deste telefone
      const stateRef = admin.firestore().collection('whatsapp_states').doc(messageInfo.phone);
      const stateDoc = await stateRef.get();
      const waitingForEmail = stateDoc.exists && stateDoc.data()?.waitingForEmail;
      
      if (!user) {
        if (!waitingForEmail) {
          // Primeira tentativa: pedir e-mail
          await stateRef.set({ waitingForEmail: true, timestamp: Date.now() });
          await zapiService.sendText({
            phone: messageInfo.phone,
            message: "❌ Desculpe, não conseguimos identificar seu contato. Por favor, informe o e-mail utilizado na plataforma JurisPolicial. Caso não tenha uma conta, registre-se em @https://www.jurispolicial.com.br/cadastro .",
            delayTyping: 2
          });
          return res.status(200).json({ message: 'Solicitado e-mail do usuário não identificado' });
        } else {
          // Usuário respondeu com e-mail
          const emailInformado = (messageInfo.message || '').trim().toLowerCase();
          // Buscar usuário por e-mail
          const userByEmail = await userService.findByEmail(emailInformado);
          if (!userByEmail) {
            await zapiService.sendText({
              phone: messageInfo.phone,
              message: "❌ Não encontramos nenhum usuário com este e-mail. Verifique se digitou corretamente ou registre-se em @https://www.jurispolicial.com.br/cadastro .",
              delayTyping: 2
            });
            // Mantém aguardando e-mail
            return res.status(200).json({ message: 'E-mail não encontrado' });
          }
          // Verificar se já há telefone vinculado
          if (userByEmail.telefone && userByEmail.telefone.length >= 10) {
            await zapiService.sendText({
              phone: messageInfo.phone,
              message: "❌ Já há um telefone associado a este e-mail. Para alterar, por favor, acesse a plataforma e altere seu perfil.",
              delayTyping: 2
            });
            // Limpa estado
            await stateRef.delete();
            return res.status(200).json({ message: 'E-mail já possui telefone vinculado' });
          }
          // Vincular telefone ao usuário
          await admin.firestore().collection('users').doc(userByEmail.id).update({ telefone: messageInfo.phone });
          await zapiService.sendText({
            phone: messageInfo.phone,
            message: "✅ Seu telefone foi vinculado com sucesso ao seu cadastro! Agora você pode utilizar normalmente o sistema pelo WhatsApp.",
            delayTyping: 2
          });
          // Limpa estado
          await stateRef.delete();
          return res.status(200).json({ message: 'Telefone vinculado ao usuário por e-mail' });
        }
      }

      // Verificar se usuário está ativo
      const isActive = await userService.isUserActive(user);
      
      if (!isActive) {
        functions.logger.info('❌ Usuário encontrado mas não possui acesso', { 
          userId: user.id,
          uid: user.uid,
          nome: user.nome 
        });
        
        // Enviar mensagem de acesso negado
        await zapiService.sendText({
          phone: messageInfo.phone,
          message: "❌ Desculpe, você não possui acesso ativo a esta funcionalidade. Verifique seus dados de cadastro.",
          delayTyping: 2
        });
        
        return res.status(200).json({ message: 'Usuário sem acesso' });
      }

      functions.logger.info('✅ Usuário validado', { 
        userId: user.id,
        uid: user.uid,
        nome: user.nome,
        role: user.role
      });

      // Enviar mensagem de confirmação de recebimento
      await zapiService.sendText({
        phone: messageInfo.phone,
        message: "✅ Mensagem recebida! Estou processando sua solicitação de relatório policial. Isso pode levar alguns minutos...",
        delayTyping: 1
      });

      try {
        // Gerar relatório policial usando as APIs existentes
        const reportResult = await generatePoliceReport(messageInfo.message);

        // Criar mensagens para salvar no histórico
        const mensagens = [
          {
            id: Date.now().toString(),
            texto: messageInfo.message,
            remetente: 'usuario',
            data: new Date()
          },
          {
            id: (Date.now() + 1).toString(),
            texto: reportResult.relatorio,
            remetente: 'ia',
            data: new Date()
          }
        ];

        // Salvar relatório na coleção consultas
        const consultaId = await userService.saveReportToConsultas(user.uid, {
          assunto: reportResult.assunto,
          mensagens: mensagens,
          relatorio: reportResult.relatorio,
          analise: reportResult.analise,
          qualificacoes: reportResult.qualificacoes || []
        });

        // Enviar o relatório completo via WhatsApp dividido em múltiplas mensagens se necessário
        await sendCompleteReportViaWhatsApp(messageInfo.phone, reportResult.relatorio, reportResult.assunto);

        // Registrar interação
        await userService.logInteraction(user.id, {
          message: messageInfo.message,
          response: reportResult.relatorio,
          phone: messageInfo.phone,
          timestamp: messageInfo.timestamp,
          assistantData: {
            tipo: 'relatorio_policial',
            consultaId: consultaId,
            assunto: reportResult.assunto
          }
        });

        // Atualizar último acesso
        await userService.updateLastAccess(user.id);

        functions.logger.info('✅ Relatório policial processado com sucesso', {
          userId: user.id,
          uid: user.uid,
          consultaId: consultaId,
          messageId: messageInfo.messageId
        });

        return res.status(200).json({ 
          message: 'Relatório gerado com sucesso',
          userId: user.id,
          consultaId: consultaId,
          assunto: reportResult.assunto
        });

      } catch (reportError) {
        functions.logger.error('❌ Erro ao gerar relatório policial', reportError);
        
        // Enviar mensagem de erro ao usuário
        await zapiService.sendText({
          phone: messageInfo.phone,
          message: "❌ Ocorreu um erro ao processar seu relatório. Tente novamente em alguns minutos ou entre em contato com o suporte.",
          delayTyping: 2
        });

        throw reportError;
      }

    } catch (error) {
      functions.logger.error('❌ Erro no processamento do webhook', error);
      
      return res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Envia o relatório completo via WhatsApp dividindo em múltiplas mensagens se necessário
 */
async function sendCompleteReportViaWhatsApp(phone: string, relatorio: string, assunto: string): Promise<void> {
  // Limite de caracteres por mensagem no WhatsApp (deixando margem de segurança)
  const maxCharsPerMessage = 4000;
  
  // Enviar cabeçalho
  await zapiService.sendText({
    phone: phone,
    message: `📋 RELATÓRIO POLICIAL GERADO\n\n✅ Relatório salvo em seu histórico no sistema.\n\n─────────────────────`,
    delayTyping: 2,
    delayMessage: 1
  });

  // Se o relatório cabe em uma mensagem, enviar completo
  if (relatorio.length <= maxCharsPerMessage) {
    await zapiService.sendText({
      phone: phone,
      message: relatorio,
      delayTyping: 3,
      delayMessage: 2
    });
    return;
  }

  // Se for muito longo, dividir em partes
  const parts = splitTextIntoChunks(relatorio, maxCharsPerMessage);
  
  for (let i = 0; i < parts.length; i++) {
    const partNumber = i + 1;
    const totalParts = parts.length;
    
    const messageHeader = `📄 PARTE ${partNumber}/${totalParts}\n\n`;
    const messageContent = parts[i];
    const messageFull = messageHeader + messageContent;

    await zapiService.sendText({
      phone: phone,
      message: messageFull,
      delayTyping: 2,
      delayMessage: 1
    });

    // Delay entre partes para não sobrecarregar
    if (i < parts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Mensagem final
  await zapiService.sendText({
    phone: phone,
    message: `✅ RELATÓRIO COMPLETO ENVIADO!\n\n📊 Total de ${parts.length} parte(s)\n📝 ${relatorio.length} caracteres\n\n💾 Relatório também disponível em seu histórico no sistema.`,
    delayTyping: 2,
    delayMessage: 1
  });
}

/**
 * Divide um texto em chunks menores respeitando quebras de linha e parágrafos
 */
function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  
  // Dividir por parágrafos primeiro
  const paragraphs = text.split('\n\n');
  
  for (const paragraph of paragraphs) {
    // Se o parágrafo inteiro cabe no chunk atual
    if ((currentChunk + '\n\n' + paragraph).length <= maxLength) {
      if (currentChunk) {
        currentChunk += '\n\n' + paragraph;
      } else {
        currentChunk = paragraph;
      }
    } else {
      // Se há conteúdo no chunk atual, salvá-lo
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // Se o parágrafo é muito longo, dividir por frases
      if (paragraph.length > maxLength) {
        const sentences = paragraph.split('. ');
        for (const sentence of sentences) {
          const sentenceWithDot = sentence.endsWith('.') ? sentence : sentence + '.';
          
          if ((currentChunk + ' ' + sentenceWithDot).length <= maxLength) {
            if (currentChunk) {
              currentChunk += ' ' + sentenceWithDot;
            } else {
              currentChunk = sentenceWithDot;
            }
          } else {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = sentenceWithDot;
          }
        }
      } else {
        currentChunk = paragraph;
      }
    }
  }
  
  // Adicionar o último chunk se houver
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Função auxiliar para gerar relatório policial usando as APIs existentes
 */
async function generatePoliceReport(messageText: string): Promise<{
  assunto: string;
  relatorio: string;
  analise?: string;
  qualificacoes?: any[];
}> {
  try {
    // 1. Gerar assunto do relatório
    const assuntoResponse = await callOpenAIAssistant('asst_oc6NLxtLbdI7uDfcYiL8iOS6', messageText);
    const assunto = assuntoResponse || 'Relatório Policial';

    // 2. Gerar relatório principal
    const relatorioResponse = await callOpenAIAssistant('asst_TrDDW6hlCMBeYBHoo94XHCDG', messageText);
    
    if (!relatorioResponse) {
      throw new Error('Falha ao gerar relatório policial');
    }

    // 3. Gerar análise positiva (opcional)
    let analise = '';
    let qualificacoes: any[] = [];
    
    try {
      const analiseResponse = await callOpenAIAssistant('asst_zJgbX5J2ju9gsWbMcYRynh4z', relatorioResponse);
      analise = analiseResponse || '';
      
      // Extrair qualificações da análise
      qualificacoes = extractQualifications(analise);
    } catch (analiseError) {
      functions.logger.warn('⚠️ Erro ao gerar análise, continuando sem ela', analiseError);
    }

    return {
      assunto,
      relatorio: relatorioResponse,
      analise,
      qualificacoes
    };

  } catch (error) {
    functions.logger.error('❌ Erro na geração do relatório policial', error);
    throw error;
  }
}

/**
 * Função auxiliar para chamar assistentes OpenAI
 */
async function callOpenAIAssistant(assistantId: string, message: string): Promise<string> {
  const OpenAI = await import('openai');
  const openai = new OpenAI.default({
    apiKey: functions.config().openai?.api_key || process.env.OPENAI_API_KEY
  });

  try {
    const thread = await openai.beta.threads.create();
    
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: message
    });

    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistantId
    });

    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(thread.id);
      
      for (const msg of messages.data) {
        for (const contentItem of msg.content) {
          if (contentItem.type === 'text' && msg.role === 'assistant') {
            return contentItem.text.value;
          }
        }
      }
    }

    throw new Error(`OpenAI run failed with status: ${run.status}`);
  } catch (error) {
    functions.logger.error('❌ Erro ao chamar OpenAI assistant', { assistantId, error });
    throw error;
  }
}

/**
 * Extrair qualificações da análise
 */
function extractQualifications(analysisText: string): any[] {
  const qualificacoesList: any[] = [];

  const successMatches = analysisText.match(/- \*\*Success:\*\*\s*(.*?)(?=\n\n|\n- \*\*|\n$|$)/g);
  const warningMatches = analysisText.match(/- \*\*Warning:\*\*\s*(.*?)(?=\n\n|\n- \*\*|\n$|$)/g);
  const infoMatches = analysisText.match(/- \*\*Info:\*\*\s*(.*?)(?=\n\n|\n- \*\*|\n$|$)/g);

  if (successMatches) {
    successMatches.forEach(match => {
      const texto = match.replace(/- \*\*Success:\*\*\s*/g, '').trim();
      qualificacoesList.push({
        id: Date.now() + Math.random().toString(),
        texto,
        tipo: 'success'
      });
    });
  }

  if (warningMatches) {
    warningMatches.forEach(match => {
      const texto = match.replace(/- \*\*Warning:\*\*\s*/g, '').trim();
      qualificacoesList.push({
        id: Date.now() + Math.random().toString(),
        texto,
        tipo: 'warning'
      });
    });
  }

  if (infoMatches) {
    infoMatches.forEach(match => {
      const texto = match.replace(/- \*\*Info:\*\*\s*/g, '').trim();
      qualificacoesList.push({
        id: Date.now() + Math.random().toString(),
        texto,
        tipo: 'info'
      });
    });
  }

  return qualificacoesList;
}

/**
 * Função de teste para simular fluxo do WhatsApp sem precisar configurar webhook
 */
export const testWhatsappFlow = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { phone, message } = req.body;

      if (!phone || !message) {
        return res.status(400).json({ 
          error: 'Parâmetros "phone" e "message" são obrigatórios' 
        });
      }

      // Simular payload do webhook
      const testPayload: ZApiWebhookPayload = {
        isStatusReply: false,
        senderLid: "test@lid",
        connectedPhone: "554499999999",
        waitingMessage: false,
        isEdit: false,
        isGroup: false,
        isNewsletter: false,
        instanceId: "TEST_INSTANCE",
        messageId: `TEST_${Date.now()}`,
        phone: phone,
        fromMe: false,
        momment: Date.now(),
        status: "RECEIVED",
        chatName: "Test User",
        senderPhoto: "",
        senderName: "Test User",
        participantPhone: null,
        participantLid: null,
        photo: "",
        broadcast: false,
        type: "ReceivedCallback",
        text: {
          message: message
        }
      };

      functions.logger.info('🧪 Teste: Simulando recebimento de mensagem', {
        phone: testPayload.phone,
        message: testPayload.text.message
      });

      // Processar como se fosse uma mensagem real
      return processWhatsappMessage(testPayload, res);

    } catch (error) {
      functions.logger.error('❌ Erro no teste do fluxo WhatsApp', error);
      return res.status(500).json({ 
        error: 'Erro no teste',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Função auxiliar para processar mensagens WhatsApp
 */
async function processWhatsappMessage(webhookPayload: ZApiWebhookPayload, res: any) {
  // Verificar se é uma mensagem válida recebida
  if (!zapiService.isValidReceivedMessage(webhookPayload)) {
    functions.logger.info('⚠️ Mensagem ignorada - não é uma mensagem recebida válida');
    return res.status(200).json({ message: 'Mensagem ignorada' });
  }

  // Extrair informações da mensagem
  const messageInfo = zapiService.extractMessageInfo(webhookPayload);
  
  functions.logger.info('💬 Processando mensagem para relatório policial', {
    phone: messageInfo.phone,
    message: messageInfo.message,
    senderName: messageInfo.senderName
  });

  // Buscar usuário por telefone
  const user = await userService.findByPhone(messageInfo.phone);
  
  // Verificar se está aguardando e-mail deste telefone
  const stateRef = admin.firestore().collection('whatsapp_states').doc(messageInfo.phone);
  const stateDoc = await stateRef.get();
  const waitingForEmail = stateDoc.exists && stateDoc.data()?.waitingForEmail;
  
  if (!user) {
    if (!waitingForEmail) {
      // Primeira tentativa: pedir e-mail
      await stateRef.set({ waitingForEmail: true, timestamp: Date.now() });
      await zapiService.sendText({
        phone: messageInfo.phone,
        message: "❌ Desculpe, não conseguimos identificar seu contato. Por favor, informe o e-mail utilizado na plataforma JurisPolicial. Caso não tenha uma conta, registre-se em @https://www.jurispolicial.com.br/cadastro .",
        delayTyping: 2
      });
      return res.status(200).json({ message: 'Solicitado e-mail do usuário não identificado' });
    } else {
      // Usuário respondeu com e-mail
      const emailInformado = (messageInfo.message || '').trim().toLowerCase();
      // Buscar usuário por e-mail
      const userByEmail = await userService.findByEmail(emailInformado);
      if (!userByEmail) {
        await zapiService.sendText({
          phone: messageInfo.phone,
          message: "❌ Não encontramos nenhum usuário com este e-mail. Verifique se digitou corretamente ou registre-se em @https://www.jurispolicial.com.br/cadastro .",
          delayTyping: 2
        });
        // Mantém aguardando e-mail
        return res.status(200).json({ message: 'E-mail não encontrado' });
      }
      // Verificar se já há telefone vinculado
      if (userByEmail.telefone && userByEmail.telefone.length >= 10) {
        await zapiService.sendText({
          phone: messageInfo.phone,
          message: "❌ Já há um telefone associado a este e-mail. Para alterar, por favor, acesse a plataforma e altere seu perfil.",
          delayTyping: 2
        });
        // Limpa estado
        await stateRef.delete();
        return res.status(200).json({ message: 'E-mail já possui telefone vinculado' });
      }
      // Vincular telefone ao usuário
      await admin.firestore().collection('users').doc(userByEmail.id).update({ telefone: messageInfo.phone });
      await zapiService.sendText({
        phone: messageInfo.phone,
        message: "✅ Seu telefone foi vinculado com sucesso ao seu cadastro! Agora você pode utilizar normalmente o sistema pelo WhatsApp.",
        delayTyping: 2
      });
      // Limpa estado
      await stateRef.delete();
      return res.status(200).json({ message: 'Telefone vinculado ao usuário por e-mail' });
    }
  }

  // Verificar se usuário está ativo
  const isActive = await userService.isUserActive(user);
  
  if (!isActive) {
    functions.logger.info('❌ Usuário encontrado mas não possui acesso', { 
      userId: user.id,
      uid: user.uid,
      nome: user.nome 
    });
    
    // Enviar mensagem de acesso negado
    await zapiService.sendText({
      phone: messageInfo.phone,
      message: "❌ Desculpe, você não possui acesso ativo a esta funcionalidade. Verifique seus dados de cadastro.",
      delayTyping: 2
    });
    
    return res.status(200).json({ message: 'Usuário sem acesso' });
  }

  functions.logger.info('✅ Usuário validado', { 
    userId: user.id,
    uid: user.uid,
    nome: user.nome,
    role: user.role
  });

  // Enviar mensagem de confirmação de recebimento
  await zapiService.sendText({
    phone: messageInfo.phone,
    message: "✅ Mensagem recebida! Estou processando sua solicitação de relatório policial. Isso pode levar alguns minutos...",
    delayTyping: 1
  });

  try {
    // Gerar relatório policial usando as APIs existentes
    const reportResult = await generatePoliceReport(messageInfo.message);

    // Criar mensagens para salvar no histórico
    const mensagens = [
      {
        id: Date.now().toString(),
        texto: messageInfo.message,
        remetente: 'usuario',
        data: new Date()
      },
      {
        id: (Date.now() + 1).toString(),
        texto: reportResult.relatorio,
        remetente: 'ia',
        data: new Date()
      }
    ];

    // Salvar relatório na coleção consultas
    const consultaId = await userService.saveReportToConsultas(user.uid, {
      assunto: reportResult.assunto,
      mensagens: mensagens,
      relatorio: reportResult.relatorio,
      analise: reportResult.analise,
      qualificacoes: reportResult.qualificacoes || []
    });

    // Enviar o relatório completo via WhatsApp dividido em múltiplas mensagens se necessário
    await sendCompleteReportViaWhatsApp(messageInfo.phone, reportResult.relatorio, reportResult.assunto);

    // Registrar interação
    await userService.logInteraction(user.id, {
      message: messageInfo.message,
      response: reportResult.relatorio,
      phone: messageInfo.phone,
      timestamp: messageInfo.timestamp,
      assistantData: {
        tipo: 'relatorio_policial',
        consultaId: consultaId,
        assunto: reportResult.assunto
      }
    });

    // Atualizar último acesso
    await userService.updateLastAccess(user.id);

    functions.logger.info('✅ Relatório policial processado com sucesso', {
      userId: user.id,
      uid: user.uid,
      consultaId: consultaId,
      messageId: messageInfo.messageId
    });

    return res.status(200).json({ 
      message: 'Relatório gerado com sucesso',
      userId: user.id,
      consultaId: consultaId,
      assunto: reportResult.assunto
    });

  } catch (reportError) {
    functions.logger.error('❌ Erro ao gerar relatório policial', reportError);
    
    // Enviar mensagem de erro ao usuário
    await zapiService.sendText({
      phone: messageInfo.phone,
      message: "❌ Ocorreu um erro ao processar seu relatório. Tente novamente em alguns minutos ou entre em contato com o suporte.",
      delayTyping: 2
    });

    throw reportError;
  }
}

/**
 * Função para migrar dados dos clientes para users (executar uma vez)
 */
export const migrateClientes = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Verificar se é uma requisição GET para segurança
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido. Use GET.' });
      }

      const mockClientes = [
        {
          nome: "Dra. Maria Silva Santos",
          telefone_principal: "5511999991234",
          email: "maria.silva@email.com",
          profissao: "Psicóloga Clínica",
          psicologo: "SIM",
          data_nascimento: "1985-03-15",
          ativo: true,
          cpfcnpj: "123.456.789-01",
          crp: "06/123456"
        },
        {
          nome: "João Carlos Mendes", 
          telefone_principal: "5521987654321",
          email: "joao.mendes@gmail.com",
          profissao: "Estudante de Psicologia",
          psicologo: "NÃO",
          data_nascimento: "1990-07-22",
          ativo: true,
          cpfcnpj: "987.654.321-09"
        },
        {
          nome: "Ana Paula Rodrigues",
          telefone_principal: "5531977778888", 
          email: "ana.rodrigues@hotmail.com",
          profissao: "Psicóloga Organizacional",
          psicologo: "SIM",
          data_nascimento: "1982-11-08",
          ativo: true,
          cpfcnpj: "456.789.123-45",
          crp: "04/987654"
        },
        {
          nome: "Roberto Lima Pereira",
          telefone_principal: "5551998887777",
          email: "roberto.pereira@yahoo.com", 
          profissao: "Neuropsicólogo",
          psicologo: "SIM",
          data_nascimento: "1978-05-30",
          ativo: true,
          cpfcnpj: "789.123.456-78",
          crp: "07/456789"
        },
        {
          nome: "Carla Beatriz Oliveira",
          telefone_principal: "5585987651234",
          email: "carla.oliveira@uol.com.br",
          profissao: "Pedagoga",
          psicologo: "NÃO", 
          data_nascimento: "1993-09-18",
          ativo: true,
          cpfcnpj: "321.654.987-12"
        },
        {
          nome: "Dr. Fernando Santos Costa",
          telefone_principal: "5571991234567",
          email: "fernando.costa@gmail.com",
          profissao: "Psicólogo Clínico",
          psicologo: "SIM",
          data_nascimento: "1980-12-03", 
          ativo: true,
          cpfcnpj: "654.321.789-56",
          crp: "03/654321"
        },
        {
          nome: "Vhibyana Ribeiro",
          telefone_principal: "553496532322",
          email: "vhibyana@galvant.com",
          profissao: "Psicóloga Clínica e Terapia Cognitiva",
          psicologo: "SIM",
          data_nascimento: "1992-08-14",
          ativo: true,
          cpfcnpj: "789.456.123-89", 
          crp: "04/789456"
        }
      ];

      const db = admin.firestore();
      const results = [];

      functions.logger.info('🚀 Iniciando migração de clientes', { 
        total: mockClientes.length 
      });

      // Inserir cada cliente
      for (const cliente of mockClientes) {
        const clienteData = {
          nome: cliente.nome,
          telefone_principal: cliente.telefone_principal,
          email: cliente.email,
          profissao: cliente.profissao || 'Não informado',
          psicologo: cliente.psicologo || 'NÃO',
          data_nascimento: cliente.data_nascimento || null,
          ativo: cliente.ativo !== false,
          cpfcnpj: cliente.cpfcnpj || '',
          crp: cliente.crp || '',
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        // Usar um ID único
        const docRef = db.collection('clientes').doc();
        await docRef.set(clienteData);
        
        results.push({
          id: docRef.id,
          nome: cliente.nome,
          telefone: cliente.telefone_principal
        });

        functions.logger.info('✅ Cliente cadastrado', { 
          nome: cliente.nome,
          telefone: cliente.telefone_principal,
          docId: docRef.id
        });
      }

      // Verificar quantos documentos existem agora
      const snapshot = await db.collection('clientes').get();

      functions.logger.info('🎉 Migração concluída', { 
        clientesInseridos: mockClientes.length,
        totalDocumentos: snapshot.size
      });

      return res.status(200).json({
        success: true,
        message: 'Migração concluída com sucesso',
        clientesInseridos: mockClientes.length,
        totalDocumentosNaColecao: snapshot.size,
        clientes: results
      });

    } catch (error) {
      functions.logger.error('❌ Erro na migração de clientes', error);
      
      return res.status(500).json({
        success: false,
        error: 'Erro na migração',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
});

/**
 * Função para resetar thread de OpenAI de um cliente
 */
export const resetClientThread = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
      }

      const { clienteId, phone } = req.body;

      if (!clienteId && !phone) {
        return res.status(400).json({ 
          error: 'Parâmetro "clienteId" ou "phone" é obrigatório' 
        });
      }

      let cliente: Cliente | null = null;

      if (clienteId) {
        // Buscar por ID
        const clienteDoc = await admin.firestore().collection('clientes').doc(clienteId).get();
        if (clienteDoc.exists) {
          const clienteData = clienteDoc.data() as Omit<Cliente, 'id'>;
          cliente = { id: clienteDoc.id, ...clienteData };
        }
      } else if (phone) {
        // Buscar por telefone
        cliente = await clienteService.findByPhone(phone);
      }

      if (!cliente) {
        return res.status(404).json({ 
          error: 'Cliente não encontrado',
          searched: { clienteId, phone }
        });
      }

      // Resetar thread
      const newThreadId = await openaiService.resetClientThread(cliente.id);

      functions.logger.info('🔄 Thread resetado via API', { 
        clienteId: cliente.id,
        nome: cliente.nome,
        newThreadId
      });

      return res.status(200).json({
        success: true,
        message: 'Thread resetado com sucesso',
        cliente: {
          id: cliente.id,
          nome: cliente.nome,
          telefone: cliente.telefone_principal
        },
        newThreadId
      });

    } catch (error) {
      functions.logger.error('❌ Erro ao resetar thread', error);
      
      return res.status(500).json({
        success: false,
        error: 'Erro ao resetar thread',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
}); 

// Exportar webhook do Asaas
export { asaasWebhook }; 