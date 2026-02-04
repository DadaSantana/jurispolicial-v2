import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';

const corsHandler = cors({ origin: true });

// Tipos de eventos do Asaas
interface AsaasWebhookEvent {
  event: string;
  payment?: {
    id: string;
    customer: string;
    subscription?: string;
    value: number;
    netValue: number;
    originalValue: number;
    interestValue: number;
    description: string;
    billingType: string;
    status: string;
    dueDate: string;
    originalDueDate: string;
    paymentDate?: string;
    clientPaymentDate?: string;
    installmentNumber?: number;
    invoiceUrl: string;
    bankSlipUrl?: string;
    transactionReceiptUrl?: string;
    invoiceNumber: string;
    externalReference?: string;
  };
  subscription?: {
    id: string;
    customer: string;
    billingType: string;
    value: number;
    nextDueDate: string;
    cycle: string;
    description: string;
    status: string;
    externalReference?: string;
  };
}

// Função auxiliar para calcular data de término baseado no tipo de plano
const calculateEndDate = (planType: string, startDate: Date): Date => {
  switch (planType) {
    case 'teste':
      return new Date(startDate.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 dia
    case 'mensal':
      return new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias
    case 'trimestral':
      return new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 dias
    case 'semestral':
      return new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000); // 180 dias
    case 'anual':
      return new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 365 dias
    default:
      return new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
};

// Mapear status do Asaas para status interno
const mapAsaasStatusToInternal = (asaasStatus: string): 'ativo' | 'inativo' | 'cancelado' => {
  switch (asaasStatus.toUpperCase()) {
    case 'CONFIRMED':
    case 'RECEIVED':
    case 'RECEIVED_IN_CASH':
      return 'ativo';
    case 'OVERDUE':
    case 'PENDING':
    case 'AWAITING_RISK_ANALYSIS':
      return 'inativo';
    case 'REFUNDED':
    case 'CANCELLED':
    case 'DELETED':
      return 'cancelado';
    default:
      return 'inativo';
  }
};

// Função auxiliar para parsear externalReference
const parseExternalReference = (externalRef: string | undefined): {
  userId: string | null;
  type: 'course' | 'product' | 'subscription' | 'unknown';
  resourceId: string | null;
} => {
  if (!externalRef) {
    return { userId: null, type: 'unknown', resourceId: null };
  }

  // Formato: userId_course_courseId
  if (externalRef.includes('_course_')) {
    const parts = externalRef.split('_course_');
    return {
      userId: parts[0] || null,
      type: 'course',
      resourceId: parts[1] || null,
    };
  }

  // Formato: userId_productId (sem prefixo)
  // Verificar se tem underscore e não começa com padrão de assinatura
  const parts = externalRef.split('_');
  if (parts.length === 2 && !externalRef.match(/^(mensal|trimestral|semestral|anual|teste)/)) {
    // Provavelmente é produto: userId_productId
    return {
      userId: parts[0] || null,
      type: 'product',
      resourceId: parts[1] || null,
    };
  }

  // Se não tem padrão específico, pode ser assinatura ou userId direto
  if (parts.length === 1) {
    return {
      userId: externalRef,
      type: 'subscription',
      resourceId: null,
    };
  }

  // Fallback: assumir que é userId direto
  return {
    userId: externalRef,
    type: 'subscription',
    resourceId: null,
  };
};

// Processar evento de pagamento aprovado
const handlePaymentReceived = async (event: AsaasWebhookEvent) => {
  if (!event.payment) {
    functions.logger.warn('⚠️ Evento sem payment', { event: event.event });
    return;
  }

  const payment = event.payment;
  const parsedRef = parseExternalReference(payment.externalReference);
  let userId = parsedRef.userId;
  let planType = 'mensal';
  let subscriptionId = null;

  functions.logger.info('🔍 BUSCANDO USUÁRIO PARA PAGAMENTO:', {
    paymentId: payment.id,
    customer: payment.customer,
    externalReference: payment.externalReference,
    parsedType: parsedRef.type,
    parsedUserId: parsedRef.userId,
    parsedResourceId: parsedRef.resourceId,
    value: payment.value
  });

  // ESTRATÉGIA 1: Usar externalReference parseado se existir
  if (userId) {
    functions.logger.info('✅ userId encontrado no externalReference:', userId);
    
    // Buscar planType na coleção asaas_payments usando subscriptionId ou customerId
    try {
      // Primeiro tentar buscar por subscriptionId se existir
      if (payment.subscription) {
        const subscriptionQuery = await admin.firestore()
          .collection('asaas_payments')
          .where('subscriptionId', '==', payment.subscription)
          .limit(1)
          .get();
        
        if (!subscriptionQuery.empty) {
          const paymentData = subscriptionQuery.docs[0].data();
          planType = paymentData.planType || planType;
          subscriptionId = paymentData.subscriptionId || payment.subscription;
          
          functions.logger.info('✅ Dados encontrados na coleção asaas_payments por subscriptionId:', {
            userId,
            planType,
            subscriptionId,
            subscriptionIdFromPayment: payment.subscription
          });
        }
      }
      
      // Se não encontrou por subscriptionId, buscar por customerId
      if (!subscriptionId || planType === 'mensal') {
        const customerQuery = await admin.firestore()
          .collection('asaas_payments')
          .where('customerId', '==', payment.customer)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();
        
        if (!customerQuery.empty) {
          const paymentData = customerQuery.docs[0].data();
          if (paymentData.planType) {
            planType = paymentData.planType;
          }
          if (paymentData.subscriptionId && !subscriptionId) {
            subscriptionId = paymentData.subscriptionId;
          }
          
          functions.logger.info('✅ Dados encontrados na coleção asaas_payments por customerId:', {
            userId,
            planType,
            subscriptionId,
            customerId: payment.customer
          });
        }
      }
    } catch (error) {
      functions.logger.error('❌ Erro ao buscar planType na coleção asaas_payments:', error);
    }
  } else {
    // ESTRATÉGIA 2: Buscar na coleção asaas_payments pelo customerId
    try {
      const paymentsSnapshot = await admin.firestore()
        .collection('asaas_payments')
        .where('customerId', '==', payment.customer)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (!paymentsSnapshot.empty) {
        const paymentData = paymentsSnapshot.docs[0].data();
        userId = paymentData.userId;
        planType = paymentData.planType || 'mensal';
        subscriptionId = paymentData.subscriptionId;
        
        functions.logger.info('✅ Dados encontrados na coleção asaas_payments:', {
          userId,
          planType,
          subscriptionId,
          customerId: payment.customer
        });
      }
    } catch (error) {
      functions.logger.error('❌ Erro ao buscar na coleção asaas_payments:', error);
    }

    // ESTRATÉGIA 3: Buscar usuário pelo asaasCustomerId
    if (!userId) {
      try {
        const usersSnapshot = await admin.firestore()
          .collection('usuarios')
          .where('plano.asaasCustomerId', '==', payment.customer)
          .limit(1)
          .get();
        
        if (!usersSnapshot.empty) {
          userId = usersSnapshot.docs[0].id;
          const userData = usersSnapshot.docs[0].data();
          planType = userData.plano?.tipo || 'mensal';
          subscriptionId = userData.plano?.asaasSubscriptionId;
          
          functions.logger.info('✅ userId encontrado pelo asaasCustomerId:', {
            userId,
            planType,
            subscriptionId,
            customerId: payment.customer
          });
        }
      } catch (error) {
        functions.logger.error('❌ Erro ao buscar userId pelo customer:', error);
      }
    }
  }

  if (!userId) {
    functions.logger.error('❌ USUÁRIO NÃO ENCONTRADO PARA PAGAMENTO:', { 
      paymentId: payment.id,
      customer: payment.customer,
      externalReference: payment.externalReference,
      eventData: JSON.stringify(event, null, 2)
    });
    return;
  }
  
  functions.logger.info('🔍 PROCESSANDO PAGAMENTO CONFIRMADO:', {
    userId,
    paymentId: payment.id,
    paymentType: parsedRef.type,
    resourceId: parsedRef.resourceId,
    planType,
    subscriptionId,
    value: payment.value,
    status: payment.status
  });

  try {
    const userRef = admin.firestore().collection('usuarios').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      functions.logger.warn('⚠️ Usuário não encontrado', { userId, paymentId: payment.id });
      return;
    }
    
    functions.logger.info('✅ Usuário encontrado no Firestore', {
      userId,
      paymentId: payment.id,
      currentPlanStatus: userDoc.data()?.plano?.status,
      currentPlanType: userDoc.data()?.plano?.tipo
    });

    // PROCESSAR PAGAMENTO DE CURSO
    if (parsedRef.type === 'course' && parsedRef.resourceId) {
      functions.logger.info('📚 Processando pagamento de curso:', {
        userId,
        courseId: parsedRef.resourceId,
        paymentId: payment.id
      });

      try {
        // Verificar se já existe progresso
        const progressQuery = await admin.firestore()
          .collection('userCourseProgress')
          .where('userId', '==', userId)
          .where('courseId', '==', parsedRef.resourceId)
          .limit(1)
          .get();

        if (progressQuery.empty) {
          // Criar progresso do curso
          await admin.firestore().collection('userCourseProgress').add({
            userId,
            courseId: parsedRef.resourceId,
            progresso: 0,
            aulasCompletas: [],
            dataInicio: admin.firestore.FieldValue.serverTimestamp(),
            certificadoGerado: false,
            paymentId: payment.id,
            paymentDate: admin.firestore.Timestamp.fromDate(
              payment.paymentDate ? new Date(payment.paymentDate) : new Date()
            ),
          });

          functions.logger.info('✅ Progresso do curso criado:', {
            userId,
            courseId: parsedRef.resourceId,
            paymentId: payment.id
          });
        } else {
          functions.logger.info('ℹ️ Progresso do curso já existe:', {
            userId,
            courseId: parsedRef.resourceId
          });
        }

        // Registrar evento de webhook
        await admin.firestore().collection('webhooks').add({
          event: event.event,
          paymentId: payment.id,
          userId,
          type: 'course',
          courseId: parsedRef.resourceId,
          status: payment.status,
          value: payment.value,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return; // Não processar como assinatura
      } catch (error) {
        functions.logger.error('❌ Erro ao processar pagamento de curso', {
          error,
          userId,
          courseId: parsedRef.resourceId,
          paymentId: payment.id,
        });
        throw error;
      }
    }

    // PROCESSAR PAGAMENTO DE PRODUTO
    if (parsedRef.type === 'product' && parsedRef.resourceId) {
      functions.logger.info('🛍️ Processando pagamento de produto:', {
        userId,
        productId: parsedRef.resourceId,
        paymentId: payment.id
      });

      try {
        // Registrar compra do produto
        await admin.firestore().collection('productPurchases').add({
          userId,
          productId: parsedRef.resourceId,
          paymentId: payment.id,
          value: payment.value,
          status: 'completed',
          purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
          paymentDate: payment.paymentDate 
            ? admin.firestore.Timestamp.fromDate(new Date(payment.paymentDate))
            : admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.info('✅ Compra de produto registrada:', {
          userId,
          productId: parsedRef.resourceId,
          paymentId: payment.id
        });

        // Registrar evento de webhook
        await admin.firestore().collection('webhooks').add({
          event: event.event,
          paymentId: payment.id,
          userId,
          type: 'product',
          productId: parsedRef.resourceId,
          status: payment.status,
          value: payment.value,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return; // Não processar como assinatura
      } catch (error) {
        functions.logger.error('❌ Erro ao processar pagamento de produto', {
          error,
          userId,
          productId: parsedRef.resourceId,
          paymentId: payment.id,
        });
        throw error;
      }
    }

    // PROCESSAR PAGAMENTO DE ASSINATURA (ou pagamento sem tipo específico)
    functions.logger.info('💳 Processando pagamento de assinatura:', {
      userId,
      paymentId: payment.id,
      hasSubscription: !!payment.subscription,
      subscriptionId,
      planType,
      value: payment.value
    });

    // Determinar tipo de plano baseado no valor ou dados existentes
    // O planType já foi buscado anteriormente da coleção asaas_payments, mas vamos verificar novamente
    let finalPlanType = planType;
    let finalSubscriptionId = payment.subscription || subscriptionId || null;
    
    try {
      // Se ainda não temos planType definido, buscar do usuário atual ou determinar pelo valor
      const currentUserData = userDoc.data();
      if (!finalPlanType || finalPlanType === 'mensal') {
        if (currentUserData?.plano?.tipo) {
          finalPlanType = currentUserData.plano.tipo;
          functions.logger.info('📋 Tipo de plano obtido do usuário:', { planType: finalPlanType, userId });
        } else {
          // Determinar tipo de plano baseado no valor (fallback)
          if (payment.value >= 199.90) finalPlanType = 'anual';
          else if (payment.value >= 99.90) finalPlanType = 'semestral';
          else if (payment.value >= 49.90) finalPlanType = 'trimestral';
          else if (payment.value >= 29.90) finalPlanType = 'mensal';
          else finalPlanType = 'teste';
          
          functions.logger.info('📋 Tipo de plano determinado pelo valor:', { 
            planType: finalPlanType, 
            value: payment.value,
            userId 
          });
        }
      }
      
      // Se não temos subscriptionId do pagamento, buscar do usuário atual ou da coleção
      if (!finalSubscriptionId) {
        if (currentUserData?.plano?.asaasSubscriptionId) {
          finalSubscriptionId = currentUserData.plano.asaasSubscriptionId;
          functions.logger.info('📋 SubscriptionId obtido do usuário:', { subscriptionId: finalSubscriptionId, userId });
        } else if (subscriptionId) {
          finalSubscriptionId = subscriptionId;
          functions.logger.info('📋 SubscriptionId obtido da busca anterior:', { subscriptionId: finalSubscriptionId, userId });
        }
      }
    } catch (error) {
      functions.logger.warn('⚠️ Erro ao determinar tipo de plano, usando padrão', error);
    }
    
    // Usar os valores finais
    planType = finalPlanType;
    subscriptionId = finalSubscriptionId;

    const startDate = payment.paymentDate 
      ? new Date(payment.paymentDate) 
      : (payment.clientPaymentDate ? new Date(payment.clientPaymentDate) : new Date());
    const endDate = calculateEndDate(planType, startDate);

    // Preparar dados de atualização
    const currentData = userDoc.data();
    
    const planData = {
      tipo: planType,
      inicio: admin.firestore.Timestamp.fromDate(startDate),
      termino: admin.firestore.Timestamp.fromDate(endDate),
      status: 'ativo',
      asaasCustomerId: payment.customer,
      // Preservar campos existentes se houver
      ...(currentData?.plano?.stripeSubscriptionId && { stripeSubscriptionId: currentData.plano.stripeSubscriptionId }),
      ...(currentData?.plano?.stripeCustomerId && { stripeCustomerId: currentData.plano.stripeCustomerId }),
      // Adicionar subscriptionId se existir
      ...(subscriptionId && { asaasSubscriptionId: subscriptionId }),
    };

    // Usar set com merge para garantir que funciona mesmo que o documento não tenha plano
    await userRef.set({
      plano: planData
    }, { merge: true });
    
    // Verificar se a atualização foi bem-sucedida
    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data();
    
    functions.logger.info('🔍 Verificando atualização:', {
      userId,
      documentExists: updatedDoc.exists,
      updatedStatus: updatedData?.plano?.status,
      updatedType: updatedData?.plano?.tipo,
      updatedSubscriptionId: updatedData?.plano?.asaasSubscriptionId,
      updatedCustomerId: updatedData?.plano?.asaasCustomerId,
      allPlanoData: updatedData?.plano
    });

    functions.logger.info('✅ Pagamento confirmado - assinatura ativada', {
      userId,
      subscriptionId,
      planType,
      paymentId: payment.id,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      planData
    });

    // Registrar evento de webhook
    await admin.firestore().collection('webhooks').add({
      event: event.event,
      paymentId: payment.id,
      userId,
      type: 'subscription',
      status: payment.status,
      value: payment.value,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    functions.logger.error('❌ Erro ao processar pagamento recebido', {
      error,
      userId,
      paymentId: payment.id,
    });
    throw error;
  }
};

// Processar evento de assinatura criada
const handleSubscriptionCreated = async (event: AsaasWebhookEvent) => {
  if (!event.subscription) return;

  const subscription = event.subscription;
  const userId = subscription.externalReference;

  if (!userId) {
    functions.logger.warn('⚠️ Assinatura sem externalReference (userId)', {
      subscriptionId: subscription.id,
    });
    return;
  }

  try {
    const userRef = admin.firestore().collection('usuarios').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      functions.logger.warn('⚠️ Usuário não encontrado ao criar assinatura', { 
        userId, 
        subscriptionId: subscription.id 
      });
      return;
    }
    
    // Usar set com merge para garantir que funciona
    await userRef.set({
      plano: {
        asaasSubscriptionId: subscription.id,
        asaasCustomerId: subscription.customer,
        // Preservar campos existentes
        ...(userDoc.data()?.plano || {}),
      }
    }, { merge: true });

    functions.logger.info('✅ Assinatura registrada', {
      userId,
      subscriptionId: subscription.id,
      customer: subscription.customer,
    });
  } catch (error) {
    functions.logger.error('❌ Erro ao processar assinatura criada', {
      error,
      userId,
      subscriptionId: subscription.id,
    });
  }
};

// Processar evento de assinatura atualizada
const handleSubscriptionUpdated = async (event: AsaasWebhookEvent) => {
  if (!event.subscription) return;

  const subscription = event.subscription;
  const userId = subscription.externalReference;

  if (!userId) return;

  try {
    const userRef = admin.firestore().collection('usuarios').doc(userId);
    const status = mapAsaasStatusToInternal(subscription.status);

    await userRef.update({
      'plano.status': status,
      'plano.termino': admin.firestore.Timestamp.fromDate(
        new Date(subscription.nextDueDate)
      ),
    });

    functions.logger.info('✅ Assinatura atualizada', {
      userId,
      subscriptionId: subscription.id,
      status,
    });
  } catch (error) {
    functions.logger.error('❌ Erro ao processar assinatura atualizada', {
      error,
      userId,
      subscriptionId: subscription.id,
    });
  }
};

// Processar evento de assinatura cancelada
const handleSubscriptionDeleted = async (event: AsaasWebhookEvent) => {
  if (!event.subscription) return;

  const subscription = event.subscription;
  const userId = subscription.externalReference;

  if (!userId) return;

  try {
    const userRef = admin.firestore().collection('usuarios').doc(userId);
    await userRef.update({
      'plano.status': 'cancelado',
    });

    functions.logger.info('✅ Assinatura cancelada', {
      userId,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    functions.logger.error('❌ Erro ao processar assinatura cancelada', {
      error,
      userId,
      subscriptionId: subscription.id,
    });
  }
};

// Processar evento de reembolso
const handlePaymentRefunded = async (event: AsaasWebhookEvent) => {
  if (!event.payment) return;

  const payment = event.payment;
  const userId = payment.externalReference;

  if (!userId) return;

  try {
    const userRef = admin.firestore().collection('usuarios').doc(userId);
    await userRef.update({
      'plano.status': 'cancelado',
    });

    functions.logger.info('✅ Reembolso processado', {
      userId,
      paymentId: payment.id,
    });
  } catch (error) {
    functions.logger.error('❌ Erro ao processar reembolso', {
      error,
      userId,
      paymentId: payment.id,
    });
  }
};

// Processar evento de pagamento em atraso
const handlePaymentOverdue = async (event: AsaasWebhookEvent) => {
  if (!event.payment) return;

  const payment = event.payment;
  const userId = payment.externalReference;

  if (!userId) return;

  try {
    const userRef = admin.firestore().collection('usuarios').doc(userId);
    await userRef.update({
      'plano.status': 'inativo',
    });

    functions.logger.info('⚠️ Pagamento em atraso', {
      userId,
      paymentId: payment.id,
    });
  } catch (error) {
    functions.logger.error('❌ Erro ao processar pagamento em atraso', {
      error,
      userId,
      paymentId: payment.id,
    });
  }
};

// Webhook principal do Asaas
export const asaasWebhook = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
      }

      const event: AsaasWebhookEvent = req.body;

      if (!event.event) {
        return res.status(400).json({ error: 'Evento não especificado' });
      }

      functions.logger.info('📨 Webhook do Asaas recebido', {
        event: event.event,
        paymentId: event.payment?.id,
        subscriptionId: event.subscription?.id,
        paymentExternalReference: event.payment?.externalReference,
        subscriptionExternalReference: event.subscription?.externalReference,
        bodyCompleto: JSON.stringify(req.body, null, 2),
      });

      // PROCESSAR TODOS OS PAGAMENTOS CONFIRMADOS DIRETAMENTE
      if (event.event === 'PAYMENT_CONFIRMED' && event.payment?.externalReference) {
        functions.logger.info('🔥 PROCESSAMENTO DIRETO DE PAYMENT_CONFIRMED');
        
        const parsedRef = parseExternalReference(event.payment.externalReference);
        const userId = parsedRef.userId;
        
        if (!userId) {
          functions.logger.error('❌ Não foi possível extrair userId do externalReference:', {
            externalReference: event.payment.externalReference
          });
          return res.status(200).json({ received: true, processed: false });
        }

        // Se for curso ou produto, processar através da função handlePaymentReceived
        if (parsedRef.type === 'course' || parsedRef.type === 'product') {
          functions.logger.info('🔥 Processando curso/produto via handlePaymentReceived');
          await handlePaymentReceived(event);
          return res.status(200).json({ received: true, processed: true });
        }

        // Se for assinatura, processar diretamente
        const userRef = admin.firestore().collection('usuarios').doc(userId);
        
        // Buscar planType na coleção asaas_payments
        let planType = 'mensal';
        let subscriptionId = event.payment.subscription || null;
        
        try {
          // Buscar por subscriptionId primeiro
          if (subscriptionId) {
            const subscriptionQuery = await admin.firestore()
              .collection('asaas_payments')
              .where('subscriptionId', '==', subscriptionId)
              .limit(1)
              .get();
            
            if (!subscriptionQuery.empty) {
              const paymentData = subscriptionQuery.docs[0].data();
              planType = paymentData.planType || planType;
              functions.logger.info('✅ PlanType encontrado por subscriptionId:', { planType, subscriptionId });
            }
          }
          
          // Se não encontrou, buscar por customerId
          if (planType === 'mensal') {
            const customerQuery = await admin.firestore()
              .collection('asaas_payments')
              .where('customerId', '==', event.payment.customer)
              .orderBy('createdAt', 'desc')
              .limit(1)
              .get();
            
            if (!customerQuery.empty) {
              const paymentData = customerQuery.docs[0].data();
              planType = paymentData.planType || planType;
              if (paymentData.subscriptionId && !subscriptionId) {
                subscriptionId = paymentData.subscriptionId;
              }
              functions.logger.info('✅ PlanType encontrado por customerId:', { planType, customerId: event.payment.customer });
            }
          }
          
          // Fallback: determinar pelo valor
          if (planType === 'mensal') {
            if (event.payment.value >= 199.90) planType = 'anual';
            else if (event.payment.value >= 99.90) planType = 'semestral';
            else if (event.payment.value >= 49.90) planType = 'trimestral';
            else if (event.payment.value >= 29.90) planType = 'mensal';
            else planType = 'teste';
            functions.logger.info('📋 PlanType determinado pelo valor:', { planType, value: event.payment.value });
          }
        } catch (error) {
          functions.logger.error('❌ Erro ao buscar planType:', error);
          // Fallback pelo valor
          if (event.payment.value >= 199.90) planType = 'anual';
          else if (event.payment.value >= 99.90) planType = 'semestral';
          else if (event.payment.value >= 49.90) planType = 'trimestral';
          else if (event.payment.value >= 29.90) planType = 'mensal';
          else planType = 'teste';
        }
        
        const startDate = event.payment.clientPaymentDate 
          ? new Date(event.payment.clientPaymentDate) 
          : new Date();
        const endDate = calculateEndDate(planType, startDate);
        
        // Forçar atualização direta
        await userRef.set({
          plano: {
            tipo: planType,
            inicio: admin.firestore.Timestamp.fromDate(startDate),
            termino: admin.firestore.Timestamp.fromDate(endDate),
            status: 'ativo',
            asaasCustomerId: event.payment.customer,
            // Adicionar subscriptionId se existir
            ...(subscriptionId && { asaasSubscriptionId: subscriptionId }),
          }
        }, { merge: true });
        
        functions.logger.info('🔥 PLANO ATIVADO DIRETAMENTE:', {
          userId,
          planType,
          subscriptionId,
          paymentId: event.payment.id,
          customerId: event.payment.customer,
          value: event.payment.value,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
        
        return res.status(200).json({ received: true, processed: true });
      }

      // Processar eventos
      switch (event.event) {
        case 'PAYMENT_RECEIVED':
        case 'PAYMENT_CONFIRMED':
          // Pagamento recebido/confirmado - ativar assinatura ou produto
          await handlePaymentReceived(event);
          break;

        case 'PAYMENT_CREATED':
          // Pagamento criado (ainda não confirmado) - apenas log
          functions.logger.info('ℹ️ Pagamento criado (aguardando confirmação)', {
            paymentId: event.payment?.id,
            status: event.payment?.status,
            externalReference: event.payment?.externalReference
          });
          break;

        case 'PAYMENT_REFUNDED':
        case 'PAYMENT_PARTIALLY_REFUNDED':
          // Reembolso processado
          await handlePaymentRefunded(event);
          break;

        case 'PAYMENT_OVERDUE':
          // Pagamento em atraso
          await handlePaymentOverdue(event);
          break;

        case 'SUBSCRIPTION_CREATED':
          // Assinatura criada
          await handleSubscriptionCreated(event);
          break;

        case 'SUBSCRIPTION_UPDATED':
          // Assinatura atualizada
          await handleSubscriptionUpdated(event);
          break;

        case 'SUBSCRIPTION_DELETED':
          // Assinatura removida/cancelada
          await handleSubscriptionDeleted(event);
          break;

        case 'SUBSCRIPTION_INACTIVATED':
          // Assinatura inativada
          await handleSubscriptionDeleted(event);
          break;

        default:
          functions.logger.info('ℹ️ Evento não processado', { event: event.event });
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      functions.logger.error('❌ Erro no processamento do webhook', error);
      return res.status(500).json({
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  });
});

