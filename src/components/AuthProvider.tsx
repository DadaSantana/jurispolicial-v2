'use client'

import { useEffect } from 'react';
import { getSessionCookie, isSessionValid } from '@/utils/cookies';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserData } from '@/services/authService';
import { useDispatch } from 'react-redux';
import { setUserSession, clearUserSession } from '@/app/redux/features/session/sessionSlice';

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const dispatch = useDispatch();

    useEffect(() => {
        // Verificar cookie de sessão e estado do Firebase Auth
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            const sessionCookie = getSessionCookie();
            
            if (user && sessionCookie && isSessionValid(sessionCookie)) {
                // Se temos um usuário do Firebase e um cookie válido, restaurar dados
                try {
                    const userData = await getUserData(user.uid);
                    dispatch(setUserSession({
                        userId: user.uid,
                        expirationTime: sessionCookie.lastLogin + (7 * 24 * 60 * 60 * 1000) // 7 dias em ms
                    }));
                } catch (error) {
                    console.error('Erro ao restaurar sessão:', error);
                    dispatch(clearUserSession());
                }
            } else {
                dispatch(clearUserSession());
            }
        });

        return () => unsubscribe();
    }, [dispatch]);

    return <>{children}</>;
};

export default AuthProvider;
