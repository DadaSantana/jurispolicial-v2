import { NextResponse } from 'next/server';
import { storage } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getCourse } from '@/services/courseService';
import { getUserCourseProgress } from '@/services/courseProgressService';
import { getUserData } from '@/services/authService';
import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { CertificatePDF } from '@/components/CertificatePDF';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, courseId, hashValidacao } = body;

    if (!userId || !courseId || !hashValidacao) {
      return NextResponse.json(
        { error: 'userId, courseId e hashValidacao são obrigatórios' },
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

    // Buscar dados do curso
    const course = await getCourse(courseId);
    if (!course) {
      return NextResponse.json(
        { error: 'Curso não encontrado' },
        { status: 404 }
      );
    }

    // Verificar progresso do usuário
    const progress = await getUserCourseProgress(userId, courseId);
    if (!progress || !progress.dataConclusao) {
      return NextResponse.json(
        { error: 'Usuário ainda não concluiu o curso' },
        { status: 400 }
      );
    }

    // Formatar data de conclusão
    const rawData = progress.dataConclusao as Date | Timestamp | string | number;
    const dataConclusao = rawData instanceof Date
      ? rawData
      : rawData instanceof Timestamp
      ? rawData.toDate()
      : new Date(rawData as string | number);
    const dataFormatada = dataConclusao.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    // Gerar PDF usando @react-pdf/renderer
    const certificateDoc = React.createElement(CertificatePDF, {
      userName: user.nome,
      courseName: course.titulo,
      date: dataFormatada,
      hash: hashValidacao,
    });

    // Converter PDF para Buffer (CertificatePDF já renderiza <Document><Page>...</Page></Document>)
    const pdfBuffer = await pdf(certificateDoc as Parameters<typeof pdf>[0]).toBuffer();

    // Upload do PDF para Firebase Storage
    const fileName = `certificado_${userId}_${courseId}_${Date.now()}.pdf`;
    const storageRef = ref(storage, `certificados/${fileName}`);
    // Em Node.js toBuffer() retorna Buffer (compatível com Uint8Array); tipagem do pacote declara ReadableStream
    const snapshot = await uploadBytes(storageRef, pdfBuffer as unknown as Uint8Array, {
      contentType: 'application/pdf',
    });

    // Obter URL do PDF
    const pdfUrl = await getDownloadURL(snapshot.ref);

    return NextResponse.json({
      success: true,
      pdfUrl,
      message: 'Certificado gerado com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao gerar certificado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar certificado' },
      { status: 500 }
    );
  }
}
