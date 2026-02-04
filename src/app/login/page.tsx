'use client'
import React from 'react';
import LoginForm from '@/components/LoginForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Shield, Zap, Award, BookOpen, GraduationCap } from 'lucide-react';

const Page = () => {
  const features = [
    {
      icon: Shield,
      title: 'Seguro e Confiável',
      description: 'Seus dados protegidos com criptografia de ponta',
    },
    {
      icon: Zap,
      title: 'Rápido e Eficiente',
      description: 'Gere relatórios em minutos, não em horas',
    },
    {
      icon: Award,
      title: 'Certificados',
      description: 'Receba certificados ao concluir cursos',
    },
    {
      icon: BookOpen,
      title: 'Cursos Online',
      description: 'Acesse cursos especializados a qualquer momento',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center py-12 px-4 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">JurisPolicial</h1>
            <p className="text-gray-600">Faça login para acessar sua conta</p>
          </div>

          <Card className="shadow-2xl rounded-2xl overflow-hidden border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center bg-gradient-to-r from-primary to-primary-dark text-white pb-4">
              <CardTitle className="text-2xl font-bold">Bem-vindo de volta!</CardTitle>
              <CardDescription className="text-white/90">
                Entre com suas credenciais para continuar
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              <LoginForm />
            </CardContent>
          </Card>
          
          <div className="mt-6 text-center">
            <Link 
              href="/" 
              className="inline-flex items-center text-gray-600 hover:text-primary transition-colors font-medium"
            >
              <ArrowLeft size={16} className="mr-2" /> 
              Voltar para a página inicial
            </Link>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-2">Não tem uma conta?</p>
            <Link 
              href="/cadastro" 
              className="text-primary hover:text-primary-dark font-semibold transition-colors"
            >
              Criar conta gratuita →
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Features */}
      <div className="w-full lg:w-1/2 bg-gradient-to-br from-primary via-primary-dark to-primary flex flex-col justify-center items-center py-12 px-4 lg:px-12 text-white">
        <div className="max-w-lg">
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Plataforma Completa para Profissionais
            </h2>
            <p className="text-lg text-white/90">
              Acesse ferramentas avançadas, cursos especializados e muito mais
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all"
                >
                  <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center mb-4">
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-white/80 text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
