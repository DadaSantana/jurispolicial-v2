'use client'
import React, { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import Sidebar from './Sidebar';
import { getCurrentUser } from '@/services/authService';
import { User } from '@/types/user';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter } from 'next/navigation';

const DashboardLayout = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        try {
          const userData = await getCurrentUser(authUser.uid);
          setUser(userData);
          
          // Check if admin and redirect if needed
          if (userData?.role === 'admin' && !window.location.pathname.includes('/admin')) {
            router.push('/admin/dashboard');
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');  
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className={`flex-1 overflow-y-auto pb-${isMobile ? '20' : '10'}`}>
          {isMobile && (
            <div className="p-4 bg-primary text-white">
              <h1 className="text-xl font-semibold">JurisPolicial</h1>
              <p className="text-sm opacity-75">{/* {user.nome} */}</p>
            </div>
          )}
          <div className="container mx-auto px-4 py-8">
           {/*  <Outlet context={user} /> */}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
