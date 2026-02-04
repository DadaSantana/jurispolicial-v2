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

        // Validar método de pagamento
        const validBillingType = billingType === 'PIX' ? 'PIX' : 'CREDIT_CARD';
        // Para desenvolvimento local, usar http://localhost:3000
        const YOUR_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 
                           process.env.ASAAS_DOMAIN || 
                           (process.env.NODE_ENV === 'development' 
                             ? 'http://localhost:3000' 
                             : 'https://jurispolicial.com.br');

        // Validações
        if (!userId || !email) {
            return new Response(JSON.stringify({ 
                error: 'userId e email são obrigatórios' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Buscar dados do usuário do Firestore
        let userName = nome;
        let userCpf = cpf || ''; // Usar CPF da requisição primeiro
        
        try {
            const userRef = doc(db, 'usuarios', userId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();
                userName = userData.nome || nome || email?.split('@')[0] || 'Cliente';
                // Usar CPF da requisição, senão buscar do Firestore
                userCpf = cpf || userData.cpf || userData.cpfCnpj || '';
            } else {
                // Se não encontrou no Firestore, usar CPF da requisição se fornecido
                if (cpf) {
                    userCpf = cpf;
                }
            }
        } catch (dbError) {
            console.error('Erro ao buscar usuário:', dbError);
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
            return new Response(JSON.stringify({ 
                error: 'CPF/CNPJ é obrigatório para pagamento via PIX. Por favor, complete seu cadastro com o CPF.',
                requiresCpf: true
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Criar ou buscar cliente no Asaas
        const customerId = await createOrGetCustomer(
            email,
            userName,
            userCpf || undefined,
            undefined
        );

        // Configuração do plano anual
        const planConfig = PLAN_TO_ASAAS_CONFIG.anual;
        const planType = 'anual';

        // Calcular data do próximo vencimento (365 dias a partir de hoje)
        const nextDueDate = new Date();
        nextDueDate.setDate(nextDueDate.getDate() + 365);
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
        const successUrl = `${YOUR_DOMAIN}/dashboard/subscription/success?subscription=${subscription.id}&userId=${userId}&planType=${planType}`;

        // A assinatura pode retornar uma URL de pagamento diretamente
        // Se não tiver, criar um pagamento vinculado à assinatura com callback
        let paymentUrl = subscription.invoiceUrl || subscription.bankSlipUrl || '';

        if (!paymentUrl) {
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
        } else {
            // Criar pagamento com callback mesmo se a assinatura retornou URL
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

            paymentUrl = payment.invoiceUrl || paymentUrl;
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
