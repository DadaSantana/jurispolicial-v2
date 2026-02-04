import { Timestamp } from 'firebase/firestore';

export type Post = {
  id: string;
  titulo: string;
  descricao: string;
  imagem: string;
  linkInstagram: string;
  dataCriacao: Timestamp;
  exclusivo?: boolean;
};