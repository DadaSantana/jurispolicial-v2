export interface User {
  uid: string;
  email: string | null;
  nome: string;
  cpf: string;
  telefone?: string;
  role: 'membro' | 'admin';
  creditos: number;
  dataCadastro: Date;
  ultimoLogin: Date;
  plano?: {
    tipo: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'gratuito' | 'teste' | 'trial';
    inicio?: Date;
    termino?: Date;
    status?: 'ativo' | 'inativo' | 'trial' | 'cancelado';
    asaasSubscriptionId?: string;
    asaasCustomerId?: string;
    // Mantido para compatibilidade durante migração
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
  };
}

export interface Consulta {
  id: string;
  userId: string;
  assunto: string;
  mensagens: Mensagem[];
  dataCriacao: {
    seconds: number;
    nanoseconds: number;
  } | Date;
  tags: Tag[];
  relatorio?: string;
  analise?: string;
  qualificacoes?: Qualificacao[];
}

export interface Mensagem {
  id: string;
  texto: string;
  remetente: 'usuario' | 'ia' | 'negative-report' | 'info-report' | 'success-report';
  data: Date;
}

export interface Tag {
  id: string;
  texto: string;
  nivel: 'normal' | 'atencao' | 'importante';
}

export interface Qualificacao {
  id?: string;
  texto: string;
  tipo: 'warning' | 'info' | 'success';
}

import { Timestamp } from 'firebase/firestore';

export type Conteudo = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'pdf' | 'video';
  valor: number;
  url: string;
  imagem: string;
  arquivo: string;
  exclusivo: boolean;
  dataInicio: Date | null;
  dataFim: Date | null;
  dataCriacao: Timestamp;
};

export interface Post {
  id: string;
  titulo: string;
  descricao: string;
  imagem: string;
  linkInstagram: string;
  dataCriacao: Date;
}

export interface Produto {
  id: string;
  titulo: string;
  descricao: string;
  valor: number;
  imagem: string;
  tipo: 'fisico' | 'digital';
  asaasProductId?: string;
  asaasPriceId?: string;
  dataCriacao: Date;
  exclusivo: boolean;
  dataInicio?: Date | null;
  dataFim?: Date | null;
  // Mantido para compatibilidade durante migração
  stripeProductId?: string;
  stripePriceId?: string;
}
