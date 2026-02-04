'use client'
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useSelector } from "react-redux"
import { RootState } from "@/app/redux/store"
import { auth } from "@/lib/firebase"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"

const ProductSuccessPage = () => {
    const searchParams = useSearchParams()
    const router = useRouter()
    const user = useSelector((state: RootState) => state.userSlice.user)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [purchased, setPurchased] = useState(false)

    useEffect(() => {
        const checkPurchase = async () => {
            try {
                const paymentId = searchParams.get('paymentId')
                const productId = searchParams.get('productId')
                
                if (!productId || !paymentId) {
                    setError('Parâmetros de pagamento não encontrados')
                    setLoading(false)
                    return
                }

                // Buscar usuário atual do Redux ou Firebase Auth
                const userId = user?.uid || auth.currentUser?.uid
                
                if (!userId) {
                    setError('Usuário não identificado. Por favor, faça login novamente.')
                    setLoading(false)
                    setTimeout(() => {
                        router.push('/login')
                    }, 3000)
                    return
                }

                // Verificar se a compra foi registrada
                const purchaseQuery = query(
                    collection(db, 'productPurchases'),
                    where('userId', '==', userId),
                    where('productId', '==', productId),
                    where('paymentId', '==', paymentId)
                )
                
                const purchaseSnapshot = await getDocs(purchaseQuery)
                
                if (!purchaseSnapshot.empty) {
                    setPurchased(true)
                    setLoading(false)
                    
                    // Redirecionar para produtos após 2 segundos
                    setTimeout(() => {
                        router.push('/dashboard/produtos')
                    }, 2000)
                } else {
                    // Aguardar webhook processar (pode levar alguns segundos)
                    let attempts = 0
                    const maxAttempts = 10
                    
                    const pollPurchase = async () => {
                        while (attempts < maxAttempts) {
                            attempts++
                            console.log(`🔄 Tentativa ${attempts}/${maxAttempts} de verificar compra...`)
                            
                            await new Promise(resolve => setTimeout(resolve, 2000))
                            const purchaseSnapshotNow = await getDocs(purchaseQuery)
                            
                            if (!purchaseSnapshotNow.empty) {
                                setPurchased(true)
                                setLoading(false)
                                setTimeout(() => {
                                    router.push('/dashboard/produtos')
                                }, 2000)
                                return
                            }
                        }
                        
                        // Se após todas as tentativas ainda não estiver registrado
                        console.warn('⚠️ Compra ainda não confirmada após várias tentativas')
                        setError('Aguardando confirmação do pagamento. Você receberá um e-mail quando a compra for confirmada. Você pode fechar esta página.')
                        setLoading(false)
                    }
                    
                    pollPurchase()
                }
            } catch (err) {
                console.error('❌ Erro ao verificar compra:', err)
                setError('Erro ao verificar compra. Verifique seu e-mail para confirmação ou entre em contato com o suporte.')
                setLoading(false)
            }
        }

        checkPurchase()
    }, [searchParams, router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Processando pagamento...</h1>
                    <p className="text-gray-600">Aguarde enquanto confirmamos sua compra</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Aguardando confirmação</h1>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/dashboard/produtos')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Voltar para Produtos
                    </button>
                </div>
            </div>
        )
    }

    if (purchased) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Compra Confirmada!</h1>
                    <p className="text-gray-600 mb-4">Redirecionando para produtos...</p>
                </div>
            </div>
        )
    }

    return null
}

export default ProductSuccessPage
