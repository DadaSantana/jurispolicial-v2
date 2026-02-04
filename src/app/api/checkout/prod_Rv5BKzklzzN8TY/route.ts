import { createOrGetCustomer, createSubscription, createPayment, PLAN_TO_ASAAS_CONFIG, updateUserSubscription } from '@/services/asaasService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Função auxiliar para calcular data de término baseado no tipo de plano
const calculateEndDate = (planType: string): Date => {
  const now = new Date();
  switch (planType) {
    case 'teste':
      return new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 dia
    case 'mensal':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias
    case 'trimestral':
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 dias
    case 'semestral':
      return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 180 dias
    case 'anual':
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 365 dias
    default:
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
};

export async function POST(request: any) {
    try {
        const body = await request.json();
        const { userId, return_link, email, nome, billingType, cpf } = body;
        
        console.log('📥 Dados recebidos na API:', {
            userId,
            email,
            nome,
            billingType,
            cpf,
            todosOsCampos: Object.keys(body)
        });
        // Obter domínio das variáveis de ambiente ou usar padrão
        // IMPORTANTE: Este domínio deve estar cadastrado nas informações comerciais do Asaas
        // Para desenvolvimento local, usar http://localhost:3000
        const YOUR_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 
                           process.env.ASAAS_DOMAIN || 
                           (process.env.NODE_ENV === 'development' 
                             ? 'http://localhost:3000' 
                             : 'https://jurispolicial.com.br');
        
        console.log('🌐 Domínio configurado:', YOUR_DOMAIN);
        console.log('📋 Variáveis de ambiente:', {
            NODE_ENV: process.env.NODE_ENV,
            NEXT_PUBLIC_DOMAIN: process.env.NEXT_PUBLIC_DOMAIN,
            ASAAS_DOMAIN: process.env.ASAAS_DOMAIN
        });

        // Validações
        if (!userId || !email) {
            return new Response(JSON.stringify({ 
                error: 'userId e email são obrigatórios' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validar método de pagamento
        const validBillingType = billingType === 'PIX' ? 'PIX' : 'CREDIT_CARD';

        // Buscar dados do usuário do Firestore
        let userName = nome;
        let userCpf = cpf || ''; // Usar CPF da requisição primeiro
        
        try {
            const userRef = doc(db, 'usuarios', userId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Log detalhado dos dados do usuário
                console.log('📋 Dados do usuário encontrados no Firestore:', {
                    userId,
                    email,
                    nome: userData.nome,
                    cpf: userData.cpf,
                    cpfCnpj: userData.cpfCnpj,
                    todosOsCampos: Object.keys(userData),
                    dadosCompletos: userData
                });
                
                userName = userData.nome || nome || email?.split('@')[0] || 'Cliente';
                // Usar CPF da requisição, senão buscar do Firestore
                userCpf = cpf || userData.cpf || userData.cpfCnpj || '';
                
                console.log('✅ Dados processados:', {
                    userName,
                    userCpf,
                    cpfDaRequisicao: cpf,
                    cpfDoFirestore: userData.cpf || userData.cpfCnpj,
                    temCpf: !!userCpf,
                    cpfFormatado: userCpf ? userCpf.replace(/[.\-\s]/g, '') : 'N/A'
                });
            } else {
                console.warn('⚠️ Usuário não encontrado no Firestore:', userId);
                // Se não encontrou no Firestore, usar CPF da requisição se fornecido
                if (cpf) {
                    userCpf = cpf;
                }
            }
        } catch (dbError) {
            console.error('❌ Erro ao buscar usuário:', dbError);
            // Em caso de erro, usar CPF da requisição se fornecido
            if (cpf) {
                userCpf = cpf;
            }
        }

        if (!userName) {
            userName = nome || email?.split('@')[0] || 'Cliente';
        }

        // Para PIX, CPF/CNPJ é obrigatório
        if (validBillingType === 'PIX' && !userCpf) {
            console.error('🚫 PIX selecionado mas CPF não encontrado:', {
                userId,
                email,
                billingType: validBillingType,
                userCpf,
                userName
            });
            
            return new Response(JSON.stringify({ 
                error: 'CPF/CNPJ é obrigatório para pagamento via PIX. Por favor, complete seu cadastro com o CPF.',
                requiresCpf: true
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        console.log('💳 Método de pagamento:', {
            billingType: validBillingType,
            temCpf: !!userCpf,
            cpf: userCpf ? userCpf.replace(/[.\-\s]/g, '') : 'N/A'
        });

        // Criar ou buscar cliente no Asaas
        console.log('🔍 Criando/buscando cliente no Asaas:', {
            email,
            userName,
            cpf: userCpf || 'não fornecido',
            cpfFormatado: userCpf ? userCpf.replace(/[.\-\s]/g, '') : 'N/A'
        });
        
        const customerId = await createOrGetCustomer(
            email,
            userName,
            userCpf || undefined,
            undefined
        );
        
        console.log('✅ Cliente Asaas ID:', customerId);


        // Configuração do plano mensal
        const planConfig = PLAN_TO_ASAAS_CONFIG.mensal;
        const planType = 'mensal';

        // Calcular data do próximo vencimento (30 dias a partir de hoje)
        const nextDueDate = new Date();
        nextDueDate.setDate(nextDueDate.getDate() + 30);
        const nextDueDateStr = nextDueDate.toISOString().split('T')[0]; // YYYY-MM-DD

        // Criar assinatura no Asaas
        const subscription = await createSubscription({
            customer: customerId,
            billingType: validBillingType,
            value: planConfig.value,
            nextDueDate: nextDueDateStr,
            cycle: planConfig.cycle,
            description: planConfig.description,
            externalReference: userId,
        });

        // URL de sucesso para redirecionar após pagamento confirmado
        // IMPORTANTE: A URL deve usar o mesmo domínio cadastrado nas informações comerciais do Asaas
        // Garantir que a URL está bem formatada (sem barras duplas, com protocolo correto)
        let successUrl = `${YOUR_DOMAIN.replace(/\/$/, '')}/dashboard/subscription/success?subscription=${subscription.id}&userId=${userId}&planType=${planType}`;
        
        // Validar e corrigir a URL
        try {
            const urlObj = new URL(successUrl);
            successUrl = urlObj.toString();
            console.log('✅ URL de sucesso configurada e validada:', successUrl);
            console.log('🔍 Detalhes da URL:', {
                url: successUrl,
                dominio: urlObj.hostname,
                protocolo: urlObj.protocol,
                pathname: urlObj.pathname,
                search: urlObj.search
            });
        } catch (urlError) {
            console.error('❌ Erro ao validar URL:', urlError);
            // Tentar corrigir removendo caracteres inválidos
            successUrl = successUrl.replace(/\s/g, '');
        }

        // A assinatura pode retornar uma URL de pagamento diretamente
        // Se não tiver, criar um pagamento vinculado à assinatura
        let paymentUrl = subscription.invoiceUrl || subscription.bankSlipUrl || '';

        if (!paymentUrl) {
            // Criar um pagamento vinculado à assinatura
            // Tentar com callback primeiro, se falhar, criar sem callback
            try {
                console.log('💳 Criando pagamento com callback:', {
                    customer: customerId,
                    value: planConfig.value,
                    billingType: validBillingType,
                    successUrl
                });
                
                const payment = await createPayment({
                    customer: customerId,
                    billingType: validBillingType,
                    value: planConfig.value,
                    dueDate: nextDueDateStr,
                    description: planConfig.description,
                    externalReference: userId,
                    subscription: subscription.id, // Vincular pagamento à assinatura
                    callback: {
                        successUrl: successUrl,
                        autoRedirect: true,
                    },
                });

                paymentUrl = payment.invoiceUrl || '';
                console.log('✅ Pagamento com callback criado, URL:', paymentUrl);
            } catch (callbackError: any) {
                console.warn('⚠️ Erro ao criar pagamento com callback, criando sem callback:', callbackError.message);
                
                // Se falhar com callback, criar sem callback
                const payment = await createPayment({
                    customer: customerId,
                    billingType: validBillingType,
                    value: planConfig.value,
                    dueDate: nextDueDateStr,
                    description: planConfig.description,
                    externalReference: userId,
                    subscription: subscription.id, // Vincular pagamento à assinatura
                });

                paymentUrl = payment.invoiceUrl || '';
                console.log('✅ Pagamento criado sem callback, URL:', paymentUrl);
            }
        } else {
            // Se a assinatura já retornou URL, não precisamos criar pagamento adicional
            // A assinatura já gerará os pagamentos automaticamente
            console.log('✅ Usando URL da assinatura:', paymentUrl);
            console.log('ℹ️ O webhook atualizará o status quando o pagamento for confirmado.');
        }

        // Atualizar assinatura do usuário (será confirmada via webhook)
        const startDate = new Date();
        const endDate = calculateEndDate(planType);

        await updateUserSubscription(userId, {
            planId: planType,
            startDate,
            endDate,
            status: 'trial', // Status inicial, será atualizado quando pagamento for confirmado
            asaasSubscriptionId: subscription.id,
            asaasCustomerId: customerId,
        });

        // CRIAR MAPEAMENTO PAYMENT -> USER para o webhook
        // Salvar na coleção 'asaas_payments' para o webhook encontrar o usuário
        try {
            const admin = await import('firebase-admin');
            
            // Salvar mapeamento do pagamento que será criado
            await admin.firestore().collection('asaas_payments').doc(`mapping_${userId}_${subscription.id}`).set({
                userId: userId,
                email: email,
                nome: userName,
                planType: planType,
                subscriptionId: subscription.id,
                customerId: customerId,
                value: planConfig.value,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'pending'
            });

            console.log('💾 Mapeamento salvo para webhook:', {
                userId,
                subscriptionId: subscription.id,
                planType,
                customerId
            });
        } catch (mappingError) {
            console.error('❌ Erro ao salvar mapeamento:', mappingError);
            // Continuar mesmo se não conseguir salvar o mapeamento
        }

        // Se não tiver URL de pagamento, redirecionar para o dashboard com mensagem
        if (!paymentUrl) {
            return new Response(JSON.stringify({ 
                url: `${YOUR_DOMAIN}/dashboard/subscription/success?subscription=${subscription.id}&userId=${userId}`,
                message: 'Assinatura criada. Você receberá um e-mail com as instruções de pagamento.'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ url: paymentUrl }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        console.error('Erro no checkout:', err);
        const errorMessage = err.message || 'Erro ao processar checkout';
        
        return new Response(JSON.stringify({ 
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
