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

    console.log('🔥 FORÇANDO ATUALIZAÇÃO DO USUÁRIO:', userId);
    
    // Importar Firebase Admin
    const admin = await import('firebase-admin');
    
    // Forçar atualização direta no Firestore
    const userRef = admin.firestore().collection('usuarios').doc(userId);
    await userRef.set({
      plano: {
        tipo: 'mensal',
        inicio: admin.firestore.Timestamp.now(),
        termino: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        status: 'ativo',
        asaasCustomerId: 'cus_000007224520',
        asaasSubscriptionId: 'sub_b2dalsbgsm8bfier',
      }
    }, { merge: true });
    
    console.log('✅ Usuário atualizado diretamente');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Usuário atualizado com sucesso' 
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

