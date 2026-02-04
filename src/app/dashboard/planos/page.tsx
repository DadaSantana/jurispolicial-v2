'use client'
import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { getUserData } from '@/services/authService';
import { getSubscriptionDetails, cancelSubscription } from '@/services/subscriptionService';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Clock, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { User } from '@/types/user';
import LoggedPlans from '@/components/LoggedPlans';
import { TermosAssinatura } from '@/components/TermosAssinatura';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from '@/components/ui/use-toast';

const planData = {
  mensal: {
    title: 'Mensal',
    price: 'R$ 19,90',
    period: '/mês',
    features: [
      'Relatórios básicos',
      'Histórico dos relatórios',
      'Suporte por email',
    ],
  },
  trimestral: {
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
  semestral: {
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
  anual: {
    title: 'Anual',
    price: 'R$ 199,90',
    period: '/ano',
    features: [
      'Relatórios básicos',
      'Histórico dos relatórios',
      'Análise preditiva com IA',
      'Materiais em PDF',
      'Vídeos e Dicas Exclusivas',
      'Tirar dúvidas com um especialista',
      'Suporte por email e WhatsApp',
    ],
  },
  teste: {
    title: 'Teste',
    price: 'R$ 0,01',
    period: '/teste',
    features: [
      'Acesso para testes',
      'Todos os recursos do plano anual',
      'Duração de 24 horas',
    ],
  },
  gratuito: {
    title: 'Gratuito',
    price: 'R$ 0,00',
    period: '',
    features: [
      'Acesso limitado',
      'Recursos básicos',
    ],
  }
};

const Page = () => {
  const router = useRouter()
  const [userData, setUserData] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<ReturnType<typeof getSubscriptionDetails>>(null);
  const [loading, setLoading] = useState(true);
  const [showPlans, setShowPlans] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.push('/login');
          return;
        }
        
        const userData = await getUserData(user.uid);
        setUserData(userData);
        
        if (userData) {
          const subscriptionDetails = getSubscriptionDetails(userData);
          setSubscription(subscriptionDetails);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  const handleCancelSubscription = async () => {
    if (!userData) return;
    
    try {
      setCancelLoading(true);
      const result = await cancelSubscription(userData);
      
      if (result.success) {
        toast({
          title: "Assinatura Cancelada",
          description: result.message,
        });
        setShowCancelDialog(false);
        
        // Refresh user data
        const updatedUserData = await getUserData(userData.uid);
        setUserData(updatedUserData);
        if (updatedUserData) {
          const subscriptionDetails = getSubscriptionDetails(updatedUserData);
          setSubscription(subscriptionDetails);
        }
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao cancelar assinatura. Por favor, tente novamente.",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando informações do plano...</p>
        </div>
      </div>
    );
  }

  if (showPlans) {
    return <LoggedPlans fn={setShowPlans} />;
  }
  
  const currentPlanId = subscription?.tipo || 'gratuito';
  const currentPlan = planData[currentPlanId as keyof typeof planData];
  
  let daysRemaining = 0;
  let subscriptionStatus = 'inativo';
  
  if (subscription?.termino) {
    const now = new Date();
    const endDate = subscription.termino;
    const diffTime = endDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    subscriptionStatus = subscription.status || 'inativo';
  }
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Gerenciar Plano</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Seu Plano Atual</CardTitle>
              <CardDescription>Detalhes sobre sua assinatura atual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">{currentPlan.title}</h3>
                  <p className="text-gray-500">
                    {currentPlan.price}{currentPlan.period}
                  </p>
                </div>
                
                <div className="flex items-center">
                  {subscriptionStatus === 'ativo' ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center">
                      <Check className="w-4 h-4 mr-1" /> Ativo
                    </span>
                  ) : subscriptionStatus === 'trial' ? (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center">
                      <Clock className="w-4 h-4 mr-1" /> Período de teste
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1" /> Inativo
                    </span>
                  )}
                </div>
              </div>
              
              {subscription?.inicio && (
                <div>
                  <p className="text-sm text-gray-500">Data de início:</p>
                  <p className="font-medium">
                    {format(subscription.inicio, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
              
              {subscription?.termino && (
                <div>
                  <p className="text-sm text-gray-500">Data de término:</p>
                  <p className="font-medium">
                    {format(subscription.termino, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
              
              {daysRemaining > 0 && subscriptionStatus === 'ativo' && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-1">Tempo restante</h4>
                  <p className="text-blue-700">
                    Sua assinatura expira em <strong>{daysRemaining} dias</strong>
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setShowPlans(true)}
              >
                Alterar Plano
              </Button>
              
              {subscription?.status === 'ativo' && (
                <div className="space-x-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowTerms(true)}
                  >
                    Ver Termos
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    Cancelar Assinatura
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>
        </div>
        
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recursos do seu plano</CardTitle>
              <CardDescription>O que está incluído na sua assinatura</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {currentPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="text-primary mr-2 flex-shrink-0 mt-1" size={18} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Assinatura</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar sua assinatura?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-gray-500">
              {subscription?.inicio && differenceInDays(new Date(), subscription.inicio) <= 7
                ? "Como você está dentro do período de 7 dias, você receberá o reembolso integral do valor pago."
                : "Como já se passaram mais de 7 dias, você manterá acesso aos recursos até o final do período pago, mas não receberá reembolso."}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              <button
                className="text-blue-500 hover:underline"
                onClick={() => {
                  setShowCancelDialog(false);
                  setShowTerms(true);
                }}
              >
                Consulte nossos termos de cancelamento
              </button>
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={cancelLoading}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
            >
              {cancelLoading ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TermosAssinatura
        open={showTerms}
        onOpenChange={setShowTerms}
      />
    </div>
  );
};

export default Page;
