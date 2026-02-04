'use cient'
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreditsModal = ({ open, onOpenChange }: CreditsModalProps) => {
  const router = useRouter()
  
  const handleNavigatePricing = () => {
    router.push('/dashboard/planos');
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center">
          <AlertCircle className="h-16 w-16 text-orange-400 mb-2" />
          <DialogTitle className="text-xl">Créditos Esgotados</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Você não possui créditos suficientes para gerar novos relatórios. 
            Adquira um plano para continuar utilizando todas as funcionalidades.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
            <h3 className="font-medium text-orange-800 mb-1">Por que adquirir um plano?</h3>
            <ul className="text-sm text-orange-700 space-y-1 ml-5 list-disc">
              <li>Relatórios ilimitados</li>
              <li>Recursos premium de análise</li>
              <li>Suporte prioritário</li>
              <li>Conteúdo exclusivo</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Talvez depois
          </Button>
          <Button className="gap-2" onClick={handleNavigatePricing}>
            <CreditCard className="h-4 w-4" />
            Ver planos disponíveis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreditsModal;
