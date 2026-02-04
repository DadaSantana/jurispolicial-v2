'use client'
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { User } from "@/types/user"
import { useDispatch, useSelector } from "react-redux"
import { RootState } from "@/app/redux/store"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import { getCurrentUser } from "@/services/authService"
import { setUser } from "@/app/redux/features/users/userSlice"
import { updateSubscriptionFromUrl } from "@/services/subscriptionService"

const Page = () => {
    const params = useParams<{ id?: string, uid?: string }>()
    const searchParams = useSearchParams()
    const router = useRouter()
    const user: User = useSelector((state: RootState) => state.userSlice.user)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const dispatch = useDispatch()

    useEffect(() => {
        const checkSubscriptionStatus = async () => {
            try {
                // Obter userId da URL ou dos parâmetros
                const userId = searchParams.get('userId') || params.uid || user.uid
                const subscriptionId = searchParams.get('subscription') || params.id
                const planType = searchParams.get('planType')

                console.log('🔍 Verificando status da assinatura:', {
                    userId,
                    subscriptionId,
                    planType,
                    userUid: user.uid
                })

                if (!userId) {
                    setError('ID do usuário não encontrado')
                    setLoading(false)
                    return
                }

                // Função para verificar status no Firestore
                const checkFirestoreStatus = async (): Promise<boolean> => {
                    const userRef = doc(db, 'usuarios', userId)
                    const userDoc = await getDoc(userRef)

                    if (userDoc.exists()) {
                        const userData = userDoc.data() as User
                        
                        console.log('📋 Status atual do plano:', {
                            status: userData.plano?.status,
                            tipo: userData.plano?.tipo,
                            asaasSubscriptionId: userData.plano?.asaasSubscriptionId,
                            subscriptionId
                        })

                        // Verificar se tem assinatura Asaas ativa
                        if (
                            userData.plano?.status === 'ativo' && 
                            (userData.plano?.asaasSubscriptionId || userData.plano?.asaasCustomerId)
                        ) {
                            // Atualizar dados do usuário no Redux
                            const currentUser = await getCurrentUser(userId)
                            if (currentUser) {
                                dispatch(setUser(currentUser))
                            }
                            return true
                        }
                    }
                    return false
                }

                // Aguardar um pouco para dar tempo do webhook processar
                await new Promise(resolve => setTimeout(resolve, 3000))

                // Verificar status no Firestore
                const isActive = await checkFirestoreStatus()

                if (isActive) {
                    // Assinatura ativa, redirecionar para dashboard
                    console.log('✅ Assinatura confirmada! Redirecionando para dashboard...')
                    setTimeout(() => {
                        router.push('/dashboard')
                    }, 1500)
                } else {
                    // Tentar mais algumas vezes (webhook pode estar processando)
                    let attempts = 0
                    const maxAttempts = 5
                    
                    const pollStatus = async () => {
                        while (attempts < maxAttempts) {
                            attempts++
                            console.log(`🔄 Tentativa ${attempts}/${maxAttempts} de verificar status...`)
                            
                            await new Promise(resolve => setTimeout(resolve, 2000))
                            const isActiveNow = await checkFirestoreStatus()
                            
                            if (isActiveNow) {
                                console.log('✅ Assinatura confirmada! Redirecionando para dashboard...')
                                setTimeout(() => {
                                    router.push('/dashboard')
                                }, 1500)
                                return
                            }
                        }
                        
                        // Se após todas as tentativas ainda não estiver ativo
                        console.warn('⚠️ Assinatura ainda não confirmada após várias tentativas')
                        setError('Aguardando confirmação do pagamento. Você receberá um e-mail quando a assinatura for ativada. Você pode fechar esta página.')
                        setLoading(false)
                    }
                    
                    pollStatus()
                }
            } catch (err) {
                console.error('❌ Erro ao processar assinatura:', err)
                setError('Erro ao processar assinatura. Verifique seu e-mail para confirmação ou entre em contato com o suporte.')
                setLoading(false)
            }
        }

        checkSubscriptionStatus()
    }, [params, searchParams, user.uid, router, dispatch])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center fixed top-0 left-0 right-0 bottom-0">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900">Processando sua assinatura...</h2>
                    <p className="text-gray-500 mt-2">Aguarde enquanto confirmamos seu pagamento.</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center fixed top-0 left-0 right-0 bottom-0">
                <div className="text-center max-w-md mx-auto px-4">
                    <h2 className="text-xl font-semibold text-red-600 mb-2">Ops! Algo deu errado.</h2>
                    <p className="text-gray-500 mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                    >
                        Voltar para o Dashboard
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center fixed top-0 left-0 right-0 bottom-0">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Assinatura Confirmada!</h1>
                <p className="text-gray-600">Redirecionando para o dashboard...</p>
            </div>
        </div>
    )
}

export default Page
