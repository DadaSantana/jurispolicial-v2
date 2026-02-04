import { NextResponse } from 'next/server';
import { getCourse, createCourseCheckout } from '@/services/courseService';
import { createUserCourseProgress, getUserCourseProgress } from '@/services/courseProgressService';
import { getUserData } from '@/services/authService';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const body = await request.json();
    const { userId, billingType } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar curso
    const course = await getCourse(courseId);
    if (!course) {
      return NextResponse.json(
        { error: 'Curso não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se curso está ativo
    if (course.status !== 'ativo') {
      return NextResponse.json(
        { error: 'Curso não está disponível' },
        { status: 400 }
      );
    }

    // Verificar se usuário já está inscrito
    const existingProgress = await getUserCourseProgress(userId, courseId);
    if (existingProgress) {
      return NextResponse.json(
        { error: 'Usuário já está inscrito neste curso' },
        { status: 400 }
      );
    }

    // Buscar dados do usuário
    const user = await getUserData(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Se curso é gratuito, criar progresso diretamente
    if (course.tipo === 'gratuito') {
      await createUserCourseProgress(userId, courseId);

      return NextResponse.json({
        success: true,
        message: 'Inscrição realizada com sucesso',
        courseId,
      });
    }

    // Se curso é pago, criar checkout no Asaas
    if (course.tipo === 'pago') {
      // Validar método de pagamento (padrão: BOLETO)
      const validBillingType = billingType === 'PIX' ? 'PIX' : 
                               billingType === 'CREDIT_CARD' ? 'CREDIT_CARD' : 
                               'BOLETO';
      
      const checkout = await createCourseCheckout(
        courseId,
        userId,
        user.email || '',
        user.nome,
        user.cpf,
        user.telefone,
        validBillingType
      );

      return NextResponse.json({
        success: true,
        checkoutUrl: checkout.checkoutUrl,
        paymentId: checkout.paymentId,
        message: 'Redirecionando para o pagamento',
      });
    }

    return NextResponse.json(
      { error: 'Tipo de curso inválido' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Erro ao inscrever usuário no curso:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar inscrição' },
      { status: 500 }
    );
  }
}
