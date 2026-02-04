import { asaasRequest } from '@/lib/asaas';
import { db } from '@/lib/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';

// Tipos para a API do Asaas
export interface AsaasCustomer {
  id?: string;
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
}

export interface AsaasPayment {
  id?: string;
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'DEBIT_CARD';
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string;
  subscription?: string; // ID da assinatura para vincular o pagamento
  installmentCount?: number;
  installmentValue?: number;
  callback?: {
    successUrl?: string;
    autoRedirect?: boolean;
  };
}

export interface AsaasSubscription {
  id?: string;
  customer: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'DEBIT_CARD';
  value: number;
  nextDueDate: string; // YYYY-MM-DD
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  description?: string;
  externalReference?: string;
}

export interface AsaasCheckoutItem {
  name: string;
  description: string;
  quantity: number;
  value: number;
}

export interface AsaasCheckoutCallback {
  successUrl: string;
  cancelUrl: string;
  expiredUrl: string;
  autoRedirect?: boolean;
}

export interface AsaasCheckout {
  id?: string;
  name: string;
  description?: string;
  billingTypes: string[];
  chargeTypes: string[];
  items: AsaasCheckoutItem[];
  value?: number;
  dueDate?: string;
  customer?: string;
  subscription?: string;
  externalReference?: string;
  callback: AsaasCheckoutCallback;
  backUrl?: string;
  minutesToExpire?: number;
}

// Função auxiliar para formatar CPF/CNPJ (remover pontos, traços e espaços)
const formatCpfCnpj = (cpfCnpj: string): string => {
  return cpfCnpj.replace(/[.\-\s]/g, '');
};

// Criar ou buscar cliente no Asaas
export const createOrGetCustomer = async (
  email: string,
  name: string,
  cpfCnpj?: string,
  phone?: string
): Promise<string> => {
  try {
    // Formatar CPF/CNPJ se fornecido
    const formattedCpfCnpj = cpfCnpj ? formatCpfCnpj(cpfCnpj) : undefined;

    // Primeiro, tentar buscar cliente existente por email
    const searchResponse = await asaasRequest(`/customers?email=${encodeURIComponent(email)}`, {
      method: 'GET',
    });

    if (searchResponse.data && searchResponse.data.length > 0) {
      const existingCustomer = searchResponse.data[0];
      
      // Se o cliente existe mas não tem CPF e foi fornecido, atualizar
      if (formattedCpfCnpj && !existingCustomer.cpfCnpj) {
        try {
          await asaasRequest(`/customers/${existingCustomer.id}`, {
            method: 'PUT',
            body: JSON.stringify({ cpfCnpj: formattedCpfCnpj }),
          });
        } catch (updateError) {
          console.error('Erro ao atualizar CPF do cliente existente:', updateError);
        }
      }
      
      return existingCustomer.id;
    }

    // Se não existir, criar novo cliente
    const customerData: AsaasCustomer = {
      name,
      email,
      ...(formattedCpfCnpj && { cpfCnpj: formattedCpfCnpj }),
      ...(phone && { phone }),
    };

    const response = await asaasRequest('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });

    return response.id;
  } catch (error: any) {
    console.error('Erro ao criar/buscar cliente no Asaas:', error);
    throw error;
  }
};

// Criar checkout para assinatura ou produto
export const createCheckout = async (
  checkoutData: AsaasCheckout
): Promise<{ id: string; url: string }> => {
  try {
    console.log('Criando checkout no Asaas com dados:', JSON.stringify(checkoutData, null, 2));
    
    const response = await asaasRequest('/checkouts', {
      method: 'POST',
      body: JSON.stringify(checkoutData),
    });

    console.log('Resposta do Asaas:', response);

    if (!response.id || !response.url) {
      throw new Error('Resposta do Asaas não contém id ou url');
    }

    return {
      id: response.id,
      url: response.url,
    };
  } catch (error: any) {
    console.error('Erro ao criar checkout no Asaas:', error);
    console.error('Dados enviados:', JSON.stringify(checkoutData, null, 2));
    throw error;
  }
};

// Criar assinatura recorrente
export const createSubscription = async (
  subscriptionData: AsaasSubscription
): Promise<{ id: string; status: string; invoiceUrl?: string; bankSlipUrl?: string }> => {
  try {
    console.log('Criando assinatura no Asaas com dados:', JSON.stringify(subscriptionData, null, 2));
    
    const response = await asaasRequest('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscriptionData),
    });

    console.log('Resposta da assinatura do Asaas:', response);

    return {
      id: response.id,
      status: response.status,
      invoiceUrl: response.invoiceUrl,
      bankSlipUrl: response.bankSlipUrl,
    };
  } catch (error: any) {
    console.error('Erro ao criar assinatura no Asaas:', error);
    console.error('Dados enviados:', JSON.stringify(subscriptionData, null, 2));
    throw error;
  }
};

