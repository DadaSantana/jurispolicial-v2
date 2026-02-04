import { Timestamp } from 'firebase/firestore';

export interface Course {
  id: string;
  titulo: string;
  descricao: string;
  imagem: string;
  tipo: 'gratuito' | 'pago';
  valor: number;
  porcentagemMinimaCertificado: number; // Default 100, configurável por curso
  status: 'ativo' | 'inativo';
  asaasProductId?: string;
  asaasPriceId?: string;
  dataCriacao: Timestamp | Date;
  dataAtualizacao?: Timestamp | Date;
}

export interface Module {
  id: string;
  courseId: string;
  titulo: string;
  descricao?: string;
  ordem: number;
  dataCriacao: Timestamp | Date;
}

export interface Lesson {
  id: string;
  moduleId: string;
  courseId: string;
  titulo: string;
  descricao?: string;
  tipo: 'video' | 'texto' | 'pdf';
  url?: string; // URL para vídeo externo ou conteúdo
  pdfUrl?: string; // URL do PDF anexado (Firebase Storage)
  ordem: number;
  duracaoEstimada?: number; // em minutos
  dataCriacao: Timestamp | Date;
}

export interface UserCourseProgress {
  id?: string;
  userId: string;
  courseId: string;
  progresso: number; // porcentagem de conclusão (0-100)
  aulasCompletas: string[]; // array de lessonIds
  dataInicio: Timestamp | Date;
  dataConclusao?: Timestamp | Date;
  certificadoGerado: boolean;
  certificadoUrl?: string;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  dataEmissao: Timestamp | Date;
  pdfUrl: string;
  hashValidacao: string;
}
