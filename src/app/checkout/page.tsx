'use client'
import { User } from '@/types/user';
import { Check, Loader2, ArrowLeft, CreditCard, QrCode, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { Suspense, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

// Mapeamento de planos
const PLAN_DETAILS: Record<string, {
  title: string;
  price: string;
  period: string;
  features: string[];
  value: number;
  planType: string;
}> = {
  'prod_Rv5BKzklzzN8TY': {
    title: 'Mensal',
    price: 'R$ 29,90',
    period: '/mês',
    value: 29.90,
    planType: 'mensal',
    features: [
      'Relatórios básicos',
      'Histórico dos relatórios',
      'Suporte por email',
    ],
  },
  'prod_Rv5BQCIBSKtfWA': {
    title: 'Trimestral',
    price: 'R$ 49,90',
    period: '/trimestre',
    value: 49.90,
    planType: 'trimestral',
    features: [
      'Relatórios básicos',
      'Histórico dos relatórios',
      'Análise preditiva com IA',
      'Suporte por email e WhatsApp',
    ],
  },
  'prod_Rv5BecHr1RyOUx': {
    title: 'Semestral',
    price: 'R$ 99,90',
    period: '/semestre',
    value: 99.90,
    planType: 'semestral',
    features: [
      'Relatórios básicos',
      'Histórico dos relatórios',
      'Análise preditiva com IA',
      'Suporte por email e WhatsApp',
    ],
  },
  'prod_Rv5BwM0irfxVVe': {
    title: 'Anual',
    price: 'R$ 199,90',
    period: '/ano',
    value: 199.90,
    planType: 'anual',
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
  'prod_RuDg0xy0SmJgve': {
    title: 'Teste',
    price: 'R$ 0,01',
    period: '/teste',
    value: 0.01,
    planType: 'teste',
    features: [
      'Acesso para testes',
      'Todos os recursos do plano anual',
      'Duração de 24 horas',
    ],
  },
};

const CheckoutPage = () => {
  const router = useRouter();
  const user: User = useSelector((state: RootState) => state.userSlice.user);
  const searchParams = useSearchParams();
  const [planId, setPlanId] = useState<string | null>(searchParams.get('plan'));
  const [loading, setLoading] = useState(false);
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'PIX'>('CREDIT_CARD');

  const plan = planId ? PLAN_DETAILS[planId] : null;

  useEffect(() => {
    if (!planId) {
      toast({
        title: 'Plano não selecionado',
        description: 'Por favor, selecione um plano para continuar.',
        variant: 'destructive',
      });
      router.push('/');
      return;
    }

    // Verificar se o usuário está logado
    if (!user || !user.uid || !user.email) {
      console.log('Usuário não logado na página de checkout, redirecionando para login');
      router.push(`/subscription-login?redirect=/checkout?plan=${planId}`);
    }
  }, [planId, router, user]);

  const handleCreateCheckout = async () => {
    console.log('handleCreateCheckout chamado', { planId, user, email: user?.email, paymentMethod });
    
    if (!planId) {
      toast({
        title: 'Erro',
        description: 'Plano não selecionado. Por favor, escolha um plano.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar se o usuário está logado
    if (!user || !user.uid || !user.email) {
      console.log('Usuário não logado, redirecionando para login');
      toast({
        title: 'Login necessário',
        description: 'Você precisa estar logado para continuar. Redirecionando para login...',
        variant: 'default',
      });
      // Salvar o plano na URL para redirecionar após login
      router.push(`/subscription-login?redirect=/checkout?plan=${planId}`);
      return;
    }

    if (!user.nome) {
      toast({
        title: 'Erro',
        description: 'Nome do usuário não encontrado. Por favor, complete seu perfil.',
        variant: 'destructive',
      });
      return;
    }

    setCreatingCheckout(true);

    try {
      const YOUR_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'https://jurispolicial.com.br';
      // const YOUR_DOMAIN = 'http://localhost:3000'; // Para desenvolvimento local

      console.log('Enviando requisição para:', `/api/checkout/${planId}`);
      console.log('Dados do usuário disponíveis:', {
        userId: user.uid,
        email: user.email,
        nome: user.nome,
        cpf: user.cpf,
        cpfCnpj: (user as any).cpfCnpj,
        todosOsCampos: Object.keys(user),
      });

      const requestBody = {
        userId: user.uid,
        return_link: `${YOUR_DOMAIN}/checkout?plan=${planId}`,
        email: user.email,
        nome: user.nome,
        cpf: user.cpf || (user as any).cpfCnpj || undefined, // Incluir CPF na requisição
        billingType: paymentMethod, // Método de pagamento escolhido pelo usuário
      };

      console.log('Dados enviados para API:', requestBody);

      const response = await fetch(`/api/checkout/${planId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Resposta recebida:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro na resposta:', errorData);
        throw new Error(errorData.error || `Erro ao criar checkout: ${response.status}`);
      }

      const data = await response.json();
      console.log('Dados recebidos:', data);

      if (data.url) {
        // Abrir pagamento em nova aba e redirecionar para página de processamento
        console.log('Abrindo pagamento em nova aba:', data.url);
        const paymentWindow = window.open(data.url, '_blank');
        
        // Redirecionar para página de processamento que verifica o status
        const YOUR_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 
                           (process.env.NODE_ENV === 'development' 
                             ? 'http://localhost:3000' 
                             : 'https://jurispolicial.com.br');
        
        const processingUrl = `${YOUR_DOMAIN}/dashboard/subscription/processing?userId=${user.uid}&planId=${planId}`;
        window.location.href = processingUrl;
      } else if (data.message) {
        // Se não tiver URL mas tiver mensagem, mostrar a mensagem
        toast({
          title: 'Atenção',
          description: data.message,
          variant: 'default',
        });
        setCreatingCheckout(false);
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (error: any) {
      console.error('Erro ao criar checkout:', error);
      toast({
        title: 'Erro ao processar',
        description: error.message || 'Não foi possível criar o checkout. Tente novamente.',
        variant: 'destructive',
      });
      setCreatingCheckout(false);
    }
  };

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Plano não encontrado</p>
              <Link href="/">
                <Button variant="outline">Voltar para a página inicial</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link href="/" className="inline-flex items-center text-primary hover:underline mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Detalhes do Plano */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{plan.title}</CardTitle>
              <CardDescription>Resumo da sua assinatura</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-primary">{plan.price}</span>
                  <span className="text-gray-600 ml-2">{plan.period}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">O que está incluído:</h3>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="text-primary mr-2 flex-shrink-0 mt-1" size={18} />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Checkout */}
          <Card>
            <CardHeader>
              <CardTitle>Finalizar Assinatura</CardTitle>
              <CardDescription>Complete seu pagamento de forma segura</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resumo */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Plano selecionado</span>
                  <span className="font-semibold">{plan.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Valor</span>
                  <span className="text-2xl font-bold text-primary">{plan.price}</span>
                </div>
              </div>

              {/* Seleção de método de pagamento */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-3 block">Método de Pagamento</Label>
                  <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'CREDIT_CARD' | 'PIX')}>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <RadioGroupItem value="CREDIT_CARD" id="credit-card" />
                      <Label htmlFor="credit-card" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Cartão de Crédito</span>
                          <CreditCard className="h-5 w-5 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">Parcelamento em até 12x</p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <RadioGroupItem value="PIX" id="pix" />
                      <Label htmlFor="pix" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">PIX</span>
                          <QrCode className="h-5 w-5 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">Aprovação imediata</p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Informações de segurança */}
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Pagamento 100% Seguro</p>
                  <p className="text-blue-700">
                    Seu pagamento será processado pelo Asaas, uma plataforma segura e confiável.
                  </p>
                </div>
              </div>

              {/* Botão de checkout */}
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Botão clicado!');
                  handleCreateCheckout();
                }}
                disabled={creatingCheckout || loading}
                className="w-full h-12 text-lg"
                size="lg"
                type="button"
              >
                {creatingCheckout ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Continuar para o Pagamento
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-gray-500">
                Ao continuar, você será redirecionado para a página de pagamento do Asaas.
                Após o pagamento, sua assinatura será ativada automaticamente.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const Page = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CheckoutPage />
    </Suspense>
  );
};

export default Page;
