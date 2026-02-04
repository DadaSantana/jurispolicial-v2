import { NextResponse } from 'next/server';
import { getCertificateByHash } from '@/services/certificateService';
import { getCourse } from '@/services/courseService';
import { getUserData } from '@/services/authService';

export async function GET(
  request: Request,
  { params }: { params: { hash: string } }
) {
  try {
    const { hash } = params;

    if (!hash) {
      return NextResponse.json(
        { error: 'Hash de validação é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar certificado por hash
    const certificate = await getCertificateByHash(hash);

    if (!certificate) {
      return NextResponse.json(
        { 
          valid: false,
          message: 'Certificado não encontrado. O hash fornecido é inválido.' 
        },
        { status: 404 }
      );
    }

    // Buscar dados do curso
    const course = await getCourse(certificate.courseId);
    
    // Buscar dados do usuário
    const user = await getUserData(certificate.userId);

    // Formatar data de emissão
    const dataEmissao = certificate.dataEmissao instanceof Date
      ? certificate.dataEmissao
      : new Date(certificate.dataEmissao);
    const dataFormatada = dataEmissao.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    return NextResponse.json({
      valid: true,
      certificate: {
        id: certificate.id,
        nomeAluno: user?.nome || 'Não disponível',
        nomeCurso: course?.titulo || 'Não disponível',
        dataEmissao: dataFormatada,
        pdfUrl: certificate.pdfUrl,
        hashValidacao: certificate.hashValidacao,
      },
      message: 'Certificado válido',
    });
  } catch (error: any) {
    console.error('Erro ao validar certificado:', error);
    return NextResponse.json(
      { 
        valid: false,
        error: error.message || 'Erro ao validar certificado' 
      },
      { status: 500 }
    );
  }
}
