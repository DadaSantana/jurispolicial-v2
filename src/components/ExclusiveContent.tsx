'use client'
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Video, MessageCircle, BookOpen } from 'lucide-react';
import Link from 'next/link';

const exclusiveContent = [
  {
    id: 1,
    title: 'Guias e Manuais Completos',
    description: 'Acesse manuais detalhados sobre procedimentos policiais, elaboração de relatórios e boas práticas.',
    icon: FileText,
  },
  {
    id: 2,
    title: 'Videoaulas Exclusivas',
    description: 'Aprenda com nossos especialistas através de vídeos detalhados sobre temas relevantes para sua carreira.',
    icon: Video,
  },
  {
    id: 3,
    title: 'Consultoria Especializada',
    description: 'Tire suas dúvidas diretamente com especialistas em Direito Penal e Processual Penal.',
    icon: MessageCircle,
  },
  {
    id: 4,
    title: 'Cursos com Certificados',
    description: 'Complete cursos especializados e receba certificados reconhecidos automaticamente.',
    icon: BookOpen,
  }
];

const ExclusiveContent = () => {
  return (
    <section id="conteudos" className="py-16 bg-gradient-to-br from-primary-dark via-primary to-primary-medium text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Conteúdos Exclusivos</h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            Disponíveis para assinantes do plano anual. Acesse cursos, materiais exclusivos e muito mais para transformar sua atuação profissional
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {exclusiveContent.map((item) => {
            const IconComponent = item.icon;
            
            return (
              <div key={item.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors">
                <div className="rounded-full bg-white/20 w-14 h-14 flex items-center justify-center mb-4 mx-auto">
                  <IconComponent size={24} className="text-white" />
                </div>
                
                <h3 className="text-xl font-bold mb-3 text-center">{item.title}</h3>
                <p className="text-white/80 text-center mb-6">{item.description}</p>
              </div>
            );
          })}
        </div>
        
        <div className="text-center mt-12">
          <Button asChild className="bg-white text-primary hover:bg-gray-100">
            <Link href="/planos">Assine o Plano Anual</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ExclusiveContent;
