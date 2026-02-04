import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, increment } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { toast } from "@/hooks/use-toast";
import { User } from "@/types/user";
import { setSessionCookie, removeSessionCookie, getSessionCookie, isSessionValid } from "@/utils/cookies";

// Function to get user data by UID
export const getUserData = async (uid: string) => {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      
      // Função auxiliar para converter Timestamp para Date
      const toDate = (value: any): Date => {
        if (!value) return new Date();
        if (value.toDate && typeof value.toDate === 'function') {
          return value.toDate();
        }
        if (value instanceof Date) {
          return value;
        }
        if (typeof value === 'string' || typeof value === 'number') {
          return new Date(value);
        }
        // Se for objeto vazio ou inválido, retornar Date atual
        if (typeof value === 'object' && Object.keys(value).length === 0) {
          return new Date();
        }
        return new Date();
      };
      
      // Converter Timestamps do Firebase para Date serializável
      return {
        ...data,
        dataCadastro: toDate(data.dataCadastro),
        ultimoLogin: toDate(data.ultimoLogin),
        plano: data.plano ? {
          ...data.plano,
          inicio: data.plano.inicio ? toDate(data.plano.inicio) : undefined,
          termino: data.plano.termino ? toDate(data.plano.termino) : undefined,
        } : data.plano
      } as User;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting user data:", error);
    throw error;
  }
};

// Register a new user
export const registerUser = async (email: string, password: string, nome: string, cpf: string, telefone?: string) => {
  try {
    // Check if CPF already exists
    const cpfExists = await checkUserByCPF(cpf);
    if (cpfExists) {
      toast({
        title: "CPF já cadastrado",
        description: "Este CPF já está em uso no sistema.",
        variant: "destructive"
      });
      throw new Error("CPF already exists");
    }
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user document in Firestore
    const newUser: User = {
      uid: user.uid,
      email: user.email,
      nome,
      cpf,
      telefone,
      role: 'membro',
      creditos: 5,
      dataCadastro: new Date(),
      ultimoLogin: new Date(),
      plano: {
        tipo: 'gratuito',
        status: 'trial'
      }
    };

    await setDoc(doc(db, "users", user.uid), newUser);

    // Set session cookie
    setSessionCookie({
      uid: user.uid,
      email: user.email,
      lastLogin: Date.now()
    });

    toast({
      title: "Cadastro realizado com sucesso!",
      description: "Você recebeu 5 créditos para testes.",
    });

    return newUser;
  } catch (error: any) {
    console.error("Error registering user:", error);
    if (error.code === 'auth/email-already-in-use') {
      toast({
        title: "Email já cadastrado",
        description: "Este email já está em uso no sistema.",
        variant: "destructive"
      });
    }
    throw error;
  }
};

// Login user
export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user data from Firestore
    const userData = await getUserData(user.uid);
    if (!userData) {
      throw new Error("User data not found");
    }

    // Update last login
    await updateDoc(doc(db, "users", user.uid), {
      ultimoLogin: new Date()
    });

    // Set session cookie
    setSessionCookie({
      uid: user.uid,
      email: user.email,
      lastLogin: Date.now()
    });

    toast({
      title: "Login realizado",
      description: "Seja bem-vindo novamente!",
    });

    return userData;
  } catch (error: any) {
    console.error("Error logging in:", error);
    if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      toast({
        title: "Credenciais inválidas",
        description: "Email ou senha incorretos.",
        variant: "destructive"
      });
    }
    throw error;
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    await signOut(auth);
    removeSessionCookie();
    toast({
      title: "Logout realizado",
      description: "Você saiu da sua conta.",
    });
  } catch (error) {
    console.error("Error logging out:", error);
    throw error;
  }
};

// Check if user exists by CPF
export const checkUserByCPF = async (cpf: string) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("cpf", "==", cpf));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking CPF:", error);
    throw error;
  }
};

// Get current user data
export const getCurrentUser = async (uid: string) => {
  try {
    // Check session cookie first
    const session = getSessionCookie();
    if (!session || !isSessionValid(session)) {
      removeSessionCookie();
      return null;
    }

    const userData = await getUserData(uid);
    if (!userData) {
      removeSessionCookie();
      return null;
    }

    return userData;
  } catch (error) {
    console.error("Error getting current user:", error);
    throw error;
  }
};

// Deduct credits from user
export const deductUserCredits = async (uid: string, credits: number = 1) => {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error("User not found");
    }

    const userData = userDoc.data() as User;
    if (userData.creditos < credits) {
      toast({
        title: "Créditos insuficientes",
        description: "Você não possui créditos suficientes para esta operação.",
        variant: "destructive"
      });
      throw new Error("Insufficient credits");
    }

    await updateDoc(userRef, {
      creditos: increment(-credits)
    });

    toast({
      title: "Créditos debitados",
      description: `${credits} crédito${credits > 1 ? 's' : ''} utilizado${credits > 1 ? 's' : ''}.`,
    });

    return true;
  } catch (error) {
    console.error("Error deducting credits:", error);
    throw error;
  }
};

// Send password reset email
export const sendPasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    toast({
      title: "E-mail enviado",
      description: "Verifique sua caixa de entrada para redefinir sua senha.",
    });
    return true;
  } catch (error: any) {
    console.error("Error sending password reset email:", error);
    if (error.code === 'auth/user-not-found') {
      toast({
        title: "E-mail não encontrado",
        description: "Não encontramos nenhuma conta com este e-mail.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Erro ao enviar e-mail",
        description: "Ocorreu um erro ao tentar enviar o e-mail de recuperação.",
        variant: "destructive"
      });
    }
    throw error;
  }
};
