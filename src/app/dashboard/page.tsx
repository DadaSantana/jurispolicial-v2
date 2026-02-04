
'use client'
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { Loader2, ShoppingCart, AlertCircle, CreditCard, FileText, ArrowRight } from 'lucide-react';
import { isSubscriptionActive, checkSubscriptionRenewal, updateSubscriptionFromUrl } from '@/services/subscriptionService';
import { PLAN_TO_PRODUCT_MAP } from '@/services/asaasService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Conteudo, User } from '@/types/user';
import { useRouter, useSearchParams } from 'next/navigation';
import { RootState } from '../redux/store';
import { useSelector } from 'react-redux';
import LoggedPlans from '@/components/LoggedPlans';
import PricingPlans from '@/components/PricingPlans';
import CardPlans from '@/components/CardPlans';
import Link from 'next/link';

const Page = () => {

    const user: User = useSelector((state: RootState) => state.userSlice.user)

    const [conteudos, setConteudos] = useState<Conteudo[]>([]);
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState(false);
    const [isAnualPlan, setIsAnualPlan] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const hasActiveSubscription = isSubscriptionActive(user);
    const needsRenewal = checkSubscriptionRenewal(user);

    useEffect(() => {
        const fetchConteudos = async () => {
            try {
                const q = query(
                    collection(db, 'conteudos')
                );

                const snapshot = await getDocs(q);
                const items: Conteudo[] = [];

                snapshot.forEach((doc) => {
                    items.push({ id: doc.id, ...doc.data() } as Conteudo);
                });

                console.log(items)
                setConteudos(items);
            } catch (error) {
                console.error('Erro ao buscar conteúdos:', error);
                toast({
                    title: 'Erro',
                    description: 'Não foi possível carregar os conteúdos disponíveis.',
                    variant: 'destructive'
                });
            } finally {
                setLoading(false);
            }
        };

        // Check for subscription updates from Stripe redirect
        const checkSubscription = async () => {
            console.log('🔍 Plano atual do usuário:', user.plano)
            setIsAnualPlan(user.plano?.tipo === 'anual');

            // FORÇAR ATUALIZAÇÃO SE VIER COM refresh=true
            const refreshParam = searchParams.get('refresh');
            if (refreshParam === 'true') {
                console.log('🔄 Refresh detectado, buscando dados atualizados...');
                
                try {
                    const { getCurrentUser } = await import('@/services/authService');
                    const updatedUser = await getCurrentUser(user.uid);
                    
                    if (updatedUser) {
                        console.log('✅ Dados atualizados obtidos:', updatedUser.plano);
                        
                        // Importar dispatch dinamicamente
                        const { useDispatch } = await import('react-redux');
                        const { setUser } = await import('@/app/redux/features/users/userSlice');
                        
                        // Forçar reload da página para garantir que o Redux seja atualizado
                        window.location.href = '/dashboard';
                        return;
                    }
                } catch (error) {
                    console.error('❌ Erro ao buscar dados atualizados:', error);
                }
            }

            const successParam = searchParams.get('success');
            if (successParam === 'true') {
                const result = await updateSubscriptionFromUrl(user.uid);

                if (result.success) {
                    toast({
                        title: 'Assinatura ativada!',
                        description: 'Sua assinatura foi ativada com sucesso.',
                    });

                    // Refresh the page to update user data
                    window.location.reload();
                }
            }
        };

        fetchConteudos();

        if (user.uid) {
            checkSubscription();
        }

    }, [user.uid]);

    const handleComprar = (conteudo: Conteudo) => {
        // Aqui implementaremos a integração com o Stripe
        toast({
            title: 'Processando compra',
            description: `Preparando a compra de ${conteudo.titulo}`,
        });
        console.log('Comprando conteúdo:', conteudo);
    };

    const handleRenewSubscription = async () => {
        if (!user.plano?.tipo) return;

        try {
            setSubscribing(true);

            // Obter o productId do plano
            const productId = PLAN_TO_PRODUCT_MAP[user.plano.tipo as keyof typeof PLAN_TO_PRODUCT_MAP];
            
            if (!productId) {
                throw new Error('Plano não encontrado');
            }

            // Redirecionar para a página de checkout
            router.push(`/checkout?plan=${productId}`);
        } catch (error) {
            console.error('Error renewing subscription:', error);
            toast({
                title: 'Erro na renovação',
                description: 'Não foi possível renovar sua assinatura. Tente novamente.',
                variant: 'destructive'
            });
            setSubscribing(false);
        }
    };

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    // Se não houver conteúdos ainda, exibe alguns exemplos
    const mockConteudos: Conteudo[] = conteudos.length > 0 ? conteudos : [];

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Olá, {user.nome?.split(' ')[0] || 'Usuário'}!</h1>
                <p className="text-gray-600">
                    {isAnualPlan
                        ? 'Você tem acesso a todos os conteúdos exclusivos do plano anual.'
                        : 'Confira nossos conteúdos disponíveis para compra.'}
                </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-medium text-gray-800">Seu plano atual</h2>
                        <p className="text-gray-600 capitalize">{user.plano?.tipo || 'Gratuito'}</p>
                        {user.plano?.termino && (
                            <p className="text-sm text-gray-500">
                                Válido até: {user.plano.termino instanceof Date
                                    ? user.plano.termino.toLocaleDateString()
                                    : new Date((user.plano.termino as any).seconds * 1000).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                    {user.plano?.tipo === 'teste' || user.plano?.tipo === 'trial' && (
                        <div className="text-right">
                            <h2 className="text-lg font-medium text-gray-800">Créditos disponíveis</h2>
                            <p className="text-lg font-medium text-primary">{user.creditos}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Açao de incentivo para cliente gerar relatorio */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="bg-primary/20 p-3 rounded-full">
                            <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Gere seu primeiro relatório</h3>
                            <p className="text-gray-600">Crie relatórios detalhados e profissionais em poucos minutos</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => router.push('/dashboard/relatorio')}
                        className="flex items-center space-x-2"
                    >
                        <span>Gerar Relatório</span>
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Subscription Status Alert */}
            {user.plano && (
                <div className="mb-6">
                    {!hasActiveSubscription && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Assinatura inativa</AlertTitle>
                            <AlertDescription className='flex flex-col'>
                                <p>Sua assinatura está inativa. Renove agora para continuar acessando os recursos. Caso tenha efetuado pagamento por boleto, aguarde a confirmação do pagamento.</p>
                                <CardPlans />
                            </AlertDescription>
                        </Alert>
                    )}

                    {hasActiveSubscription && needsRenewal && (
                        <Alert className="mb-4 border-yellow-400 bg-yellow-50">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <AlertTitle className="text-yellow-800">Assinatura expirando</AlertTitle>
                            <AlertDescription className="text-yellow-700">
                                Sua assinatura expirará em breve. Renove agora para continuar acessando os recursos premium.
                                <Button
                                    variant="outline"
                                    className="mt-2 border-yellow-400 bg-white text-yellow-700 hover:bg-yellow-50"
                                    onClick={handleRenewSubscription}
                                    disabled={subscribing}
                                >
                                    {subscribing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="mr-2 h-4 w-4" />
                                            Renovar assinatura
                                        </>
                                    )}
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}

            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Conteúdos Disponíveis</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {conteudos.map((conteudo, index) => {
                        if (user.plano?.tipo !== 'gratuito') {
                            return (
                                <Link key={index} href={`/dashboard/conteudos/media/${conteudo.id}`}>
                                    <div key={conteudo.id} className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full transition-transform hover:scale-105">
                                        <div className="h-48 bg-gray-200 relative">
                                            <img
                                                src={conteudo.imagem}
                                                alt={conteudo.titulo}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="p-4 flex-grow">
                                            <h3 className="text-lg font-bold text-gray-800 mb-2">{conteudo.titulo}</h3>
                                            <p className="text-gray-600 mb-4">{conteudo.descricao}</p>
                                        </div>
                                        <div className="p-4 pt-0 border-t border-gray-100 mt-auto">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="bg-gray-100 px-2 py-1 rounded text-xs uppercase font-semibold text-gray-600">
                                                    {conteudo.tipo}
                                                </span>
                                            </div>
                                            
                                        </div>
                                    </div>
                                </Link>
                            )
                        }
                    })}

                </div>
                {conteudos.length === 0 && (
                    <div className="text-center py-8 bg-white rounded-lg shadow w-full">
                        <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhum conteúdo disponível</h3>
                        <p className="text-gray-500">
                            No momento não há conteúdos disponíveis para compra.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Page;
