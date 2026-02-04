import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

// Buscar produtos comprados pelo usuário
export const getUserPurchasedProducts = async (
  userId: string
): Promise<string[]> => {
  try {
    const q = query(
      collection(db, 'productPurchases'),
      where('userId', '==', userId),
      where('status', '==', 'completed')
    );
    
    const querySnapshot = await getDocs(q);
    const purchasedProductIds: string[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.productId) {
        purchasedProductIds.push(data.productId);
      }
    });

    return purchasedProductIds;
  } catch (error: any) {
    console.error('Erro ao buscar produtos comprados:', error);
    // Retornar array vazio em caso de erro
    return [];
  }
};

// Buscar todos os produtos disponíveis
export const getAllProducts = async (): Promise<any[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'produtos'));
    const products: any[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Verificar se o produto está disponível (não exclusivo ou dentro do período)
      const now = new Date();
      const dataInicio = data.dataInicio instanceof Timestamp 
        ? data.dataInicio.toDate() 
        : data.dataInicio ? new Date(data.dataInicio) : null;
      const dataFim = data.dataFim instanceof Timestamp 
        ? data.dataFim.toDate() 
        : data.dataFim ? new Date(data.dataFim) : null;

      const isAvailable = !data.exclusivo || 
        (dataInicio && dataFim && now >= dataInicio && now <= dataFim) ||
        (!dataInicio && !dataFim);

      if (isAvailable) {
        products.push({
          id: doc.id,
          titulo: data.titulo,
          descricao: data.descricao,
          tipo: data.tipo,
          valor: data.valor,
          imagem: data.imagem,
          exclusivo: data.exclusivo,
          dataCriacao: data.dataCriacao instanceof Timestamp 
            ? data.dataCriacao.toDate() 
            : new Date(),
          dataInicio: dataInicio,
          dataFim: dataFim,
        });
      }
    });

    return products;
  } catch (error: any) {
    console.error('Erro ao buscar produtos:', error);
    throw error;
  }
};
