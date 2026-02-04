import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';

export interface AssistantResponse {
  reply: string;
  identified_course_id: string | null;
  psychology_topic: string | null;
  out_of_scope: boolean;
}

export class OpenAIService {
  private openai: OpenAI | null = null;
  private assistantId: string = 'asst_KgrDjTfAWIXH7m4x1xyNivEq';
  private db: admin.firestore.Firestore | undefined;

  constructor() {
    try {
      const apiKey = functions.config().openai?.api_key;
      this.assistantId = functions.config().openai?.assistant_id || 'asst_KgrDjTfAWIXH7m4x1xyNivEq';

      if (!apiKey) {
        functions.logger.warn('⚠️ OpenAI API key não configurada. As funcionalidades de IA não estarão disponíveis.');
        this.openai = null;
        return;
      }

      this.openai = new OpenAI({
        apiKey: apiKey
      });
    } catch (error) {
      functions.logger.warn('⚠️ Erro ao carregar configuração OpenAI. Modo offline.', error);
      this.openai = null;
    }
  }

  private ensureOpenAI(): OpenAI {
    if (!this.openai) {
      throw new Error('OpenAI não configurado. Verifique as variáveis de ambiente.');
    }
    return this.openai;
  }

  private getDb(): admin.firestore.Firestore {
    if (!this.db) {
      this.db = admin.firestore();
    }
    return this.db;
  }

