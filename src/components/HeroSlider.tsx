'use client'
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const slides = [
  {
    id: 1,
    title: 'Sistema Especializado para Relatórios Policiais',
    description: 'Gere relatórios precisos, completos e padronizados para ocorrências policiais em minutos com inteligência artificial.',
    image: '/images/slide_1.jpg',
    ctaText: 'Experimente Gratuitamente',
    ctaLink: '/cadastro'
  },
  {
    id: 2,
    title: 'Cursos Online com Certificados',
    description: 'Aprimore seus conhecimentos com cursos especializados. Cursos gratuitos e pagos com certificados reconhecidos.',
    image: '/images/slide_2.jpeg',
    ctaText: 'Explorar Cursos',
    ctaLink: '#cursos'
  },
  {
    id: 3,
    title: 'Análise Preditiva com IA',
    description: 'Utilize inteligência artificial para analisar padrões e tendências em suas ocorrências policiais.',
    image: '/images/slide_3.jpeg',
    ctaText: 'Conheça Nossos Planos',
    ctaLink: '#planos'
  }
];

const HeroSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };
  
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };
  
  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${slide.image})`,
            }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-60"></div>
          </div>
          
          <div className="relative z-20 h-full flex items-center justify-center text-center">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-white">
                <h1 className="text-3xl md:text-5xl font-bold mb-6">{slide.title}</h1>
                <p className="text-lg md:text-xl mb-8">{slide.description}</p>
                <Button asChild className="bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary text-white rounded-full px-8 py-6 shadow-lg transform transition-transform hover:scale-105">
                  <Link href={slide.ctaLink} className="flex items-center gap-2">
                    {slide.ctaText} <ExternalLink size={18} />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      <button 
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 p-3 rounded-full text-white transition-all"
        aria-label="Slide anterior"
      >
        <ChevronLeft size={24} />
      </button>
      
      <button 
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-black/70 p-3 rounded-full text-white transition-all"
        aria-label="Próximo slide"
      >
        <ChevronRight size={24} />
      </button>
      
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex space-x-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide ? 'bg-white w-6' : 'bg-white/50'
            }`}
            aria-label={`Ir para slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;
