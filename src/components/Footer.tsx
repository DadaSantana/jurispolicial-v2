'use client'
import React from 'react';
import Link from 'next/link';
import { Instagram, Facebook, Twitter, Mail, MapPin, Phone } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-primary-dark text-white pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">JurisPolicial</h3>
            <p className="mb-4 text-gray-300">
              Plataforma completa para profissionais da área policial. Gere relatórios com IA, 
              acesse cursos online com certificados e muito mais conteúdo especializado.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.instagram.com/juris_policial/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-primary-light">
                <Instagram size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link href="/#cursos" className="text-gray-300 hover:text-white transition-colors">Cursos</Link>
              </li>
              <li>
                <Link href="/#planos" className="text-gray-300 hover:text-white transition-colors">Planos</Link>
              </li>
              <li>
                <Link href="https://www.instagram.com/juris_policial/" target="_blank" className="text-gray-300 hover:text-white transition-colors">Blog</Link>
              </li>
              <li>
                <Link href="https://wa.me/556391117467" target="_blank" className="text-gray-300 hover:text-white transition-colors">Contato</Link>
              </li>
              <li>
                <Link href="/login" className="text-gray-300 hover:text-white transition-colors">Login</Link>
              </li>
              <li>
                <Link href="/cadastro" className="text-gray-300 hover:text-white transition-colors">Cadastre-se</Link>
              </li>
            </ul>
          </div>
          
          {/* <div>
            <h3 className="text-xl font-bold mb-4">Contato</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <MapPin size={20} className="mr-2 mt-1 flex-shrink-0" />
                <span>Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100</span>
              </li>
              <li className="flex items-center">
                <Phone size={20} className="mr-2 flex-shrink-0" />
                <span>(11) 4002-8922</span>
              </li>
              <li className="flex items-center">
                <Mail size={20} className="mr-2 flex-shrink-0" />
                <span>contato@jurispolicial.com.br</span>
              </li>
            </ul>
          </div> */}
        </div>
        
        <div className="border-t border-gray-700 mt-10 pt-6 text-center text-gray-400">
          <p>&copy; {currentYear} JurisPolicial. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
