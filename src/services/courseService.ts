import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Course, Module, Lesson } from '@/types/course';
import { createPayment, createOrGetCustomer } from './asaasService';

// Criar curso
export const createCourse = async (courseData: Omit<Course, 'id' | 'dataCriacao'>): Promise<string> => {
  try {
    const courseRef = await addDoc(collection(db, 'cursos'), {
      ...courseData,
      dataCriacao: serverTimestamp(),
      porcentagemMinimaCertificado: courseData.porcentagemMinimaCertificado || 100,
    });

    // Se curso é pago, criar produto/preço no Asaas (opcional - pode ser feito manualmente)
    // Por enquanto, vamos apenas salvar os IDs quando criados manualmente no Asaas

    return courseRef.id;
  } catch (error: any) {
    console.error('Erro ao criar curso:', error);
    throw error;
  }
};

// Buscar curso por ID
export const getCourse = async (courseId: string): Promise<Course | null> => {
  try {
    const courseRef = doc(db, 'cursos', courseId);
    const courseDoc = await getDoc(courseRef);

    if (!courseDoc.exists()) {
      return null;
    }

    const data = courseDoc.data();
    return {
      id: courseDoc.id,
      ...data,
      dataCriacao: data.dataCriacao instanceof Timestamp ? data.dataCriacao.toDate() : data.dataCriacao,
      dataAtualizacao: data.dataAtualizacao instanceof Timestamp ? data.dataAtualizacao.toDate() : data.dataAtualizacao,
    } as Course;
  } catch (error: any) {
    console.error('Erro ao buscar curso:', error);
    throw error;
  }
};

