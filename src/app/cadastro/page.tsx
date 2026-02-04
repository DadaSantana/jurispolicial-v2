'use client'
import React from 'react';
import RegisterForm from '@/components/RegisterForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const Register = () => {
    return (
        <div className="min-h-screen flex flex-col justify-center items-center py-12 bg-gray-50">
            <div className="w-full max-w-md px-4">
                <Card className="shadow-xl rounded-xl overflow-hidden">
                    <CardHeader className="text-center bg-primary text-white">
                        <CardTitle className="text-2xl font-bold">Cadastro</CardTitle>
                        <CardDescription className="text-white/90">
                            Crie sua conta no JurisPolicial e comece a gerar relatórios profissionais
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 rounded-b-xl">
                        <RegisterForm />
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

export default Register;
