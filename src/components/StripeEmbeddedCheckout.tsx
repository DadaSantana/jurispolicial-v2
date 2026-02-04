'use client'
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { updateUserSubscription } from '@/services/stripeService';
import { useRouter } from 'next/navigation';

interface StripeEmbeddedCheckoutProps {
  userId: string;
  planId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const StripeEmbeddedCheckout: React.FC<StripeEmbeddedCheckoutProps> = ({
  userId,
  planId,
  onSuccess,
  onCancel
}) => {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const simulateCheckout = async () => {
      try {
        setLoading(true);

        // In development mode, simulate a successful payment
        console.log('Simulating Stripe checkout for plan:', planId);

        // Wait a bit to simulate actual processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Update user subscription data
        await updateUserSubscription(userId, {
          planId,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          status: 'ativo',
          stripeSubscriptionId: 'test_subscription_' + Date.now(),
          stripeCustomerId: 'test_customer_' + userId,
        });

        toast({
          title: 'Pagamento simulado com sucesso',
          description: 'Sua assinatura foi ativada no modo de teste.',
        });

        // Call success callback if provided
        if (onSuccess) {
          onSuccess();
        }

        // Redirect to dashboard
        router.push('/dashboard?success=true&test=true');
      } catch (error) {
        console.error('Error in simulated checkout:', error);
        toast({
          title: 'Erro no checkout',
          description: 'Falha ao processar o pagamento simulado.',
          variant: 'destructive'
        });

        // Call cancel callback if provided
        if (onCancel) {
          onCancel();
        }
      } finally {
        setLoading(false);
      }
    };

    simulateCheckout();
  }, [userId, planId, onSuccess, onCancel]);

  return (
    <div className="w-full h-[400px] flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
      {loading ? (
        <div className="text-center">
          <Loader2 className="w-10 h-10 mb-4 mx-auto animate-spin text-primary" />
          <h3 className="text-lg font-medium">Processando seu pagamento</h3>
          <p className="text-gray-500 mt-2">Aguarde enquanto processamos sua transação...</p>
        </div>
      ) : (
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium">Pagamento concluído</h3>
          <p className="text-gray-500 mt-2">Você será redirecionado em alguns instantes...</p>
        </div>
      )}
    </div>
  );
};

export default StripeEmbeddedCheckout;