// Buscar todos os cursos
export const getAllCourses = async (status?: 'ativo' | 'inativo'): Promise<Course[]> => {
  try {
    let q;
    if (status) {
      q = query(collection(db, 'cursos'), where('status', '==', status));
    } else {
      q = query(collection(db, 'cursos'));
    }

    const querySnapshot = await getDocs(q);
    const courses: Course[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      courses.push({
        id: doc.id,
        ...data,
        dataCriacao: data.dataCriacao instanceof Timestamp ? data.dataCriacao.toDate() : data.dataCriacao,
        dataAtualizacao: data.dataAtualizacao instanceof Timestamp ? data.dataAtualizacao.toDate() : data.dataAtualizacao,
      } as Course);
    });

    return courses.sort((a, b) => {
      const dateA = a.dataCriacao instanceof Date ? a.dataCriacao : new Date(a.dataCriacao);
      const dateB = b.dataCriacao instanceof Date ? b.dataCriacao : new Date(b.dataCriacao);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error: any) {
    console.error('Erro ao buscar cursos:', error);
    throw error;
  }
};

// Atualizar curso
export const updateCourse = async (courseId: string, courseData: Partial<Course>): Promise<void> => {
  try {
    const courseRef = doc(db, 'cursos', courseId);
    await updateDoc(courseRef, {
      ...courseData,
      dataAtualizacao: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Erro ao atualizar curso:', error);
    throw error;
  }
};

// Excluir curso
export const deleteCourse = async (courseId: string): Promise<void> => {
  try {
    const courseRef = doc(db, 'cursos', courseId);
    await deleteDoc(courseRef);
  } catch (error: any) {
    console.error('Erro ao excluir curso:', error);
    throw error;
  }
};

// Criar checkout para curso pago
export const createCourseCheckout = async (
  courseId: string,
  userId: string,
  userEmail: string,
  userName: string,
  userCpf?: string,
  userPhone?: string,
  billingType: 'CREDIT_CARD' | 'PIX' | 'BOLETO' = 'BOLETO'
): Promise<{ checkoutUrl: string; paymentId: string }> => {
  try {
    const course = await getCourse(courseId);
    if (!course) {
      throw new Error('Curso não encontrado');
    }

    if (course.tipo !== 'pago') {
      throw new Error('Curso não é pago');
    }

    // Criar ou buscar cliente no Asaas
    const customerId = await createOrGetCustomer(
      userEmail,
      userName,
      userCpf,
      userPhone
    );

    // Calcular data de vencimento (7 dias)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Criar pagamento no Asaas (igual aos planos)
    const YOUR_DOMAIN = 'https://jurispolicial.com.br';
    
    // Tentar criar pagamento com callback primeiro, se falhar, criar sem
    let payment;
    try {
      const successUrl = `${YOUR_DOMAIN}/dashboard/cursos/${courseId}/success`;
      
      payment = await createPayment({
        customer: customerId,
        billingType: billingType,
        value: course.valor,
        dueDate: dueDateStr,
        description: `Curso: ${course.titulo}`,
        externalReference: `${userId}_course_${courseId}`,
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
        billingType: billingType,
        value: course.valor,
        dueDate: dueDateStr,
        description: `Curso: ${course.titulo}`,
        externalReference: `${userId}_course_${courseId}`,
      });
      
      console.log('✅ Pagamento criado sem callback');
    }

    return {
      checkoutUrl: payment.invoiceUrl || '',
      paymentId: payment.id,
    };
  } catch (error: any) {
    console.error('Erro ao criar checkout do curso:', error);
    throw error;
  }
};

// Criar módulo
export const createModule = async (moduleData: Omit<Module, 'id' | 'dataCriacao'>): Promise<string> => {
  try {
    const moduleRef = await addDoc(collection(db, 'modulos'), {
      ...moduleData,
      dataCriacao: serverTimestamp(),
    });

    return moduleRef.id;
  } catch (error: any) {
    console.error('Erro ao criar módulo:', error);
    throw error;
  }
};

// Buscar módulos do curso
export const getCourseModules = async (courseId: string): Promise<Module[]> => {
  try {
    const q = query(collection(db, 'modulos'), where('courseId', '==', courseId));
    const querySnapshot = await getDocs(q);
    const modules: Module[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      modules.push({
        id: doc.id,
        ...data,
        dataCriacao: data.dataCriacao instanceof Timestamp ? data.dataCriacao.toDate() : data.dataCriacao,
      } as Module);
    });

    return modules.sort((a, b) => a.ordem - b.ordem);
  } catch (error: any) {
    console.error('Erro ao buscar módulos:', error);
    throw error;
  }
};

// Atualizar módulo
export const updateModule = async (moduleId: string, moduleData: Partial<Module>): Promise<void> => {
  try {
    const moduleRef = doc(db, 'modulos', moduleId);
    await updateDoc(moduleRef, moduleData);
  } catch (error: any) {
    console.error('Erro ao atualizar módulo:', error);
    throw error;
  }
};

// Excluir módulo
export const deleteModule = async (moduleId: string): Promise<void> => {
  try {
    const moduleRef = doc(db, 'modulos', moduleId);
    await deleteDoc(moduleRef);
  } catch (error: any) {
    console.error('Erro ao excluir módulo:', error);
    throw error;
  }
};

// Criar aula
export const createLesson = async (lessonData: Omit<Lesson, 'id' | 'dataCriacao'>): Promise<string> => {
  try {
    // Remover campos undefined para evitar erro no Firestore
    const cleanData: any = {
      moduleId: lessonData.moduleId,
      courseId: lessonData.courseId,
      titulo: lessonData.titulo,
      tipo: lessonData.tipo,
      ordem: lessonData.ordem,
      dataCriacao: serverTimestamp(),
    };

    if (lessonData.descricao) {
      cleanData.descricao = lessonData.descricao;
    }
    if (lessonData.url) {
      cleanData.url = lessonData.url;
    }
    if (lessonData.pdfUrl) {
      cleanData.pdfUrl = lessonData.pdfUrl;
    }
    if (lessonData.duracaoEstimada) {
      cleanData.duracaoEstimada = lessonData.duracaoEstimada;
    }

    const lessonRef = await addDoc(collection(db, 'aulas'), cleanData);

    return lessonRef.id;
  } catch (error: any) {
    console.error('Erro ao criar aula:', error);
    throw error;
  }
};

// Buscar aulas do módulo
export const getModuleLessons = async (moduleId: string): Promise<Lesson[]> => {
  try {
    const q = query(collection(db, 'aulas'), where('moduleId', '==', moduleId));
    const querySnapshot = await getDocs(q);
    const lessons: Lesson[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      lessons.push({
        id: doc.id,
        ...data,
        dataCriacao: data.dataCriacao instanceof Timestamp ? data.dataCriacao.toDate() : data.dataCriacao,
      } as Lesson);
    });

    return lessons.sort((a, b) => a.ordem - b.ordem);
  } catch (error: any) {
    console.error('Erro ao buscar aulas:', error);
    throw error;
  }
};

// Buscar todas as aulas do curso
export const getCourseLessons = async (courseId: string): Promise<Lesson[]> => {
  try {
    const q = query(collection(db, 'aulas'), where('courseId', '==', courseId));
    const querySnapshot = await getDocs(q);
    const lessons: Lesson[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      lessons.push({
        id: doc.id,
        ...data,
        dataCriacao: data.dataCriacao instanceof Timestamp ? data.dataCriacao.toDate() : data.dataCriacao,
      } as Lesson);
    });

    return lessons.sort((a, b) => a.ordem - b.ordem);
  } catch (error: any) {
    console.error('Erro ao buscar aulas do curso:', error);
    throw error;
  }
};

// Atualizar aula
export const updateLesson = async (lessonId: string, lessonData: Partial<Lesson>): Promise<void> => {
  try {
    // Remover campos undefined para evitar erro no Firestore
    const cleanData: any = {};
    
    if (lessonData.titulo !== undefined) cleanData.titulo = lessonData.titulo;
    if (lessonData.descricao !== undefined) cleanData.descricao = lessonData.descricao;
    if (lessonData.tipo !== undefined) cleanData.tipo = lessonData.tipo;
    if (lessonData.url !== undefined) cleanData.url = lessonData.url;
    if (lessonData.pdfUrl !== undefined) cleanData.pdfUrl = lessonData.pdfUrl;
    if (lessonData.ordem !== undefined) cleanData.ordem = lessonData.ordem;
    if (lessonData.duracaoEstimada !== undefined) cleanData.duracaoEstimada = lessonData.duracaoEstimada;

    const lessonRef = doc(db, 'aulas', lessonId);
    await updateDoc(lessonRef, cleanData);
  } catch (error: any) {
    console.error('Erro ao atualizar aula:', error);
    throw error;
  }
};

// Excluir aula
export const deleteLesson = async (lessonId: string): Promise<void> => {
  try {
    const lessonRef = doc(db, 'aulas', lessonId);
    await deleteDoc(lessonRef);
  } catch (error: any) {
    console.error('Erro ao excluir aula:', error);
    throw error;
  }
};
