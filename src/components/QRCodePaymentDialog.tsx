import React, { useState } from 'react';
import Image from 'next/image';
import { Copy, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface QRCodePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planTitle: string;
  planPrice: string;
}

const QRCodePaymentDialog = ({ open, onOpenChange, planTitle, planPrice }: QRCodePaymentDialogProps) => {
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [formErrors, setFormErrors] = useState<{name?: string, email?: string}>({});
  
  const pixCode = "00020126360014br.gov.bcb.pix0114+55639911174675204000053039865802BR5921Eduardo Rios Ferreira6008Brasilia62240520daqr10189987930829456304D0DC";
  const whatsappBaseLink = "https://api.whatsapp.com/send/?phone=556391117467&text&type=phone_number&app_absent=0";

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const errors: {name?: string, email?: string} = {};
    
    if (!name.trim()) {
      errors.name = "Nome é obrigatório";
    }
    
    if (!email.trim()) {
      errors.email = "E-mail é obrigatório";
    } else if (!validateEmail(email)) {
      errors.email = "Digite um e-mail válido";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleWhatsAppRedirect = () => {
    if (!validateForm()) {
      return;
    }
    
    // Criar a mensagem para o WhatsApp
    const message = encodeURIComponent(
      `Olá, meu nome é ${name}, e-mail ${email}, e acabo de realizar o pagamento via PIX, para assinatura do plano ${planTitle}, no valor de ${planPrice}.`
    );
    
    // Abrir o link do WhatsApp com a mensagem
    window.open(`${whatsappBaseLink}&text=${message}`, '_blank');
  };

  // Formatação do código PIX em grupos para melhor leitura
  const formattedPixCode = pixCode.match(/.{1,4}/g)?.join(' ') || pixCode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] p-0 gap-0 bg-white overflow-auto">
        <div className="absolute right-4 top-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-6 w-6 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="text-xl text-center font-semibold">Pagamento via PIX</DialogTitle>
          <p className="text-center text-gray-600 pt-2">
            Escaneie o QR Code para pagar
          </p>
          <div className="mt-3 text-center">
            <p className="font-semibold text-lg">{planTitle}</p>
            <div className="bg-primary/10 rounded-md py-2 px-4 mt-1 inline-block">
              <p className="font-bold text-2xl text-primary">{planPrice}</p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center px-6 py-4 bg-white">
          <div className="relative w-full max-w-[250px] h-[250px] mb-6">
            <Image
              src="/images/qrcode.png"
              alt="QR Code para pagamento"
              fill
              style={{ objectFit: 'contain' }}
              className="rounded-md"
            />
          </div>
          
          <div className="w-full mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Código PIX:</p>
            <div className="flex flex-col gap-2">
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-sm text-gray-700 font-mono overflow-auto whitespace-normal">
                {formattedPixCode}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="ml-auto flex items-center gap-1 h-8"
                onClick={handleCopyCode}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span className="text-xs">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span className="text-xs">Copiar código</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="w-full mb-6">
            <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-sm text-gray-700">Recebedor:</p>
              <p className="font-semibold text-lg text-gray-900">Eduardo Rios Ferreira</p>
            </div>
          </div>
          
          <div className="w-full space-y-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo<span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Digite seu nome completo"
                className={formErrors.name ? "border-red-500" : ""}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500">{formErrors.name}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">E-mail<span className="text-red-500">*</span></Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Digite seu e-mail"
                className={formErrors.email ? "border-red-500" : ""}
              />
              {formErrors.email && (
                <p className="text-xs text-red-500">{formErrors.email}</p>
              )}
            </div>
          </div>
        </div>
        
        <div onClick={handleWhatsAppRedirect} className="mt-auto">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-none h-14" 
          >
            Enviar comprovante via WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodePaymentDialog; 