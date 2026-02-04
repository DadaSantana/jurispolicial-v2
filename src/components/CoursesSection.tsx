'use client'
import React from 'react';
import { Button } from '@/components/ui/button';
import { GraduationCap, Award, BookOpen, Clock } from 'lucide-react';
import Link from 'next/link';

const CoursesSection = () => {
  const features = [
    {
      icon: GraduationCap,
      title: 'Cursos Online',
      description: 'Acesse cursos completos com módulos estruturados e aulas práticas',
    },
    {
      icon: BookOpen,
      title: 'Materiais em PDF',
      description: 'Baixe materiais complementares e anexos em PDF para cada aula',
    },
    {
      icon: Award,
      title: 'Certificados',
      description: 'Receba certificados automaticamente ao concluir os cursos',
    },
    {
      icon: Clock,
      title: 'Acesso Ilimitado',
      description: 'Estude no seu ritmo, quando e onde quiser',
    },
  ];

  return (
    <section id="cursos" className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Cursos Online Profissionais
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Aprimore seus conhecimentos com nossos cursos especializados. 
            Cursos gratuitos e pagos com certificados reconhecidos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary/20"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <IconComponent className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-8 md:p-12 text-white text-center">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Comece sua jornada de aprendizado hoje
            </h3>
            <p className="text-lg text-white/90 mb-8">
              Explore nossa plataforma de cursos e descubra como podemos ajudar você a alcançar seus objetivos profissionais
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-white text-primary hover:bg-gray-100 rounded-full px-8 py-6 text-lg font-semibold"
              >
                <Link href="/dashboard/cursos">Ver Cursos Disponíveis</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-white bg-transparent text-white hover:bg-white hover:text-primary rounded-full px-8 py-6 text-lg font-semibold transition-all"
              >
                <Link href="/cadastro">Criar Conta Gratuita</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CoursesSection;
