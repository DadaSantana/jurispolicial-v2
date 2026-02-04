'use client'
import React from 'react';
import { 
  HomeIcon, 
  FileTextIcon, 
  HistoryIcon, 
  BookOpenIcon,
  CreditCardIcon,
  LogOut,
  GraduationCap,
  Award,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { logoutUser } from '@/services/authService';
import { useIsMobile } from '@/hooks/use-mobile';
import { User } from '@/types/user';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface SidebarProps {
  user: User | null;
}

const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();
  
  const menuItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: <HomeIcon className="h-5 w-5" />,
    },
    {
      path: '/dashboard/relatorio',
      label: 'Gerar Relatório',
      icon: <FileTextIcon className="h-5 w-5" />,
    },
    {
      path: '/dashboard/historico',
      label: 'Histórico',
      icon: <HistoryIcon className="h-5 w-5" />,
    },
    {
      path: '/dashboard/conteudos',
      label: 'Conteúdos',
      icon: <BookOpenIcon className="h-5 w-5" />,
    },
    {
      path: '/dashboard/cursos',
      label: 'Cursos',
      icon: <GraduationCap className="h-5 w-5" />,
    },
    {
      path: '/dashboard/produtos',
      label: 'Produtos',
      icon: <Package className="h-5 w-5" />,
    },
    {
      path: '/dashboard/certificados',
      label: 'Certificados',
      icon: <Award className="h-5 w-5" />,
    },
    {
      path: '/dashboard/planos',
      label: 'Planos',
      icon: <CreditCardIcon className="h-5 w-5" />,
    },
  ];
  
  const handleLogout = async () => {
    try {
      await logoutUser();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  // Mobile bottom navigation
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-primary text-white shadow-lg z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-16",
                pathname === item.path ? "text-white" : "text-white/70"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors duration-200",
                pathname === item.path ? "bg-white/20" : ""
              )}>
                {item.icon}
              </div>
              <span className="text-[10px] mt-0.5 text-center leading-tight">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center w-16"
          >
            <div className="p-1.5 rounded-lg">
              <LogOut className="h-5 w-5" />
            </div>
            <span className="text-[10px] mt-0.5 text-center leading-tight">Sair</span>
          </button>
        </div>
      </div>
    );
  }
  
  // Desktop sidebar
  return (
    <aside className="w-64 hidden md:block bg-primary text-white h-screen sticky top-0 overflow-y-auto">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center">
          <span className="text-xl font-semibold text-white">JurisPolicial</span>
        </Link>
      </div>
      
      {user && (
        <div className="px-6 mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-medium">
              {user.nome?.charAt(0) || '?'}
            </div>
            <div className="ml-2 overflow-hidden">
              <p className="text-sm font-medium truncate text-white">{user.nome}</p>
              <p className="text-xs text-white/70 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}
      
      <nav className="mt-6">
        <ul className="space-y-2 px-4">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-white hover:text-white hover:bg-white/10",
                    pathname === item.path && "bg-white/20"
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
      
      <div className="px-4 mt-auto pb-6 absolute bottom-0 w-full">
        <div className="border-t border-white/20 pt-4 mt-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:text-white hover:bg-white/10"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span className="ml-3">Sair</span>
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
