import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types/user';
import { differenceInDays } from 'date-fns';

// Check if a subscription is active
export const isSubscriptionActive = (user: User): boolean => {
  console.log('🔍 Verificando se assinatura está ativa:', {
    hasPlano: !!user?.plano,
    status: user?.plano?.status,
    tipo: user?.plano?.tipo,
    asaasSubscriptionId: user?.plano?.asaasSubscriptionId,
    asaasCustomerId: user?.plano?.asaasCustomerId,
    termino: user?.plano?.termino
  });

  if (!user?.plano) {
    console.log('❌ Usuário não tem plano');
    return false;
  }
  
  const { status, termino } = user.plano;
  
  // Se tem assinatura Asaas ativa, considerar ativo
  if (status === 'ativo' && (user.plano.asaasSubscriptionId || user.plano.asaasCustomerId)) {
    console.log('✅ Assinatura Asaas ativa detectada');
    return true;
  }
  
  // If no status or termination date, subscription is not active
  if (!status || !termino) {
    console.log('❌ Plano sem status ou data de término');
    return false;
  }
  
  // Check if status is active and termination date is in the future
  const isActive = status === 'ativo' || status === 'trial';
  const isValid = termino instanceof Date 
    ? termino > new Date() 
    : new Date((termino as any).seconds * 1000) > new Date();
  
  console.log('📅 Verificação por data:', {
    status,
    isActive,
    isValid,
    endDate: termino instanceof Date ? termino.toISOString() : new Date((termino as any).seconds * 1000).toISOString()
  });
  
  return isActive && isValid;
};

// Get subscription details
export const getSubscriptionDetails = (user: User) => {
  if (!user?.plano) return null;
  
  const { tipo, inicio, termino, status } = user.plano;
  
  return {
    tipo,
    inicio: inicio instanceof Date 
      ? inicio 
      : new Date((inicio as any).seconds * 1000),
    termino: termino instanceof Date 
      ? termino 
      : new Date((termino as any).seconds * 1000),
    status,
    isActive: isSubscriptionActive(user),
  };
};

// Check if user has premium access
export const hasPremiumAccess = (user: User): boolean => {
  if (!user) return false;
  
  // Admin always has access
  if (user.role === 'admin') return true;
  
  // Check subscription
  return isSubscriptionActive(user) && (
    user.plano?.tipo === 'anual' || 
    user.plano?.tipo === 'semestral' || 
    user.plano?.tipo === 'teste'
  );
};

// Check if subscription needs renewal
export const checkSubscriptionRenewal = (user: User): boolean => {
  if (!user?.plano?.termino) return false;
  
  const termino = user.plano.termino instanceof Date 
    ? user.plano.termino 
    : new Date((user.plano.termino as any).seconds * 1000);
  
  // Check if termination date is within 7 days
  const now = new Date();
  const daysUntilExpiration = Math.ceil((termino.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysUntilExpiration <= 7 && daysUntilExpiration > 0;
};

// Update subscription from URL parameters (from Asaas redirect)
export const updateSubscriptionFromUrl = async (userId: string) => {
  const urlParams = new URLSearchParams(window.location.search);
  const checkoutId = urlParams.get('checkout');
  const success = urlParams.get('success');
  
  if (checkoutId || success) {
    try {
      // Get user data
      const userDoc = await getDoc(doc(db, 'usuarios', userId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        
        // Check if subscription was updated by webhook
        if (
          userData.plano?.status === 'ativo' && 
          (userData.plano?.asaasSubscriptionId || userData.plano?.asaasCustomerId)
        ) {
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          
          return {
            success: true,
            message: 'Assinatura ativada com sucesso!',
          };
        }
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  }
  
  return { success: false };
};

// Cancel subscription and handle refund if within 7 days
export const cancelSubscription = async (user: User): Promise<{ success: boolean; message: string }> => {
  // Verificar se tem assinatura Asaas, caso contrário verificar Stripe (compatibilidade)
  const subscriptionId = user?.plano?.asaasSubscriptionId || user?.plano?.stripeSubscriptionId;
  
  if (!subscriptionId) {
    return { success: false, message: 'Assinatura não encontrada.' };
  }

  try {
    const subscriptionDetails = getSubscriptionDetails(user);
    if (!subscriptionDetails?.inicio) {
      return { success: false, message: 'Data de início da assinatura não encontrada.' };
    }

    const daysSinceStart = differenceInDays(new Date(), subscriptionDetails.inicio);
    const shouldRefund = daysSinceStart <= 7;

    // Call Asaas API to cancel subscription
    const response = await fetch('/api/cancel-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionId: subscriptionId,
        shouldRefund,
        isAsaas: !!user.plano?.asaasSubscriptionId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Falha ao cancelar assinatura');
    }

    // Update user document
    const userRef = doc(db, 'usuarios', user.uid);
    await updateDoc(userRef, {
      'plano.status': shouldRefund ? 'cancelado' : 'ativo_ate_termino',
      'plano.canceladoEm': new Date(),
    });

    if (result.warning) {
      return {
        success: true,
        message: 'Assinatura cancelada com sucesso. ' + result.warning,
      };
    }

    return {
      success: true,
      message: shouldRefund
        ? 'Assinatura cancelada com sucesso. O reembolso será processado em até 5 dias úteis.'
        : 'Assinatura cancelada com sucesso. Você terá acesso aos recursos até o final do período pago.',
    };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao cancelar assinatura. Por favor, tente novamente.',
    };
  }
};
