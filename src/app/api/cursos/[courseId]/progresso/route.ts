import { NextResponse } from 'next/server';
import { markLessonComplete, calculateProgress, getUserCourseProgress } from '@/services/courseProgressService';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const body = await request.json();
    const { userId, lessonId } = body;

    if (!userId || !lessonId) {
      return NextResponse.json(
        { error: 'ID do usuário e ID da aula são obrigatórios' },
        { status: 400 }
      );
    }

    // Marcar aula como completa
    await markLessonComplete(userId, courseId, lessonId);

    // Recalcular progresso
    const progress = await calculateProgress(userId, courseId);

    // Buscar progresso atualizado
    const userProgress = await getUserCourseProgress(userId, courseId);

    return NextResponse.json({
      success: true,
      progress,
      userProgress,
      message: 'Aula marcada como completa',
    });
  } catch (error: any) {
    console.error('Erro ao atualizar progresso:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar progresso' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar progresso do usuário
    const progress = await getUserCourseProgress(userId, courseId);

    if (!progress) {
      return NextResponse.json({
        success: true,
        progress: null,
        message: 'Usuário ainda não está inscrito neste curso',
      });
    }

    // Recalcular progresso
    const calculatedProgress = await calculateProgress(userId, courseId);

    return NextResponse.json({
      success: true,
      progress: {
        ...progress,
        progresso: calculatedProgress,
      },
    });
  } catch (error: any) {
    console.error('Erro ao buscar progresso:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar progresso' },
      { status: 500 }
    );
  }
}