// Criar pagamento único (para produtos)
export const createPayment = async (
  paymentData: AsaasPayment
): Promise<{ id: string; status: string; invoiceUrl?: string }> => {
  try {
    // Validar e limpar callback se existir
    if (paymentData.callback?.successUrl) {
      try {
        // Validar URL
        const urlObj = new URL(paymentData.callback.successUrl);
        // Garantir que a URL está bem formatada
        paymentData.callback.successUrl = urlObj.toString();
        
        console.log('🔗 Callback configurado e validado:', {
          successUrl: paymentData.callback.successUrl,
          autoRedirect: paymentData.callback.autoRedirect,
          dominio: urlObj.hostname,
          protocolo: urlObj.protocol
        });
      } catch (urlError) {
        console.error('❌ Erro ao validar URL do callback:', urlError);
        throw new Error(`URL de callback inválida: ${paymentData.callback.successUrl}`);
      }
    }
    
    console.log('💳 Criando pagamento no Asaas:', JSON.stringify(paymentData, null, 2));
    
    const response = await asaasRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });

    console.log('✅ Resposta do pagamento Asaas:', {
      id: response.id,
      status: response.status,
      invoiceUrl: response.invoiceUrl,
      callback: paymentData.callback
    });

    return {
      id: response.id,
      status: response.status,
      invoiceUrl: response.invoiceUrl,
    };
  } catch (error: any) {
    console.error('Erro ao criar pagamento no Asaas:', error);
    throw error;
  }
};

// Cancelar assinatura
export const cancelSubscription = async (
  subscriptionId: string
): Promise<{ success: boolean }> => {
  try {
    await asaasRequest(`/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
    });

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao cancelar assinatura no Asaas:', error);
    throw error;
  }
};

// Criar reembolso
export const createRefund = async (
  paymentId: string,
  value?: number,
  description?: string
): Promise<{ id: string; status: string }> => {
  try {
    const refundData: any = {};
    if (value) refundData.value = value;
    if (description) refundData.description = description;

    const response = await asaasRequest(`/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify(refundData),
    });

    return {
      id: response.id,
      status: response.status,
    };
  } catch (error: any) {
    console.error('Erro ao criar reembolso no Asaas:', error);
    throw error;
  }
};

// Obter status de pagamento
export const getPaymentStatus = async (
  paymentId: string
): Promise<{ status: string; value: number; dueDate: string }> => {
  try {
    const response = await asaasRequest(`/payments/${paymentId}`, {
      method: 'GET',
    });

    return {
      status: response.status,
      value: response.value,
      dueDate: response.dueDate,
    };
  } catch (error: any) {
    console.error('Erro ao obter status de pagamento no Asaas:', error);
    throw error;
  }
};

// Obter status de assinatura
export const getSubscriptionStatus = async (
  subscriptionId: string
): Promise<{ status: string; value: number; nextDueDate: string }> => {
  try {
    const response = await asaasRequest(`/subscriptions/${subscriptionId}`, {
      method: 'GET',
    });

    return {
      status: response.status,
      value: response.value,
      nextDueDate: response.nextDueDate,
    };
  } catch (error: any) {
    console.error('Erro ao obter status de assinatura no Asaas:', error);
    throw error;
  }
};

// Atualizar assinatura do usuário no Firestore
export const updateUserSubscription = async (
  userId: string,
  subscriptionDetails: {
    planId: string;
    startDate: Date;
    endDate: Date;
    status: 'ativo' | 'inativo' | 'trial' | 'cancelado';
    asaasSubscriptionId?: string;
    asaasCustomerId?: string;
  }
) => {
  try {
    const userRef = doc(db, 'usuarios', userId);
    
    // Converter planId para tipo e ajustar estrutura
    await updateDoc(userRef, {
      plano: {
        tipo: subscriptionDetails.planId,
        inicio: subscriptionDetails.startDate,
        termino: subscriptionDetails.endDate,
        status: subscriptionDetails.status,
        asaasSubscriptionId: subscriptionDetails.asaasSubscriptionId,
        asaasCustomerId: subscriptionDetails.asaasCustomerId,
      }
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao atualizar assinatura do usuário:', error);
    return { 
      success: false, 
      error: error.message || 'Falha ao atualizar assinatura do usuário' 
    };
  }
};

// Mapear planos para configurações do Asaas
export const PLAN_TO_ASAAS_CONFIG = {
  mensal: {
    value: 29.90,
    cycle: 'MONTHLY' as const,
    description: 'Plano Mensal - JurisPolicial',
  },
  trimestral: {
    value: 49.90,
    cycle: 'QUARTERLY' as const,
    description: 'Plano Trimestral - JurisPolicial',
  },
  semestral: {
    value: 99.90,
    cycle: 'SEMIANNUALLY' as const,
    description: 'Plano Semestral - JurisPolicial',
  },
  anual: {
    value: 199.90,
    cycle: 'YEARLY' as const,
    description: 'Plano Anual - JurisPolicial',
  },
  teste: {
    value: 0.01,
    cycle: 'MONTHLY' as const,
    description: 'Plano de Teste - JurisPolicial',
  },
};

// IDs dos produtos Asaas (serão criados no painel do Asaas)
export const ASAAS_PRODUCTS = {
  MONTHLY: 'prod_Rv5BKzklzzN8TY',
  QUARTERLY: 'prod_Rv5BQCIBSKtfWA',
  BIANNUAL: 'prod_Rv5BecHr1RyOUx',
  ANNUAL: 'prod_Rv5BwM0irfxVVe',
  TEST: 'prod_RuDg0xy0SmJgve',
};

// Mapear planos para IDs de produtos
export const PLAN_TO_PRODUCT_MAP = {
  mensal: ASAAS_PRODUCTS.MONTHLY,
  trimestral: ASAAS_PRODUCTS.QUARTERLY,
  semestral: ASAAS_PRODUCTS.BIANNUAL,
  anual: ASAAS_PRODUCTS.ANNUAL,
  teste: ASAAS_PRODUCTS.TEST,
};

