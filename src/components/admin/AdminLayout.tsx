
import React, { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { AdminSidebar } from './AdminSidebar';
import { getCurrentUser } from '@/services/authService';
import { User } from '@/types/user';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const AdminLayout = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        try {
          const userData = await getCurrentUser(authUser.uid);
          
          if (userData?.role !== 'admin') {
            // Redirect non-admin users
            router.push('/dashboard');
            return;
          }
          
          setUser(userData);
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

  if (!user || user.role !== 'admin') {
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* <AdminSidebar user={user} /> */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-10">
          <div className="container mx-auto px-4 py-8">
            
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
