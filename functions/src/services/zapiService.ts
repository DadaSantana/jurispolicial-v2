import * as functions from 'firebase-functions';

// Interfaces para Z-API
export interface ZApiConfig {
  instanceId: string;
  token: string;
  clientToken: string;
  baseUrl: string;
}

export interface ZApiSendTextRequest {
  phone: string;
  message: string;
  delayMessage?: number;
  delayTyping?: number;
}

export interface ZApiSendTextResponse {
  zaapId: string;
  messageId: string;
  id: string;
}

export interface ZApiWebhookPayload {
  isStatusReply: boolean;
  senderLid: string;
  connectedPhone: string;
  waitingMessage: boolean;
  isEdit: boolean;
  isGroup: boolean;
  isNewsletter: boolean;
  instanceId: string;
  messageId: string;
  phone: string;
  fromMe: boolean;
  momment: number;
  status: string;
  chatName: string;
  senderPhoto: string;
  senderName: string;
  participantPhone: string | null;
  participantLid: string | null;
  photo: string;
  broadcast: boolean;
  type: string;
  text: {
    message: string;
    descritpion?: string;
    title?: string;
    url?: string;
    thumbnailUrl?: string;
  };
}

export class ZApiService {
  private config: ZApiConfig | null = null;

  constructor() {
    try {
      // Configuração a partir das variáveis de ambiente do Firebase
      this.config = {
        instanceId: functions.config().zapi?.instance_id || '',
        token: functions.config().zapi?.token || '',
        clientToken: functions.config().zapi?.client_token || '',
        baseUrl: 'https://api.z-api.io'
      };

      if (!this.config.instanceId || !this.config.token || !this.config.clientToken) {
        functions.logger.warn('⚠️ Configuração Z-API incompleta. As funcionalidades de WhatsApp não estarão disponíveis.');
        this.config = null;
      }
    } catch (error) {
      functions.logger.warn('⚠️ Erro ao carregar configuração Z-API. Modo offline.', error);
      this.config = null;
    }
  }

  private ensureConfig(): ZApiConfig {
    if (!this.config) {
      throw new Error('Z-API não configurado. Verifique as variáveis de ambiente.');
    }
    return this.config;
  }

  /**
   * Envia uma mensagem de texto via Z-API
   */
  async sendText(request: ZApiSendTextRequest): Promise<ZApiSendTextResponse> {
    const config = this.ensureConfig();
    const url = `${config.baseUrl}/instances/${config.instanceId}/token/${config.token}/send-text`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Client-Token': config.clientToken
    };

    const body = {
      phone: request.phone,
      message: request.message,
      ...(request.delayMessage && { delayMessage: request.delayMessage }),
      ...(request.delayTyping && { delayTyping: request.delayTyping })
    };

    functions.logger.info('🚀 Enviando mensagem via Z-API', {
      phone: request.phone,
      messageLength: request.message.length,
      url
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Z-API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      functions.logger.info('✅ Mensagem enviada com sucesso', {
        zaapId: result.zaapId,
        messageId: result.messageId
      });

      return result;
    } catch (error) {
      functions.logger.error('❌ Erro ao enviar mensagem via Z-API', error);
      throw error;
    }
  }

  /**
   * Formata número de telefone para o padrão Z-API
   */
  formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Se não começar com 55 (Brasil), adiciona
    if (!cleanPhone.startsWith('55')) {
      return `55${cleanPhone}`;
    }
    
    return cleanPhone;
  }

  /**
   * Valida se o webhook payload é uma mensagem recebida válida
   */
  isValidReceivedMessage(payload: ZApiWebhookPayload): boolean {
    return (
      payload.type === 'ReceivedCallback' &&
      !payload.fromMe &&
      payload.status === 'RECEIVED' &&
      !payload.isGroup &&
      !payload.isNewsletter &&
      Boolean(payload.text?.message) &&
      Boolean(payload.phone)
    );
  }

  /**
   * Extrai informações essenciais do webhook payload
   */
  extractMessageInfo(payload: ZApiWebhookPayload) {
    return {
      phone: payload.phone,
      message: payload.text.message,
      senderName: payload.senderName || payload.chatName,
      messageId: payload.messageId,
      timestamp: new Date(payload.momment),
      instanceId: payload.instanceId
    };
  }
}

// Instância singleton
export const zapiService = new ZApiService(); 