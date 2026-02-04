'use client'
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import Link from 'next/link';

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const headerClasses = scrolled
    ? "bg-gray-900/90 backdrop-blur-md shadow-md"
    : "bg-gray-900/80 backdrop-blur-sm bg-slate-900";

  return (
    <header className={`${headerClasses} sticky top-0 z-50 transition-all duration-300`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            JurisPolicial
          </Link>

          {isMobile ? (
            <>
              {!menuOpen && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMenu}
                  aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
                  className="text-white hover:bg-white/10 z-50"
                >
                  <Menu size={24} />
                </Button>
              )}

              <div
                className={`fixed top-0 left-0 w-full min-h-screen bg-gray-900/95 shadow-xl transform transition-transform duration-300 ease-in-out z-40 ${menuOpen ? 'translate-x-0' : '-translate-x-full'
                  }`}
              >
                <div className="flex flex-col h-full p-6 bg-gray-900">
                  <div className="flex justify-end mb-6">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMenu}
                      aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
                      className="text-black bg-white/50 z-50"
                    >
                      <X size={24} />
                    </Button>
                  </div>
                  <nav className="flex flex-col space-y-6">
                    <Link
                      href="/#cursos"
                      className="py-2 text-lg font-medium text-white hover:text-primary"
                      onClick={() => setMenuOpen(false)}
                    >
                      Cursos
                    </Link>
                    <Link
                      href="/#planos"
                      className="py-2 text-lg font-medium text-white hover:text-primary"
                      onClick={() => setMenuOpen(false)}
                    >
                      Planos
                    </Link>
                    <Link
                      href="https://www.instagram.com/juris_policial/"
                      target="_blank"
                      className="py-2 text-lg font-medium text-white hover:text-primary"
                      onClick={() => setMenuOpen(false)}
                    >
                      Blog
                    </Link>
                    <Link
                      href="https://wa.me/556391117467"
                      target="_blank"
                      className="py-2 text-lg font-medium text-white hover:text-primary"
                      onClick={() => setMenuOpen(false)}
                    >
                      Contato
                    </Link>
                    <Link
                      href="/cadastro"
                      className="py-2 text-lg font-medium text-white hover:text-primary"
                      onClick={() => setMenuOpen(false)}
                    >
                      Cadastre-se
                    </Link>
                    <Button
                      asChild
                      className="bg-primary text-white hover:bg-primary-dark w-full"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Link href="/login">Login</Link>
                    </Button>
                  </nav>
                </div>
              </div>

              {/* Overlay */}
              {menuOpen && (
                <div
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
                  onClick={() => setMenuOpen(false)}
                />
              )}
            </>
          ) : (
            <nav className="flex items-center space-x-6">
              <Link href="/#cursos" className="text-white hover:text-primary-light font-medium transition-colors">
                Cursos
              </Link>
              <Link href="/#planos" className="text-white hover:text-primary-light font-medium transition-colors">
                Planos
              </Link>
              <Link href="https://www.instagram.com/juris_policial/" target="_blank" className="text-white hover:text-primary-light font-medium transition-colors">
                Blog
              </Link>
              <Link href="https://wa.me/556391117467" target="_blank" className="text-white hover:text-primary-light font-medium transition-colors">
                Contato
              </Link>
              <Link href="/cadastro" className="text-white hover:text-primary-light font-medium transition-colors">
                Cadastre-se
              </Link>
              <Button asChild className="bg-primary text-white hover:bg-primary-dark rounded-full px-6 transition-all">
                <Link href="/login">Login</Link>
              </Button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
