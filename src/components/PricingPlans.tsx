import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';

import { auth } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const planData = [
  {
    id: 'prod_Rv5BKzklzzN8TY',
    title: 'Mensal',
    price: 'R$ 29,90',
    period: '/mês',
    features: [
      'Relatórios básicos',
      'Histórico dos relatórios',
      'Suporte por email',
    ],
  },
  {
    id: 'prod_Rv5BQCIBSKtfWA',
    title: 'Trimestral',
    price: 'R$ 49,90',
    period: '/trimestre',
    features: [
      'Relatórios básicos',
      'Histórico dos relatórios',
      'Análise preditiva com IA',
      'Suporte por email e WhatsApp',
    ],
  },
  {
    id: 'prod_Rv5BecHr1RyOUx',
    title: 'Semestral',
    price: 'R$ 99,90',
    period: '/semestre',
    features: [
      'Relatórios básicos',
      'Histórico dos relatórios',
      'Análise preditiva com IA',
      'Suporte por email e WhatsApp',
    ],
  },
  {
    id: 'prod_Rv5BwM0irfxVVe',
    title: 'Anual',
    price: 'R$ 199,90',
    period: '/ano',
    features: [
      'Relatórios básicos',
      'Histórico dos relatórios',
      'Análise preditiva com IA',
      'Acesso a cursos online',
      'Certificados de conclusão',
      'Materiais em PDF',
      'Vídeos e Dicas Exclusivas',
      'Tirar dúvidas com um especialista',
      'Suporte por email e WhatsApp',
    ],
    popular: true,
  }/* ,
  {
    id: 'prod_RuDg0xy0SmJgve',
    title: 'Teste',
    price: 'R$ 0,01',
    period: '/teste',
    features: [
      'Acesso para testes',
      'Todos os recursos do plano anual',
      'Duração de 24 horas',
    ],
    isTest: true,
  } */
];

const PricingPlans = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter()
  
  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    
    try {
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        router.push(`/checkout?plan=${planId}`);
      } else {
        router.push(`/subscription-login?plan=${planId}`);
      }
    } catch (error) {
      console.error(`Error subscribing to plan ${planId}:`, error);
      toast({
        title: 'Erro na assinatura',
        description: 'Não foi possível processar sua solicitação. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <section id="planos" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Nossos Planos</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Escolha o plano ideal para suas necessidades e comece a utilizar o JurisPolicial hoje mesmo
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {planData.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105 flex flex-col h-full ${
                plan.popular ? 'border-2 border-primary ring-2 ring-primary/20' : 'border border-gray-100'
              }`}
            >
              {plan.popular && (
                <div className="bg-primary text-white text-center py-1 text-sm font-medium">
                  Mais Popular
                </div>
              )}
             {/*  {plan.isTest && (
                <div className="bg-yellow-500 text-white text-center py-1 text-sm font-medium">
                  Apenas para Testes
                </div>
              )} */}
              
              <div className="p-6 flex-grow">
                <h3 className="text-xl font-bold mb-4 text-gray-900">{plan.title}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-primary">{plan.price}</span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>
                
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="text-primary mr-2 flex-shrink-0 mt-1" size={18} />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-6 pt-0 mt-auto">
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id}
                  className={`w-full rounded-lg ${
                    plan.popular ? 'bg-primary hover:bg-primary-dark' : 
                    'bg-gray-100 text-primary hover:bg-gray-200'
                  }`}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Assinar Agora'
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingPlans;
