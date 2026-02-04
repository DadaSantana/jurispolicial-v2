'use client'
import React, { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { getCurrentUser } from '@/services/authService';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import { User } from '@/types/user';
import { Provider, useDispatch } from 'react-redux';
import { getSessionCookie, isSessionValid } from '@/utils/cookies';
import { setUser } from '@/app/redux/features/users/userSlice';
import { store } from '@/app/redux/store';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

type Props = {
    children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUserData] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const isMobile = useIsMobile();
    const dispatch = useDispatch();
    const { uid } = useParams<{ uid: string }>()

    useEffect(() => {
        const checkSession = async () => {
            const session = getSessionCookie();
            if (!session || !isSessionValid(session)) {
                setUserData(null);
                setLoading(false);
                router.push('/login');
                return;
            }

            const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
                if (authUser && authUser.uid === session.uid) {
                    try {
                        const userData = await getCurrentUser(authUser.uid);
                        if (userData) {
                            setUserData(userData);
                            dispatch(setUser(userData));

                            if (userData.role === 'admin' && !window.location.pathname.includes('/admin')) {
                                router.push('/admin/dashboard');
                            }
                        } else {
                            router.push('/login');
                        }
                    } catch (error) {
                        console.error("Error fetching user data:", error);
                        router.push('/login');
                    }
                } else {
                    setUser(null);
                    router.push('/login');
                }
                setLoading(false);
            });

            return () => unsubscribe();
        };

        if (!pathname.includes('/subscription/success')) {
            checkSession();
            setLoading(true);
        } else {

            setTimeout(async () => {
                const userData = await getCurrentUser(uid)
                setUserData(userData)
                dispatch(setUser(userData))
                setLoading(false)
            })
        }
    }, [router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <Provider store={store}>
            <div className="flex h-screen">
                <AdminSidebar user={user} />
                <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
                    {children}
                </main>
            </div>
        </Provider>
    );
};

export default Layout;