  /**
   * Busca ou cria um thread para o cliente
   */
  async getOrCreateThread(clienteId: string): Promise<string> {
    try {
      // Buscar thread existente no Firestore
      const clienteRef = this.getDb().collection('clientes').doc(clienteId);
      const clienteDoc = await clienteRef.get();
      
      if (clienteDoc.exists) {
        const clienteData = clienteDoc.data();
        
        if (clienteData?.openai_thread_id) {
          // Verificar se o thread ainda existe na OpenAI
          try {
            await this.ensureOpenAI().beta.threads.retrieve(clienteData.openai_thread_id);
            
            functions.logger.info('✅ Thread existente encontrado', { 
              clienteId, 
              threadId: clienteData.openai_thread_id 
            });
            
            return clienteData.openai_thread_id;
          } catch (error) {
            functions.logger.warn('⚠️ Thread não existe mais na OpenAI, criando novo', { 
              clienteId, 
              oldThreadId: clienteData.openai_thread_id 
            });
          }
        }
      }

      // Criar novo thread
      const thread = await this.ensureOpenAI().beta.threads.create();
      
      functions.logger.info('🆕 Novo thread criado', { 
        clienteId, 
        threadId: thread.id 
      });

      // Salvar thread ID no Firestore
      await clienteRef.update({
        openai_thread_id: thread.id,
        thread_created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      return thread.id;
    } catch (error) {
      functions.logger.error('❌ Erro ao gerenciar thread', error);
      throw error;
    }
  }

  /**
   * Envia mensagem para o assistente OpenAI usando thread persistente
   */
  async processMessage(message: string, clientContext: string, clienteId: string): Promise<AssistantResponse> {
    try {
      functions.logger.info('🤖 Processando mensagem com OpenAI', {
        assistantId: this.assistantId,
        messageLength: message.length,
        hasContext: !!clientContext,
        clienteId
      });

      // Obter thread do cliente
      const threadId = await this.getOrCreateThread(clienteId);

      // Preparar mensagem com contexto (apenas na primeira mensagem do contexto)
      const fullMessage = clientContext ? `${clientContext}\n\nMensagem: ${message}` : message;

      // Adicionar mensagem à thread
      await this.ensureOpenAI().beta.threads.messages.create(threadId, {
        role: 'user',
        content: fullMessage
      });

      functions.logger.info('📨 Mensagem adicionada ao thread', { 
        threadId, 
        messageLength: fullMessage.length 
      });

      // Executar assistente com instruções específicas
      const run = await this.ensureOpenAI().beta.threads.runs.createAndPoll(threadId, {
        assistant_id: this.assistantId
      });

      functions.logger.info('✅ Assistente executado', { 
        status: run.status, 
        threadId 
      });

      if (run.status === 'failed') {
        throw new Error(`Execução do assistente falhou: ${run.last_error?.message || 'Erro desconhecido'}`);
      }

      if (run.status !== 'completed') {
        throw new Error(`Execução não completou. Status: ${run.status}`);
      }

      // Buscar mensagens da thread
      const messages = await this.ensureOpenAI().beta.threads.messages.list(threadId);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');

      if (!assistantMessage) {
        throw new Error('Nenhuma resposta encontrada do assistente');
      }

      // Extrair texto da resposta
      const content = assistantMessage.content[0];
      if (content.type !== 'text') {
        throw new Error('Tipo de resposta não suportado');
      }

      const responseText = content.text.value;
      functions.logger.info('📥 Resposta recebida do assistente', { 
        responseLength: responseText.length,
        threadId
      });

      // Tentar fazer parse do JSON
      try {
        const parsedResponse: AssistantResponse = JSON.parse(responseText);
        
        // Atualizar estatísticas do thread
        await this.updateThreadStats(clienteId, threadId);

        return parsedResponse;
      } catch (jsonError) {
        functions.logger.warn('⚠️ Resposta não é JSON válido, criando estrutura', {
          error: jsonError
        });

        // Fallback: criar estrutura baseada na análise da mensagem
        return this.createFallbackResponse(message, responseText, clientContext);
      }

    } catch (error) {
      functions.logger.error('❌ Erro ao processar com OpenAI', error);
      
      // Fallback para erro de API
      return this.createFallbackResponse(message, '', clientContext);
    }
  }

  /**
   * Atualiza estatísticas do thread
   */
  private async updateThreadStats(clienteId: string, threadId: string): Promise<void> {
    try {
      const clienteRef = this.getDb().collection('clientes').doc(clienteId);
      await clienteRef.update({
        thread_last_used: admin.firestore.FieldValue.serverTimestamp(),
        thread_message_count: admin.firestore.FieldValue.increment(1),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      functions.logger.warn('⚠️ Erro ao atualizar estatísticas do thread', error);
      // Não falhar o processo principal
    }
  }

  /**
   * Reseta o thread de um cliente (cria um novo)
   */
  async resetClientThread(clienteId: string): Promise<string> {
    try {
      // Criar novo thread
      const thread = await this.ensureOpenAI().beta.threads.create();
      
      functions.logger.info('🔄 Thread resetado para cliente', { 
        clienteId, 
        newThreadId: thread.id 
      });

      // Atualizar no Firestore
      const clienteRef = this.getDb().collection('clientes').doc(clienteId);
      await clienteRef.update({
        openai_thread_id: thread.id,
        thread_created_at: admin.firestore.FieldValue.serverTimestamp(),
        thread_reset_count: admin.firestore.FieldValue.increment(1),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      return thread.id;
    } catch (error) {
      functions.logger.error('❌ Erro ao resetar thread', error);
      throw error;
    }
  }

  /**
   * Cria resposta de fallback quando a API falha ou retorna formato inválido
   */
  private createFallbackResponse(
    message: string, 
    originalReply: string,
    clientContext?: string
  ): AssistantResponse {
    const lowerMessage = message.toLowerCase();
    
    // Identificar tópico de psicologia
    let psychologyTopic: string | null = null;
    if (lowerMessage.includes('ansiedade') || lowerMessage.includes('nervoso')) {
      psychologyTopic = 'ansiedade';
    } else if (lowerMessage.includes('depressão') || lowerMessage.includes('triste')) {
      psychologyTopic = 'depressão';
    } else if (lowerMessage.includes('estresse')) {
      psychologyTopic = 'estresse';
    } else if (lowerMessage.includes('terapia') || lowerMessage.includes('psicoterapia')) {
      psychologyTopic = 'psicoterapia';
    } else if (lowerMessage.includes('relacionamento') || lowerMessage.includes('casal')) {
      psychologyTopic = 'relacionamentos';
    }

    // Identificar curso
    let identifiedCourse: string | null = null;
    if (lowerMessage.includes('curso') || lowerMessage.includes('formação')) {
      if (lowerMessage.includes('ansiedade') || lowerMessage.includes('tcc')) {
        identifiedCourse = 'curso_tcc_ansiedade';
      } else if (lowerMessage.includes('depressão')) {
        identifiedCourse = 'curso_depressao';
      } else if (lowerMessage.includes('casal')) {
        identifiedCourse = 'curso_terapia_casal';
      } else {
        identifiedCourse = 'curso_geral_psicologia';
      }
    }

    // Gerar resposta inteligente
    let reply = originalReply;
    if (!reply) {
      const clientName = this.extractClientName(clientContext);
      reply = `Olá ${clientName}! Recebi sua mensagem e estou aqui para ajudá-lo com qualquer questão que tenha. Como posso ajudar você hoje?`;
    }

    return {
      reply,
      identified_course_id: identifiedCourse,
      psychology_topic: psychologyTopic,
      out_of_scope: false
    };
  }

  /**
   * Extrai nome do cliente do contexto
   */
  private extractClientName(context?: string): string {
    if (!context) return 'Prezado(a)';
    
    const lines = context.split('\n');
    const clienteLine = lines.find(line => line.startsWith('Cliente:'));
    
    if (clienteLine) {
      const name = clienteLine.replace('Cliente:', '').trim();
      const firstName = name.split(' ')[0];
      return firstName || 'Prezado(a)';
    }
    
    return 'Prezado(a)';
  }
}

// Instância singleton
export const openaiService = new OpenAIService(); 