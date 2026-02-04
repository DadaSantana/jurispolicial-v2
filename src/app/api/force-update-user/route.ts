import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId é obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🔥 FORÇANDO ATUALIZAÇÃO DIRETA DO USUÁRIO:', userId);
    
    // Buscar dados atuais
    const userRef = doc(db, 'usuarios', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const currentData = userDoc.data();
    console.log('📋 Dados atuais:', currentData.plano);
    
    // Forçar atualização do plano
    const updatedData = {
      ...currentData,
      plano: {
        ...currentData.plano,
        tipo: 'mensal',
        status: 'ativo',
        inicio: new Date(),
        termino: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        asaasCustomerId: 'cus_000007224520',
        asaasSubscriptionId: 'sub_b2dalsbgsm8bfier',
      }
    };
    
    await setDoc(userRef, updatedData);
    
    console.log('✅ Usuário atualizado com força bruta:', updatedData.plano);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Usuário atualizado com sucesso',
      plano: updatedData.plano
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('❌ Erro ao forçar atualização:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Erro interno do servidor',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

