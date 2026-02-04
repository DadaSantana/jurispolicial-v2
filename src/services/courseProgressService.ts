import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { UserCourseProgress } from '@/types/course';
import { getCourseLessons } from './courseService';
import { generateCertificate } from './certificateService';

// Criar progresso inicial do curso para o usuário
export const createUserCourseProgress = async (
  userId: string,
  courseId: string
): Promise<string> => {
  try {
    // Verificar se já existe progresso
    const existingProgress = await getUserCourseProgress(userId, courseId);
    if (existingProgress) {
      return existingProgress.id || '';
    }

    const progressRef = await addDoc(collection(db, 'userCourseProgress'), {
      userId,
      courseId,
      progresso: 0,
      aulasCompletas: [],
      dataInicio: serverTimestamp(),
      certificadoGerado: false,
    });

    return progressRef.id;
  } catch (error: any) {
    console.error('Erro ao criar progresso do curso:', error);
    throw error;
  }
};

// Buscar progresso do usuário no curso
export const getUserCourseProgress = async (
  userId: string,
  courseId: string
): Promise<UserCourseProgress | null> => {
  try {
    const q = query(
      collection(db, 'userCourseProgress'),
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
      dataInicio: data.dataInicio instanceof Timestamp ? data.dataInicio.toDate() : data.dataInicio,
      dataConclusao: data.dataConclusao instanceof Timestamp ? data.dataConclusao.toDate() : data.dataConclusao,
    } as UserCourseProgress;
  } catch (error: any) {
    console.error('Erro ao buscar progresso do curso:', error);
    throw error;
  }
};

// Buscar todos os cursos em progresso do usuário
export const getUserCoursesProgress = async (
  userId: string
): Promise<UserCourseProgress[]> => {
  try {
    const q = query(
      collection(db, 'userCourseProgress'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const progresses: UserCourseProgress[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      progresses.push({
        id: doc.id,
        ...data,
        dataInicio: data.dataInicio instanceof Timestamp ? data.dataInicio.toDate() : data.dataInicio,
        dataConclusao: data.dataConclusao instanceof Timestamp ? data.dataConclusao.toDate() : data.dataConclusao,
      } as UserCourseProgress);
    });

    return progresses;
  } catch (error: any) {
    console.error('Erro ao buscar progressos dos cursos:', error);
    throw error;
  }
};

// Marcar aula como completa
export const markLessonComplete = async (
  userId: string,
  courseId: string,
  lessonId: string
): Promise<void> => {
  try {
    // Buscar ou criar progresso
    let progress = await getUserCourseProgress(userId, courseId);
    if (!progress) {
      await createUserCourseProgress(userId, courseId);
      progress = await getUserCourseProgress(userId, courseId);
    }

    if (!progress || !progress.id) {
      throw new Error('Erro ao criar/buscar progresso');
    }

    // Se a aula já está completa, não fazer nada
    if (progress.aulasCompletas.includes(lessonId)) {
      return;
    }

    // Adicionar aula ao array de aulas completas
    const updatedCompletedLessons = [...progress.aulasCompletas, lessonId];

    // Calcular novo progresso
    const newProgress = await calculateProgress(userId, courseId);

    // Verificar se concluiu o curso e gerar certificado se elegível
    const courseProgress = await getUserCourseProgress(userId, courseId);
    if (courseProgress && !courseProgress.certificadoGerado) {
      const isEligible = await checkCertificateEligibility(userId, courseId);
      if (isEligible) {
        // Gerar certificado automaticamente
        await generateCertificate(userId, courseId);
      }
    }

    // Atualizar progresso
    const progressRef = doc(db, 'userCourseProgress', progress.id);
    await updateDoc(progressRef, {
      aulasCompletas: updatedCompletedLessons,
      progresso: newProgress,
      ...(newProgress === 100 && !progress.dataConclusao ? { dataConclusao: serverTimestamp() } : {}),
    });
  } catch (error: any) {
    console.error('Erro ao marcar aula como completa:', error);
    throw error;
  }
};

// Calcular porcentagem de progresso
export const calculateProgress = async (
  userId: string,
  courseId: string
): Promise<number> => {
  try {
    const progress = await getUserCourseProgress(userId, courseId);
    if (!progress) {
      return 0;
    }

    // Buscar todas as aulas do curso
    const lessons = await getCourseLessons(courseId);
    if (lessons.length === 0) {
      return 0;
    }

    // Calcular porcentagem
    const completedLessons = progress.aulasCompletas.length;
    const totalLessons = lessons.length;
    const percentage = Math.round((completedLessons / totalLessons) * 100);

    return percentage;
  } catch (error: any) {
    console.error('Erro ao calcular progresso:', error);
    throw error;
  }
};

// Verificar se usuário é elegível para certificado
export const checkCertificateEligibility = async (
  userId: string,
  courseId: string
): Promise<boolean> => {
  try {
    const progress = await getUserCourseProgress(userId, courseId);
    if (!progress || progress.certificadoGerado) {
      return false;
    }

    // Buscar curso para obter porcentagem mínima
    const { getCourse } = await import('./courseService');
    const course = await getCourse(courseId);
    if (!course) {
      return false;
    }

    const minimumPercentage = course.porcentagemMinimaCertificado || 100;

    // Verificar se atingiu a porcentagem mínima
    return progress.progresso >= minimumPercentage;
  } catch (error: any) {
    console.error('Erro ao verificar elegibilidade do certificado:', error);
    return false;
  }
};

// Buscar todos os inscritos em um curso
export const getCourseEnrollments = async (courseId: string): Promise<{
  progress: UserCourseProgress;
  user: any;
}[]> => {
  try {
    const q = query(
      collection(db, 'userCourseProgress'),
      where('courseId', '==', courseId)
    );
    const querySnapshot = await getDocs(q);
    const enrollments: { progress: UserCourseProgress; user: any }[] = [];

    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      const progress: UserCourseProgress = {
        id: docSnap.id,
        ...data,
        dataInicio: data.dataInicio instanceof Timestamp ? data.dataInicio.toDate() : data.dataInicio,
        dataConclusao: data.dataConclusao instanceof Timestamp ? data.dataConclusao.toDate() : data.dataConclusao,
      } as UserCourseProgress;

      // Buscar dados do usuário
      try {
        const userRef = doc(db, 'users', progress.userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          enrollments.push({
            progress,
            user: userData,
          });
        }
      } catch (error) {
        console.error(`Erro ao buscar usuário ${progress.userId}:`, error);
      }
    }

    // Ordenar por data de início (mais recentes primeiro)
    enrollments.sort((a, b) => {
      const rawA = a.progress.dataInicio as Date | Timestamp | string | number;
      const rawB = b.progress.dataInicio as Date | Timestamp | string | number;
      const dateA = rawA instanceof Date ? rawA : rawA instanceof Timestamp ? rawA.toDate() : new Date(rawA as string | number);
      const dateB = rawB instanceof Date ? rawB : rawB instanceof Timestamp ? rawB.toDate() : new Date(rawB as string | number);
      return dateB.getTime() - dateA.getTime();
    });

    return enrollments;
  } catch (error: any) {
    console.error('Erro ao buscar inscritos do curso:', error);
    throw error;
  }
};
