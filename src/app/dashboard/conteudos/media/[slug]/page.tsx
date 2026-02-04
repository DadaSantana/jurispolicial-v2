'use client'
import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import SecureContentViewer from '@/components/SecureContentViewer';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux/store';
import { Conteudo, User } from '@/types/user';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const ContentPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState<Conteudo | null>(null);
  const [loading, setLoading] = useState(true);
  const user: User = useSelector((state: RootState) => state.userSlice.user);

  useEffect(() => {

    // Disable various ways to access content
    const setupSecurityMeasures = () => {
      // Disable right-click
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        return false;
      };

      // Disable keyboard shortcuts
      const handleKeyDown = (e: KeyboardEvent) => {
        // Prevent inspect element and other dev tools shortcuts
        if (
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j')) ||
          (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S')) ||
          e.key === 'F12'
        ) {
          e.preventDefault();
          return false;
        }
      };

      // Add event listeners
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeyDown);

      // Use CSS to disable text selection
      document.body.classList.add('no-select');

      // Return cleanup function
      return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.classList.remove('no-select');
      };
    };

    const securityCleanup = setupSecurityMeasures();

    // Demo: Fetch content based on URL parameter
    // In a real application, you would fetch this from Firebase
    const fetchContent = async () => {
      setLoading(true);

      try {
        const docRef = doc(db, 'conteudos', slug as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const contentData = { id: docSnap.id, ...docSnap.data() } as Conteudo;

          /* // Check if user can access exclusive content
          if (contentData.exclusivo && (!user || user.plano?.tipo !== 'anual')) {
            window.location.href = '/dashboard';
            return;
          }
 */
          setContent(contentData);
        } else {
          window.location.href = '/dashboard';
        }

        // Check if user can access exclusive content
        /* if (demoContent.exclusivo && (!user || user.plano?.tipo !== 'anual')) {
          toast.error('Este conteúdo é exclusivo para assinantes do plano anual');
          // In a real app, you would redirect here
          // window.location.href = '/dashboard';
          return;
        } */
      } catch (error) {
        console.error('Error fetching content:', error);
        toast.error('Erro ao carregar o conteúdo');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();

    return () => {
      securityCleanup();
    };
  }, [slug, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-primary animate-spin mb-4"></div>
          <p className="text-gray-500 animate-pulse">Carregando conteúdo...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="max-w-md w-full text-center px-4 py-8 rounded-xl bg-gray-50 border border-gray-100 animate-fade-in">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">Conteúdo não encontrado</h2>
          <p className="text-gray-500 mb-6">O conteúdo que você está procurando não está disponível ou foi removido.</p>
          <Link href="/dashboard">
            <Button
              variant="default"
              className="transition-all duration-300 hover:shadow-md"
            >
              Voltar para Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white animate-fade-in">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6 animate-slide-down">
            <Link href="/dashboard" className="mr-4 transition-transform duration-300 hover:-translate-x-1">
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10 shadow-sm hover:shadow">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{content.titulo}</h1>
          </div>

          <p className="text-gray-600 mb-8 max-w-3xl animate-slide-down opacity-90 leading-relaxed">{content.descricao}</p>

          <div className="mb-12 animate-scale-in content-card p-1 bg-gradient-to-br from-white to-gray-100">
            <SecureContentViewer
              type={content.tipo}
              url={content.arquivo}
              title={content.titulo}
              isExclusive={content.exclusivo}
            />
          </div>

          <div className="flex items-center justify-between animate-slide-up pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Atualizado em {new Date().toLocaleDateString('pt-BR')}</span>
            </div>

            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="transition-all duration-300 hover:bg-gray-50">
                Compartilhar
              </Button>
              <Button variant="outline" size="sm" className="transition-all duration-300 hover:bg-gray-50">
                Reportar problema
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentPage;