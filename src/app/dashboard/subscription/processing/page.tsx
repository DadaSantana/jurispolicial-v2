'use client'
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { User } from "@/types/user"
import { useDispatch, useSelector } from "react-redux"
import { RootState } from "@/app/redux/store"
import { db } from "@/lib/firebase"
import { doc, getDoc, onSnapshot } from "firebase/firestore"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { getCurrentUser } from "@/services/authService"
import { setUser } from "@/app/redux/features/users/userSlice"

const ProcessingPage = () => {
    const searchParams = useSearchParams()
    const router = useRouter()
    const user: User = useSelector((state: RootState) => state.userSlice.user)
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
    const [message, setMessage] = useState('Aguardando confirmação do pagamento...')
    const dispatch = useDispatch()

    useEffect(() => {
        const userId = searchParams.get('userId') || user.uid
        const planId = searchParams.get('planId')

        if (!userId) {
            setStatus('error')
            setMessage('ID do usuário não encontrado')
            return
        }

        console.log('🔄 Iniciando verificação de status do pagamento:', { userId, planId })

        // Função para verificar e atualizar status
        const checkStatus = async () => {
            try {
                const userRef = doc(db, 'usuarios', userId)
                const userDoc = await getDoc(userRef)

                if (userDoc.exists()) {
                    const userData = userDoc.data() as User
                    
                    console.log('📋 Status atual do plano:', {
                        status: userData.plano?.status,
                        tipo: userData.plano?.tipo,
                        asaasSubscriptionId: userData.plano?.asaasSubscriptionId,
                        asaasCustomerId: userData.plano?.asaasCustomerId
                    })

                    // Verificar se tem assinatura Asaas ativa
                    if (userData.plano?.status === 'ativo') {
                        console.log('🔥 PLANO ATIVO ENCONTRADO! Atualizando Redux...')
                        
                        // FORÇAR atualização do Redux
                        dispatch(setUser(userData));
                        
                        setStatus('success')
                        setMessage('Pagamento confirmado! Sua assinatura foi ativada.')
                        
                        // Redirecionar para dashboard após 1 segundo
                        setTimeout(() => {
                            console.log('🔄 Redirecionando para dashboard...')
                            // Forçar reload completo da página para garantir que o Redux seja atualizado
                            window.location.href = '/dashboard?refresh=true';
                        }, 1000)
                        return true
                    }
                }
                return false
            } catch (error) {
                console.error('❌ Erro ao verificar status:', error)
                return false
            }
        }

        // Verificar imediatamente
        checkStatus()

        // FORÇAR VERIFICAÇÃO CONTÍNUA COM API
        const forceCheck = setInterval(async () => {
            console.log('🔄 Verificação forçada via API...')
            
            try {
                // Buscar dados via API para garantir dados frescos
                const response = await fetch(`/api/user/refresh/${userId}`);
                
                if (response.ok) {
                    const userData = await response.json();
                    
                    console.log('📡 Dados da API:', {
                        status: userData.plano?.status,
                        tipo: userData.plano?.tipo,
                        asaasSubscriptionId: userData.plano?.asaasSubscriptionId,
                        asaasCustomerId: userData.plano?.asaasCustomerId
                    })

                    if (userData.plano?.status === 'ativo') {
                        console.log('🔥 PLANO ATIVO DETECTADO VIA API! Forçando atualização...')
                        
                        // FORÇAR atualização do Redux
                        dispatch(setUser(userData));
                        
                        setStatus('success')
                        setMessage('Pagamento confirmado! Sua assinatura foi ativada.')
                        
                        // Limpar interval
                        clearInterval(forceCheck)
                        
                        // Redirecionar para dashboard
                        setTimeout(() => {
                            console.log('🔄 Redirecionando para dashboard...')
                            window.location.href = '/dashboard';
                        }, 1000)
                        return;
                    }
                }
                
                // Fallback: buscar diretamente do Firestore
                const userRef = doc(db, 'usuarios', userId)
                const userDoc = await getDoc(userRef)
                
                if (userDoc.exists()) {
                    const userData = userDoc.data() as User
                    
                    console.log('📡 Dados do Firestore (fallback):', {
                        status: userData.plano?.status,
                        tipo: userData.plano?.tipo,
                        asaasSubscriptionId: userData.plano?.asaasSubscriptionId,
                        asaasCustomerId: userData.plano?.asaasCustomerId
                    })

                    if (userData.plano?.status === 'ativo') {
                        console.log('🔥 PLANO ATIVO DETECTADO NO FIRESTORE! Forçando atualização...')
                        
                        // FORÇAR atualização do Redux
                        dispatch(setUser(userData));
                        
                        setStatus('success')
                        setMessage('Pagamento confirmado! Sua assinatura foi ativada.')
                        
                        // Limpar interval
                        clearInterval(forceCheck)
                        
                        // Redirecionar para dashboard
                        setTimeout(() => {
                            console.log('🔄 Redirecionando para dashboard...')
                            window.location.href = '/dashboard';
                        }, 1000)
                    }
                }
            } catch (error) {
                console.error('❌ Erro na verificação forçada:', error)
            }
        }, 2000) // Verificar a cada 2 segundos

        // Configurar listener em tempo real do Firestore como backup
        const userRef = doc(db, 'usuarios', userId)
        const unsubscribe = onSnapshot(userRef, async (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.data() as User
                
                console.log('📡 Snapshot do Firestore:', userData.plano)

                if (userData.plano?.status === 'ativo') {
                    console.log('🔥 PLANO ATIVO NO SNAPSHOT!')
                    
                    dispatch(setUser(userData));
                    setStatus('success')
                    setMessage('Pagamento confirmado! Sua assinatura foi ativada.')
                    
                    clearInterval(forceCheck)
                    
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1000)
                }
            }
        })

        // Polling adicional como fallback (verificar a cada 3 segundos)
        const pollInterval = setInterval(async () => {
            const isActive = await checkStatus()
            if (isActive) {
                clearInterval(pollInterval)
            }
        }, 3000)

        // Limpar após 5 minutos (timeout)
        const timeout = setTimeout(() => {
            clearInterval(pollInterval)
            unsubscribe()
            if (status === 'processing') {
                setStatus('error')
                setMessage('Tempo de espera esgotado. Verifique seu e-mail ou entre em contato com o suporte.')
            }
        }, 5 * 60 * 1000) // 5 minutos

        return () => {
            clearInterval(forceCheck)
            unsubscribe()
        }
    }, [searchParams, user.uid, router, dispatch, status])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full mx-4">
                <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                    {status === 'processing' && (
                        <>
                            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
                            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                                Processando Pagamento
                            </h2>
                            <p className="text-gray-600 mb-4">{message}</p>
                            <div className="space-y-2 text-sm text-gray-500">
                                <p>✓ Pagamento aberto em nova aba</p>
                                <p>✓ Aguardando confirmação do pagamento...</p>
                                <p>✓ Você pode fechar a aba do pagamento após concluir</p>
                            </div>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-semibold text-green-600 mb-2">
                                Pagamento Confirmado!
                            </h2>
                            <p className="text-gray-600 mb-4">{message}</p>
                            <p className="text-sm text-gray-500">
                                Redirecionando para o dashboard...
                            </p>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-semibold text-red-600 mb-2">
                                Aguardando Confirmação
                            </h2>
                            <p className="text-gray-600 mb-4">{message}</p>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                            >
                                Ir para Dashboard
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ProcessingPage

