'use client'
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoginForm from '@/components/LoginForm';
import RegisterForm from '@/components/RegisterForm';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { setUser } from '../redux/features/users/userSlice';

const SubscriptionLogin = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('login');
  const dispatch = useDispatch();
  
  // Extract planId from URL query parameters
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan');
  
  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // If user is logged in, redirect to checkout with the plan
        dispatch(setUser(user))
        if (planId) {
          router.push(`/checkout?plan=${planId}`);
        } else {
          router.push('/dashboard');
        }
      }
    });
    
    return () => unsubscribe();
  }, [planId]);
  
  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 bg-gray-50">
      <div className="w-full max-w-md px-4">
        <Card className="shadow-xl rounded-xl overflow-hidden">
          <CardHeader className="text-center bg-primary text-white">
            <CardTitle className="text-2xl font-bold">
              {planId ? 'Acesso para Assinatura' : 'Entrar na sua conta'}
            </CardTitle>
            <CardDescription className="text-white/90">
              {planId 
                ? `Faça login ou crie uma conta para assinar o plano ${planId.charAt(0).toUpperCase() + planId.slice(1)}` 
                : 'Faça login ou crie uma nova conta'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-4 rounded-b-xl">
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Cadastro</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <LoginForm redirectTo={planId ? `/checkout?plan=${planId}` : '/dashboard'} />
                <div className="mt-4 text-center">
                  <button 
                    onClick={() => setActiveTab('register')}
                    className="text-primary hover:underline text-sm"
                  >
                    Não tem uma conta? Cadastre-se
                  </button>
                </div>
              </TabsContent>
              <TabsContent value="register">
                <RegisterForm redirectTo={planId ? `/checkout?plan=${planId}` : '/dashboard'} />
                <div className="mt-4 text-center">
                  <button 
                    onClick={() => setActiveTab('login')}
                    className="text-primary hover:underline text-sm"
                  >
                    Já possui uma conta? Faça login
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center text-primary hover:underline">
            <ArrowLeft size={16} className="mr-1" /> Voltar para a página inicial
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionLogin;
