import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export interface User {
  id: string;
  uid: string;
  nome: string;
  telefone?: string;
  email?: string;
  cpf: string;
  role: 'membro' | 'admin';
  creditos: number;
  dataCriacao: Date;
  ultimoLogin: Date;
  plano?: {
    tipo: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'gratuito' | 'teste' | 'trial';
    inicio?: Date;
    termino?: Date;
    status?: 'ativo' | 'inativo' | 'trial';
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
  };
}

export class UserService {
  private db: admin.firestore.Firestore | undefined;

  constructor() {
    // DB será inicializado quando necessário
  }

  private getDb(): admin.firestore.Firestore {
    if (!this.db) {
      this.db = admin.firestore();
    }
    return this.db;
  }

  /**
   * Busca usuário por número de telefone
   */
  async findByPhone(phone: string): Promise<User | null> {
    try {
      // Formatar telefone (remover caracteres especiais)
      const cleanPhone = this.formatPhoneNumber(phone);
      
      functions.logger.info('🔍 Buscando usuário por telefone', { 
        originalPhone: phone, 
        cleanPhone 
      });

      // Buscar na coleção de users
      const usersRef = this.getDb().collection('users');
      
      // Buscar por telefone exato
      let querySnapshot = await usersRef
        .where('telefone', '==', cleanPhone)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        // Tentar buscar sem código do país se não encontrou
        const phoneWithoutCountryCode = cleanPhone.startsWith('55') 
          ? cleanPhone.substring(2) 
          : cleanPhone;
          
        querySnapshot = await usersRef
          .where('telefone', '==', phoneWithoutCountryCode)
          .limit(1)
          .get();
      }

      if (querySnapshot.empty) {
        // Tentar buscar com formatação alternativa
        const alternativeFormats = [
          cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`,
          cleanPhone.replace(/^55/, ''),
          cleanPhone.replace(/^(\d{2})(\d{2})/, '$1$2'), // DDD sem separação
        ];

        for (const altPhone of alternativeFormats) {
          if (altPhone !== cleanPhone) {
            querySnapshot = await usersRef
              .where('telefone', '==', altPhone)
              .limit(1)
              .get();
              
            if (!querySnapshot.empty) break;
          }
        }
      }

      if (querySnapshot.empty) {
        functions.logger.info('❌ Usuário não encontrado', { phone: cleanPhone });
        return null;
      }

      const doc = querySnapshot.docs[0];
      const userData = doc.data() as Omit<User, 'id'>;
      
      // IMPORTANTE: Remover o campo 'id' dos dados se existir para evitar sobreescrever doc.id
      const { id: _, ...dataWithoutId } = userData as any;
      
      const user: User = {
        id: doc.id, // ID do documento do Firestore (string válida)
        ...dataWithoutId
      };

      functions.logger.info('✅ Usuário encontrado', { 
        userId: user.id,
        uid: user.uid,
        nome: user.nome,
        role: user.role
      });

      return user;
    } catch (error) {
      functions.logger.error('❌ Erro ao buscar usuário por telefone', error);
      throw error;
    }
  }

  /**
   * Busca usuário por e-mail
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      functions.logger.info('🔍 Buscando usuário por e-mail', { email: cleanEmail });
      const usersRef = this.getDb().collection('users');
      const querySnapshot = await usersRef
        .where('email', '==', cleanEmail)
        .limit(1)
        .get();
      if (querySnapshot.empty) {
        functions.logger.info('❌ Usuário não encontrado por e-mail', { email: cleanEmail });
        return null;
      }
      const doc = querySnapshot.docs[0];
      const userData = doc.data() as Omit<User, 'id'>;
      const { id: _, ...dataWithoutId } = userData as any;
      const user: User = {
        id: doc.id,
        ...dataWithoutId
      };
      functions.logger.info('✅ Usuário encontrado por e-mail', {
        userId: user.id,
        uid: user.uid,
        nome: user.nome,
        email: user.email
      });
      return user;
    } catch (error) {
      functions.logger.error('❌ Erro ao buscar usuário por e-mail', error);
      throw error;
    }
  }

  /**
   * Verifica se o usuário está ativo e tem acesso ao sistema
   */
  async isUserActive(user: User): Promise<boolean> {
    try {
      // Verificações básicas
      const hasValidPhone = user.telefone && 
                           user.telefone.length >= 10;
      const hasValidEmail = user.email && 
                           user.email.includes('@');
      const isValidRole = user.role === 'membro' || user.role === 'admin';

      const isValid = Boolean(hasValidPhone && hasValidEmail && isValidRole);

      functions.logger.info('🔍 Validando acesso do usuário', {
        userId: user.id,
        uid: user.uid,
        hasValidPhone,
        hasValidEmail,
        isValidRole,
        isValid
      });

      return isValid;
    } catch (error) {
      functions.logger.error('❌ Erro ao validar usuário', error);
      return false;
    }
  }

  /**
   * Cria contexto do usuário para o assistente de relatórios
   */
  createUserContext(user: User): string {
    return `
Usuário: ${user.nome}
Telefone: ${user.telefone || 'Não informado'}
Email: ${user.email || 'Não informado'}
CPF: ${user.cpf}
Role: ${user.role}
Créditos: ${user.creditos}
`.trim();
  }

  /**
   * Registra interação do usuário no Firestore
   */
  async logInteraction(userId: string, messageData: {
    message: string;
    response: string;
    phone: string;
    timestamp: Date;
    assistantData?: any;
  }): Promise<void> {
    try {
      const interactionRef = this.getDb()
        .collection('users')
        .doc(userId)
        .collection('whatsapp_interactions');

      await interactionRef.add({
        ...messageData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      functions.logger.info('✅ Interação registrada', { 
        userId, 
        messageLength: messageData.message.length 
      });
    } catch (error) {
      functions.logger.error('❌ Erro ao registrar interação', error);
      // Não falhar o processo principal por erro de log
    }
  }

  /**
   * Formata número de telefone para busca
   */
  private formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    return phone.replace(/\D/g, '');
  }

  /**
   * Atualiza último acesso do usuário
   */
  async updateLastAccess(userId: string): Promise<void> {
    try {
      await this.getDb()
        .collection('users')
        .doc(userId)
        .update({
          ultimoLogin: admin.firestore.FieldValue.serverTimestamp()
        });

      functions.logger.info('✅ Último acesso atualizado', { userId });
    } catch (error) {
      functions.logger.error('❌ Erro ao atualizar último acesso', error);
      // Não falhar o processo principal
    }
  }

  /**
   * Salva relatório gerado na coleção consultas
   */
  async saveReportToConsultas(userId: string, reportData: {
    assunto: string;
    mensagens: any[];
    relatorio: string;
    analise?: string;
    qualificacoes?: any[];
  }): Promise<string> {
    try {
      const consultaRef = await this.getDb()
        .collection('consultas')
        .add({
          userId: userId,
          assunto: reportData.assunto,
          mensagens: reportData.mensagens,
          dataCriacao: admin.firestore.FieldValue.serverTimestamp(),
          tags: [],
          relatorio: reportData.relatorio,
          analise: reportData.analise || '',
          qualificacoes: reportData.qualificacoes || []
        });

      functions.logger.info('✅ Relatório salvo na coleção consultas', { 
        userId, 
        consultaId: consultaRef.id 
      });

      return consultaRef.id;
    } catch (error) {
      functions.logger.error('❌ Erro ao salvar relatório', error);
      throw error;
    }
  }
}

// Manter compatibilidade com código existente
export interface Cliente {
  id: string;
  nome: string;
  telefone_principal: string;
  email?: string;
  profissao?: string;
  psicologo?: string;
  data_nascimento?: string;
  ativo: boolean;
}

export class ClienteService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * @deprecated Use UserService.findByPhone() instead
   */
  async findByPhone(phone: string): Promise<Cliente | null> {
    const user = await this.userService.findByPhone(phone);
    if (!user) return null;
    
    // Converter User para Cliente para compatibilidade
    return {
      id: user.id,
      nome: user.nome,
      telefone_principal: user.telefone || '',
      email: user.email || undefined,
      profissao: 'Usuário do Sistema',
      psicologo: 'NÃO',
      data_nascimento: undefined,
      ativo: true
    };
  }

  /**
   * @deprecated Use UserService.isUserActive() instead
   */
  async isClienteActive(cliente: Cliente): Promise<boolean> {
    const user = await this.userService.findByPhone(cliente.telefone_principal);
    if (!user) return false;
    return this.userService.isUserActive(user);
  }

  /**
   * @deprecated Use UserService.createUserContext() instead
   */
  createClientContext(cliente: Cliente): string {
    return `
Cliente: ${cliente.nome}
Telefone: ${cliente.telefone_principal}
Email: ${cliente.email || 'Não informado'}
Profissão: ${cliente.profissao || 'Não informado'}
É Psicólogo: ${cliente.psicologo || 'Não informado'}
Data de Nascimento: ${cliente.data_nascimento || 'Não informado'}
Status: ${cliente.ativo ? 'Ativo' : 'Inativo'}
`.trim();
  }

  /**
   * @deprecated Use UserService.logInteraction() instead
   */
  async logInteraction(clienteId: string, messageData: {
    message: string;
    response: string;
    phone: string;
    timestamp: Date;
    assistantData?: any;
  }): Promise<void> {
    return this.userService.logInteraction(clienteId, messageData);
  }

  /**
   * @deprecated Use UserService.updateLastAccess() instead
   */
  async updateLastAccess(clienteId: string): Promise<void> {
    return this.userService.updateLastAccess(clienteId);
  }
}

// Instância singleton
export const clienteService = new ClienteService(); 