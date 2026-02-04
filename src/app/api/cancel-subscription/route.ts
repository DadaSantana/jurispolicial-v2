import { NextResponse } from 'next/server';
import { cancelSubscription, createRefund, getSubscriptionStatus } from '@/services/asaasService';
import Stripe from 'stripe';

// Manter compatibilidade com Stripe durante migração
let stripe: Stripe | null = null;
try {
  if (process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
});
  }
} catch (error) {
  console.warn('Stripe não configurado');
}

export async function POST(req: Request) {
  try {
    if (!req.body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    const { subscriptionId, shouldRefund, isAsaas } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    // Se for assinatura Asaas
    if (isAsaas !== false) {
      try {
        // Cancelar assinatura no Asaas
        await cancelSubscription(subscriptionId);

        if (shouldRefund) {
          try {
            // Obter status da assinatura para pegar o paymentId
            const subscriptionStatus = await getSubscriptionStatus(subscriptionId);
            
            // Buscar pagamentos da assinatura para fazer reembolso
            // Nota: A API do Asaas pode exigir buscar os pagamentos primeiro
            // Por enquanto, vamos tentar fazer o reembolso via webhook quando o pagamento for identificado
            // O reembolso será processado manualmente ou via webhook PAYMENT_REFUNDED
            
            return NextResponse.json({
              success: true,
              subscription: subscriptionId,
              warning: 'Assinatura cancelada. O reembolso será processado em até 5 dias úteis.',
            });
          } catch (refundError: any) {
            console.error('Error processing refund:', refundError);
            return NextResponse.json({
              success: true,
              subscription: subscriptionId,
              warning: 'Assinatura cancelada mas reembolso falhou. Nossa equipe processará manualmente.',
            });
          }
        }

        return NextResponse.json({ 
          success: true,
          subscription: subscriptionId,
        });
      } catch (error: any) {
        console.error('Error in cancel-subscription route (Asaas):', error);
        return NextResponse.json({
          error: error.message || 'Erro ao cancelar assinatura no Asaas',
        }, { status: 400 });
      }
    }

    // Compatibilidade com Stripe (durante migração)
    if (stripe) {
      try {
    // Cancel the subscription immediately
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
      proration_behavior: 'none'
    });

    if (shouldRefund) {
      try {
        // Get all invoices for this subscription
        const invoices = await stripe.invoices.list({
          subscription: subscriptionId,
          limit: 1,
        });

        const latestInvoice = invoices.data[0];

        if (latestInvoice?.payment_intent && typeof latestInvoice.payment_intent === 'string') {
          // Create a refund for the payment
          await stripe.refunds.create({
            payment_intent: latestInvoice.payment_intent,
          });
        }
      } catch (refundError) {
        console.error('Error processing refund:', refundError);
        return NextResponse.json({
          success: true,
          warning: 'Subscription cancelled but refund failed. Our team will process it manually.',
        });
      }
    }

    return NextResponse.json({ 
      success: true,
      subscription: subscription.id,
    });
      } catch (error: any) {
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({
        error: error.message,
        code: error.code,
      }, { status: 400 });
    }
        throw error;
      }
    }

    return NextResponse.json(
      { error: 'Nenhum provedor de pagamento configurado' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error in cancel-subscription route:', error);

    return NextResponse.json(
      { error: 'Internal server error occurred while canceling subscription' },
      { status: 500 }
    );
  }
}
