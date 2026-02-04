'use client'
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { User } from '@/types/user';

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export function SubscriptionDialog({ open, onOpenChange, user }: SubscriptionDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Função para converter datas em strings ISO
  const formatDateForState = (date: any) => {
    if (!date) return '';
    if (date instanceof Timestamp) return date.toDate().toISOString().split('T')[0];
    if (date instanceof Date) return date.toISOString().split('T')[0];
    if (typeof date === 'string') return date;
    return '';
  };

  const [formData, setFormData] = useState({
    tipo: user.plano?.tipo || 'gratuito',
    status: user.plano?.status || 'inativo',
    inicio: formatDateForState(user.plano?.inicio),
    termino: formatDateForState(user.plano?.termino),
    stripeSubscriptionId: user.plano?.stripeSubscriptionId || '',
    stripeCustomerId: user.plano?.stripeCustomerId || '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userRef = doc(db, "users", user.uid);
      const planoData = {
        ...formData,
        inicio: formData.inicio ? Timestamp.fromDate(new Date(formData.inicio)) : null,
        termino: formData.termino ? Timestamp.fromDate(new Date(formData.termino)) : null,
      };

      await updateDoc(userRef, {
        plano: planoData
      });

      toast({
        title: "Assinatura atualizada",
        description: "Os dados da assinatura foram atualizados com sucesso."
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast({
        title: "Erro ao atualizar assinatura",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Assinatura</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Plano</label>
            <Select
              value={formData.tipo}
              onValueChange={(value) => setFormData({ ...formData, tipo: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gratuito">Gratuito</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="trimestral">Trimestral</SelectItem>
                <SelectItem value="semestral">Semestral</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
                <SelectItem value="teste">Teste</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data de Início</label>
            <Input
              type="date"
              value={formData.inicio}
              onChange={(e) => setFormData({ ...formData, inicio: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data de Término</label>
            <Input
              type="date"
              value={formData.termino}
              onChange={(e) => setFormData({ ...formData, termino: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Stripe Subscription ID</label>
            <Input
              value={formData.stripeSubscriptionId}
              onChange={(e) => setFormData({ ...formData, stripeSubscriptionId: e.target.value })}
              placeholder="sub_..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Stripe Customer ID</label>
            <Input
              value={formData.stripeCustomerId}
              onChange={(e) => setFormData({ ...formData, stripeCustomerId: e.target.value })}
              placeholder="cus_..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 