import { createOrGetCustomer, createPayment } from '@/services/asaasService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, productId, return_link, email, nome, billingType } = body;
        const YOUR_DOMAIN = 'https://jurispolicial.com.br';
        /* const YOUR_DOMAIN = 'http://localhost:3001'; */

        if (!productId) {
            return NextResponse.json(
                { error: 'ID do produto é obrigatório' },
                { status: 400 }
            );
        }

        // Buscar dados do produto
        const productRef = doc(db, 'produtos', productId);
        const productDoc = await getDoc(productRef);

        if (!productDoc.exists()) {
            return NextResponse.json(
                { error: 'Produto não encontrado' },
                { status: 404 }
            );
        }

        const productData = productDoc.data();
        const productValue = productData.valor;

        // Buscar dados do usuário se nome não foi fornecido
        let userName = nome;
        let userCpf = '';
        if (!userName && userId) {
            const userRef = doc(db, 'usuarios', userId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                const userData = userDoc.data();
                userName = userData.nome || email?.split('@')[0] || 'Cliente';
                userCpf = userData.cpf || '';
            }
        }

        if (!userName) {
            userName = email?.split('@')[0] || 'Cliente';
        }

        // Criar ou buscar cliente no Asaas
        const customerId = await createOrGetCustomer(
            email,
            userName,
            userCpf || undefined,
            undefined
        );

        // Validar método de pagamento (padrão: BOLETO)
        const validBillingType = billingType === 'PIX' ? 'PIX' : 
                                 billingType === 'CREDIT_CARD' ? 'CREDIT_CARD' : 
                                 'BOLETO';

        // Calcular data de vencimento (7 dias para produtos)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        const dueDateStr = dueDate.toISOString().split('T')[0]; // YYYY-MM-DD

        // URL de retorno baseada no return_link ou padrão
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || YOUR_DOMAIN;
        const successUrl = return_link || `${baseUrl}/dashboard/produtos/success?paymentId={paymentId}&productId=${productId}`;
        const backUrl = `${baseUrl}/dashboard/produtos`;

        // Criar pagamento no Asaas (igual aos cursos)
        let payment;
        try {
            payment = await createPayment({
                customer: customerId,
                billingType: validBillingType,
                value: productValue,
                dueDate: dueDateStr,
                description: `Produto: ${productData.titulo || 'Produto'}`,
                externalReference: `${userId}_${productId}`,
                callback: {
                    successUrl: successUrl,
                    autoRedirect: true,
                },
            });
            
            console.log('✅ Pagamento criado com callback');
        } catch (callbackError: any) {
            console.warn('⚠️ Erro ao criar pagamento com callback, criando sem callback:', callbackError.message);
            
            // Se falhar com callback, criar sem callback
            payment = await createPayment({
                customer: customerId,
                billingType: validBillingType,
                value: productValue,
                dueDate: dueDateStr,
                description: `Produto: ${productData.titulo || 'Produto'}`,
                externalReference: `${userId}_${productId}`,
            });
            
            console.log('✅ Pagamento criado sem callback');
        }

        // Retornar URL do pagamento
        return NextResponse.json({ 
            success: true,
            checkoutUrl: payment.invoiceUrl || '',
            paymentId: payment.id,
            message: 'Checkout criado com sucesso. Redirecione o usuário para a URL de checkout.',
        });
    } catch (err: any) {
        console.error('Erro no checkout de produto:', err);
        return NextResponse.json(
            { 
                error: err.message || 'Erro ao processar checkout do produto' 
            },
            { status: 400 }
        );
    }
}



