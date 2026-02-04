'use client'
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { sendPasswordReset } from '@/services/authService';
import { toast } from 'sonner';

const RecuperarSenhaPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim()) {
      setError('Por favor, informe seu e-mail');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(email);
      toast.success('E-mail de recuperação enviado com sucesso!');
    } catch (err) {
      setError('Ocorreu um erro ao tentar recuperar a senha. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600">
      <div className="w-full max-w-md px-4">
        <h1 className="text-4xl font-bold text-white text-center mb-8">JurisPolicial</h1>
        <Card className="shadow-2xl rounded-xl overflow-hidden border-none bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardTitle className="text-2xl font-bold">Recuperar Senha</CardTitle>
          </CardHeader>
          <CardContent className="p-6 rounded-b-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className={error ? "border-red-500" : ""}
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-700" disabled={loading}>
                {loading ? "Enviando..." : "Recuperar Senha"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/login" className="inline-flex items-center text-white hover:text-blue-200 transition-colors">
            <ArrowLeft size={16} className="mr-1" /> Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RecuperarSenhaPage; 