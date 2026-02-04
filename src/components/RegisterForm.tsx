import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { registerUser, checkUserByCPF } from '@/services/authService';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { setUser } from '@/app/redux/features/users/userSlice';
import { MessageCircle } from 'lucide-react';

interface RegisterFormProps {
  redirectTo?: string;
}

const RegisterForm = ({ redirectTo }: RegisterFormProps = {}) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    cpf: '',
    nome: '',
    email: '',
    telefone: '',
    senha: '',
    confirmarSenha: ''
  });
  
  const [errors, setErrors] = useState({
    cpf: '',
    nome: '',
    email: '',
    telefone: '',
    senha: '',
    confirmarSenha: ''
  });

  const dispatch = useDispatch();
  
  const [loading, setLoading] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      const formattedCPF = value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
        
      setFormData({
        ...formData,
        [name]: formattedCPF
      });
      return;
    }

    if (name === 'telefone') {
      const formattedPhone = value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
        
      setFormData({
        ...formData,
        [name]: formattedPhone
      });
      return;
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  const validateForm = () => {
    const newErrors = {
      cpf: '',
      nome: '',
      email: '',
      telefone: '',
      senha: '',
      confirmarSenha: ''
    };
    
    let isValid = true;
    
    const cpfClean = formData.cpf.replace(/\D/g, '');
    if (!cpfClean || cpfClean.length !== 11) {
      newErrors.cpf = 'CPF inválido';
      isValid = false;
    }
    
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
      isValid = false;
    } else if (formData.nome.trim().split(' ').length < 2) {
      newErrors.nome = 'Informe o nome completo';
      isValid = false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) {
      newErrors.email = 'Email inválido';
      isValid = false;
    }

    const phoneClean = formData.telefone.replace(/\D/g, '');
    if (!phoneClean || phoneClean.length < 10 || phoneClean.length > 11) {
      newErrors.telefone = 'Telefone inválido';
      isValid = false;
    }
    
    if (!formData.senha) {
      newErrors.senha = 'Senha é obrigatória';
      isValid = false;
    } else if (formData.senha.length < 6) {
      newErrors.senha = 'Senha deve ter pelo menos 6 caracteres';
      isValid = false;
    }
    
    if (formData.senha !== formData.confirmarSenha) {
      newErrors.confirmarSenha = 'As senhas não coincidem';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const register = await registerUser(
        formData.email,
        formData.senha,
        formData.nome,
        formData.cpf,
        formData.telefone.replace(/\D/g, '') // Enviar apenas números
      );
      
      setFormData({
        cpf: '',
        nome: '',
        email: '',
        telefone: '',
        senha: '',
        confirmarSenha: ''
      });

      dispatch(setUser(register));
      
      toast({
        title: "Sucesso!",
        description: "Sua conta foi criada e você está conectado.",
      });

      router.push(redirectTo || '/dashboard');
    } catch (error) {
      console.error("Erro no cadastro:", error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="cpf">CPF</Label>
        <Input 
          id="cpf"
          name="cpf"
          value={formData.cpf}
          onChange={handleChange}
          placeholder="000.000.000-00"
          maxLength={14}
          className={errors.cpf ? "border-red-500" : ""}
        />
        {errors.cpf && <p className="text-sm text-red-500">{errors.cpf}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="nome">Nome Completo</Label>
        <Input 
          id="nome"
          name="nome"
          value={formData.nome}
          onChange={handleChange}
          placeholder="Digite seu nome completo"
          className={errors.nome ? "border-red-500" : ""}
        />
        {errors.nome && <p className="text-sm text-red-500">{errors.nome}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input 
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="seu@email.com"
          className={errors.email ? "border-red-500" : ""}
        />
        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="telefone" className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Telefone/WhatsApp
        </Label>
        <Input 
          id="telefone"
          name="telefone"
          value={formData.telefone}
          onChange={handleChange}
          placeholder="(00) 00000-0000"
          className={errors.telefone ? "border-red-500" : ""}
        />
        {errors.telefone && <p className="text-sm text-red-500">{errors.telefone}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <Input 
          id="senha"
          name="senha"
          type="password"
          value={formData.senha}
          onChange={handleChange}
          placeholder="••••••••"
          className={errors.senha ? "border-red-500" : ""}
        />
        {errors.senha && <p className="text-sm text-red-500">{errors.senha}</p>}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirmarSenha">Confirmar Senha</Label>
        <Input 
          id="confirmarSenha"
          name="confirmarSenha"
          type="password"
          value={formData.confirmarSenha}
          onChange={handleChange}
          placeholder="••••••••"
          className={errors.confirmarSenha ? "border-red-500" : ""}
        />
        {errors.confirmarSenha && <p className="text-sm text-red-500">{errors.confirmarSenha}</p>}
      </div>
      
      <div className="space-y-4">
        <Button type="submit" className="w-full bg-primary" disabled={loading}>
          {loading ? "Processando..." : "Cadastrar"}
        </Button>
        
        <div className="text-center">
          <p className="text-gray-600">
            Já possui uma conta?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Fazer Login
            </Link>
          </p>
        </div>
      </div>
    </form>
  );
};

export default RegisterForm;
