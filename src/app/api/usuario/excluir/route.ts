import { NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    // Verificar se o usuário está autenticado
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // Verificar se o email fornecido corresponde ao usuário autenticado
    if (currentUser.email !== email) {
      return NextResponse.json(
        { error: "Email não corresponde ao usuário atual" },
        { status: 403 }
      );
    }

    // Excluir dados do usuário do Firestore
    try {
      await deleteDoc(doc(db, "usuarios", currentUser.uid));
    } catch (error) {
      console.error("Erro ao excluir dados do usuário:", error);
      return NextResponse.json(
        { error: "Erro ao excluir dados do usuário" },
        { status: 500 }
      );
    }

    // Excluir a conta do usuário no Firebase Auth
    try {
      await deleteUser(currentUser);
    } catch (error) {
      console.error("Erro ao excluir conta de autenticação:", error);
      return NextResponse.json(
        { error: "Erro ao excluir conta de autenticação" },
        { status: 500 }
      );
    }
    
    // Revalidar caminhos relevantes
    revalidatePath("/");
    revalidatePath("/minhaconta");

    return NextResponse.json(
      { message: "Conta excluída com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao processar exclusão de conta:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
