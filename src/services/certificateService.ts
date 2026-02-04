import { db, storage } from '@/lib/firebase';
import { collection, doc, addDoc, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Certificate } from '@/types/course';
import { getCourse } from './courseService';
import { getUserCourseProgress } from './courseProgressService';
import { getUserData } from './authService';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
// Usar Web Crypto API no lado do cliente ou crypto nativo no servidor
const generateHash = (data: string): string => {
  // Para Node.js (server-side)
  if (typeof window === 'undefined') {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16).toUpperCase();
  }
  // Para browser (client-side) - usar Web Crypto API ou uma biblioteca
  // Por enquanto, usar uma função simples baseada em timestamp
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(16, '0');
};

// O PDF será gerado na API route usando @react-pdf/renderer

// Gerar hash de validação único
const generateValidationHash = (userId: string, courseId: string): string => {
  const timestamp = Date.now().toString();
  const data = `${userId}_${courseId}_${timestamp}`;
  return generateHash(data);
};

// Gerar certificado em PDF
export const generateCertificate = async (
  userId: string,
  courseId: string
): Promise<{ certificateId: string; pdfUrl: string; hashValidacao: string }> => {
  try {
    // Verificar se já existe certificado
    const existingCert = await getCertificateByUserAndCourse(userId, courseId);
    if (existingCert) {
      return {
        certificateId: existingCert.id,
        pdfUrl: existingCert.pdfUrl,
        hashValidacao: existingCert.hashValidacao,
      };
    }

    // Buscar dados do usuário
    const user = await getUserData(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Buscar dados do curso
    const course = await getCourse(courseId);
    if (!course) {
      throw new Error('Curso não encontrado');
    }

    // Verificar se usuário concluiu o curso
    const progress = await getUserCourseProgress(userId, courseId);
    if (!progress || !progress.dataConclusao) {
      throw new Error('Usuário ainda não concluiu o curso');
    }

    // Gerar hash de validação
    const hashValidacao = generateValidationHash(userId, courseId);

    // Chamar API para gerar PDF (o PDF será gerado na API route)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/certificados/gerar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        courseId,
        hashValidacao,
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao gerar PDF do certificado');
    }

    const { pdfUrl } = await response.json();

    // Salvar certificado no Firestore (serverTimestamp() é FieldValue na escrita)
    const certificateRef = await addDoc(collection(db, 'certificados'), {
      userId,
      courseId,
      dataEmissao: serverTimestamp(),
      pdfUrl,
      hashValidacao,
    });

    // Atualizar progresso do curso para marcar certificado como gerado
    if (progress.id) {
      const { updateDoc } = await import('firebase/firestore');
      const progressRef = doc(db, 'userCourseProgress', progress.id);
      await updateDoc(progressRef, {
        certificadoGerado: true,
        certificadoUrl: pdfUrl,
      });
    }

    return {
      certificateId: certificateRef.id,
      pdfUrl,
      hashValidacao,
    };
  } catch (error: any) {
    console.error('Erro ao gerar certificado:', error);
    throw error;
  }
};

// Buscar certificado por hash de validação
export const getCertificateByHash = async (hash: string): Promise<Certificate | null> => {
  try {
    const q = query(collection(db, 'certificados'), where('hashValidacao', '==', hash));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      ...data,
      dataEmissao: data.dataEmissao instanceof Timestamp ? data.dataEmissao.toDate() : data.dataEmissao,
    } as Certificate;
  } catch (error: any) {
    console.error('Erro ao buscar certificado por hash:', error);
    throw error;
  }
};

// Buscar certificado por usuário e curso
export const getCertificateByUserAndCourse = async (
  userId: string,
  courseId: string
): Promise<Certificate | null> => {
  try {
    const q = query(
      collection(db, 'certificados'),
      where('userId', '==', userId),
      where('courseId', '==', courseId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      ...data,
      dataEmissao: data.dataEmissao instanceof Timestamp ? data.dataEmissao.toDate() : data.dataEmissao,
    } as Certificate;
  } catch (error: any) {
    console.error('Erro ao buscar certificado:', error);
    throw error;
  }
};

// Buscar todos os certificados do usuário
export const getUserCertificates = async (userId: string): Promise<Certificate[]> => {
  try {
    const q = query(collection(db, 'certificados'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const certificates: Certificate[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      certificates.push({
        id: doc.id,
        ...data,
        dataEmissao: data.dataEmissao instanceof Timestamp ? data.dataEmissao.toDate() : data.dataEmissao,
      } as Certificate);
    });

    return certificates.sort((a, b) => {
      const rawA = a.dataEmissao as Date | Timestamp | string | number;
      const rawB = b.dataEmissao as Date | Timestamp | string | number;
      const dateA = rawA instanceof Date ? rawA : rawA instanceof Timestamp ? rawA.toDate() : new Date(rawA as string | number);
      const dateB = rawB instanceof Date ? rawB : rawB instanceof Timestamp ? rawB.toDate() : new Date(rawB as string | number);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error: any) {
    console.error('Erro ao buscar certificados do usuário:', error);
    throw error;
  }
};
