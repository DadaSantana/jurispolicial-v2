import { Timestamp } from 'firebase/firestore';

export interface ChatMessage {
  id: string;
  conteudoId: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: Timestamp;
  isAdmin: boolean;
}
