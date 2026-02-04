'use client'
import React, { useState } from 'react';
import { User } from '@/types/user';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, Home, Users, FileText, Package, File, PlusCircle, X, CreditCardIcon, BookOpenIcon, HistoryIcon, FileTextIcon, HomeIcon, MessageCircle, GraduationCap, FlaskConical } from 'lucide-react';
import { logoutUser } from '@/services/authService';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  user: User;
}

export const AdminSidebar = ({ user }: AdminSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter()
  const isMobile = useIsMobile();

  const menuItems = [
    {
      path: '/admin/dashboard',
      label: 'Dashboard',
      icon: <HomeIcon className="h-5 w-5" />,
    },
    {
      path: '/admin/relatorio',
      label: 'Gerar Relatório',
      icon: <FileTextIcon className="h-5 w-5" />,
    },
    {
      path: '/admin/teste-ia',
      label: 'Teste de IA',
      icon: <FlaskConical className="h-5 w-5" />,
    },
    {
      path: '/admin/historico',
      label: 'Histórico',
      icon: <HistoryIcon className="h-5 w-5" />,
    },
    {
      path: '/admin/assinantes',
      label: 'Assinantes',
      icon: <CreditCardIcon className="h-5 w-5" />,
    },
    {
      path: '/admin/conteudos',
      label: 'Conteúdos',
      icon: <BookOpenIcon className="h-5 w-5" />,
    },
    {
      path: '/admin/cursos',
      label: 'Cursos',
      icon: <GraduationCap className="h-5 w-5" />,
    },
    {
      path: '/admin/produtos',
      label: 'Produtos',
      icon: <CreditCardIcon className="h-5 w-5" />,
    },
    {
      path: '/admin/publicacoes',
      label: 'Publicações',
      icon: <CreditCardIcon className="h-5 w-5" />,
    },
    {
      path: '/admin/whatsapp',
      label: 'WhatsApp',
      icon: <MessageCircle className="h-5 w-5" />,
    }
  ];

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <>
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-white shadow-md rounded-full"
          onClick={toggleSidebar}
        >
          {collapsed ? <Menu /> : <X />}
        </Button>
      )}

      <aside
        className={`
          bg-primary-dark text-white transition-all duration-300 flex flex-col z-40
          ${isMobile
            ? collapsed
              ? 'fixed -left-64 w-64 h-full'
              : 'fixed left-0 w-64 h-full'
            : collapsed
              ? 'w-20'
              : 'w-64'
          }
        `}
      >
        <div className="p-4 flex items-center justify-between border-b border-primary-dark">
          <h1 className={`font-bold text-xl transition-opacity duration-300 ${collapsed && !isMobile ? 'opacity-0 hidden' : 'opacity-100'}`}>
            Admin Panel
          </h1>
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="hover:bg-primary-dark"
            >
              {collapsed ? <Menu size={20} /> : <X size={20} />}
            </Button>
          )}
        </div>

        <div className="p-4 border-b border-primary-dark">
          <div className={`flex items-center ${collapsed && !isMobile ? 'justify-center' : 'justify-start'}`}>
            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
              {user.nome.charAt(0).toUpperCase()}
            </div>
            {(!collapsed || isMobile) && (
              <div className="ml-3 overflow-hidden">
                <p className="font-medium truncate">{user.nome}</p>
                <p className="text-xs text-white/70 truncate">{user.email}</p>
              </div>
            )}
          </div>
        </div>

        <nav className="mt-6">
          <ul className="space-y-2 px-4">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link href={item.path}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-white hover:bg-white/10",
                      location.pathname === item.path && "bg-white/20"
                    )}
                  >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-primary-dark">
          <Button
            variant="ghost"
            className={`w-full hover:bg-primary-dark text-white justify-start ${collapsed && !isMobile ? 'justify-center' : ''}`}
            onClick={handleLogout}
          >
            <LogOut size={20} />
            {(!collapsed || isMobile) && <span className="ml-3">Sair</span>}
          </Button>
        </div>
      </aside>
    </>
  );
};
