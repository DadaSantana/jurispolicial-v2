
import { db } from '@/lib/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

// Stripe product IDs
export const STRIPE_PRODUCTS = {
  MONTHLY: 'prod_Rv5BKzklzzN8TY',
  QUARTERLY: 'prod_Rv5BQCIBSKtfWA',
  BIANNUAL: 'prod_Rv5BecHr1RyOUx',
  ANNUAL: 'prod_Rv5BwM0irfxVVe',
  TEST: 'prod_RuDg0xy0SmJgve',
};

// Map plan IDs to Stripe product IDs
export const PLAN_TO_PRODUCT_MAP = {
  mensal: STRIPE_PRODUCTS.MONTHLY,
  trimestral: STRIPE_PRODUCTS.QUARTERLY,
  semestral: STRIPE_PRODUCTS.BIANNUAL,
  anual: STRIPE_PRODUCTS.ANNUAL,
  teste: STRIPE_PRODUCTS.TEST,
};

// Create checkout session
export const createCheckoutSession = async (
  userId: string, 
  planId: string, 
  userEmail: string
) => {
  try {
    // Mapping to Stripe product IDs
    const productId = PLAN_TO_PRODUCT_MAP[planId as keyof typeof PLAN_TO_PRODUCT_MAP];
    
    if (!productId) {
      throw new Error(`Invalid plan: ${planId}`);
    }

    // For local development without a real server endpoint, create a mock response
    // This is a temporary solution until the server endpoint is set up
    if (process.env.NODE_ENV === 'development' || !window.location.origin.includes('jurispolicial')) {
      console.log('Development mode: Simulating checkout session creation');
      
      // Mock a successful response to avoid the unexpected token error
      // In production, this would be replaced with a real API call
      
      // Instead of redirecting, we'll show a success message and redirect to dashboard
      toast({
        title: 'Modo de teste',
        description: 'Checkout simulado com sucesso. Em produção, você seria redirecionado para o Stripe.',
      });
      
      // Update user subscription data directly (for testing only)
      await updateUserSubscription(userId, {
        planId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'ativo',
        stripeSubscriptionId: 'test_subscription_' + Date.now(),
        stripeCustomerId: 'test_customer_' + userId,
      });
      
      // Redirect to dashboard with success parameter
      setTimeout(() => {
        window.location.href = `${window.location.origin}/dashboard?success=true&test=true`;
      }, 1500);
      
      return { success: true };
    }

    // In production, continue with the real API call
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        productId,
        planId,
        userEmail,
        successUrl: `${window.location.origin}/dashboard?success=true`,
        cancelUrl: `${window.location.origin}?canceled=true`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create checkout session');
    }

    const { url } = await response.json();
    
    // Redirect to Stripe Checkout
    window.location.href = url;
    
    return { success: true };
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    toast({
      title: 'Erro no checkout',
      description: error.message || 'Não foi possível iniciar o processo de pagamento',
      variant: 'destructive'
    });
    return { 
      success: false, 
      error: error.message || 'Failed to create checkout session' 
    };
  }
};

// Update user subscription status
export const updateUserSubscription = async (
  userId: string,
  subscriptionDetails: {
    planId: string;
    startDate: Date;
    endDate: Date;
    status: 'ativo' | 'inativo' | 'trial';
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
  }
) => {
  try {
    const userRef = doc(db, 'usuarios', userId);
    
    await updateDoc(userRef, {
      plano: subscriptionDetails
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error updating user subscription:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to update user subscription' 
    };
  }
};

// Store webhook event for audit
export const storeWebhookEvent = async (event: any) => {
  try {
    // Create a unique ID for the webhook event
    const eventId = `${event.id}-${Date.now()}`;
    const webhookRef = doc(db, 'webhooks', eventId);
    
    await setDoc(webhookRef, {
      stripeEventId: event.id,
      type: event.type,
      created: new Date(event.created * 1000),
      data: event.data.object,
      processedAt: new Date(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error storing webhook event:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to store webhook event' 
    };
  }
};
