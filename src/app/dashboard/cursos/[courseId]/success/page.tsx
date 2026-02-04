'use client'
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useSelector } from "react-redux"
import { RootState } from "@/app/redux/store"
import { auth } from "@/lib/firebase"
import { getUserCourseProgress } from "@/services/courseProgressService"

const CourseSuccessPage = () => {
    const params = useParams<{ courseId: string }>()
    const searchParams = useSearchParams()
    const router = useRouter()
    const user = useSelector((state: RootState) => state.userSlice.user)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [enrolled, setEnrolled] = useState(false)

    useEffect(() => {
        const checkEnrollment = async () => {
            try {
                const courseId = params.courseId
                const paymentId = searchParams.get('paymentId')
                
                if (!courseId) {
                    setError('ID do curso não encontrado')
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

                // Verificar se o usuário está inscrito no curso
                const progress = await getUserCourseProgress(userId, courseId)
                
                if (progress) {
                    setEnrolled(true)
                    setLoading(false)
                    
                    // Redirecionar para o curso após 2 segundos
                    setTimeout(() => {
                        router.push(`/dashboard/cursos/${courseId}`)
                    }, 2000)
                } else {
                    // Aguardar webhook processar (pode levar alguns segundos)
                    let attempts = 0
                    const maxAttempts = 10
                    
                    const pollEnrollment = async () => {
                        while (attempts < maxAttempts) {
                            attempts++
                            console.log(`🔄 Tentativa ${attempts}/${maxAttempts} de verificar inscrição...`)
                            
                            await new Promise(resolve => setTimeout(resolve, 2000))
                            const progressNow = await getUserCourseProgress(userId, courseId)
                            
                            if (progressNow) {
                                setEnrolled(true)
                                setLoading(false)
                                setTimeout(() => {
                                    router.push(`/dashboard/cursos/${courseId}`)
                                }, 2000)
                                return
                            }
                        }
                        
                        // Se após todas as tentativas ainda não estiver inscrito
                        console.warn('⚠️ Inscrição ainda não confirmada após várias tentativas')
                        setError('Aguardando confirmação do pagamento. Você receberá um e-mail quando a inscrição for confirmada. Você pode fechar esta página.')
                        setLoading(false)
                    }
                    
                    pollEnrollment()
                }
            } catch (err) {
                console.error('❌ Erro ao verificar inscrição:', err)
                setError('Erro ao verificar inscrição. Verifique seu e-mail para confirmação ou entre em contato com o suporte.')
                setLoading(false)
            }
        }

        checkEnrollment()
    }, [params.courseId, searchParams, router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Processando pagamento...</h1>
                    <p className="text-gray-600">Aguarde enquanto confirmamos sua inscrição</p>
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
                        onClick={() => router.push('/dashboard/cursos')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Voltar para Cursos
                    </button>
                </div>
            </div>
        )
    }

    if (enrolled) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Inscrição Confirmada!</h1>
                    <p className="text-gray-600 mb-4">Redirecionando para o curso...</p>
                </div>
            </div>
        )
    }

    return null
}

export default CourseSuccessPage
