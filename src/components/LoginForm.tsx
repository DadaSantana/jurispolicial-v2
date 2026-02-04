'use client'
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { loginUser } from '@/services/authService';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { setUser } from '@/app/redux/features/users/userSlice';
import { toast } from 'sonner';

interface LoginFormProps {
  redirectTo?: string;
}

const LoginForm = ({ redirectTo }: LoginFormProps = {}) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    senha: '',
  });
  
  const [errors, setErrors] = useState({
    email: '',
    senha: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Limpar erro ao digitar
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  const validateForm = () => {
    const newErrors = {
      email: '',
      senha: '',
    };
    
    let isValid = true;
    
    // Validação Email
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
      isValid = false;
    }
    
    // Validação Senha
    if (!formData.senha) {
      newErrors.senha = 'Senha é obrigatória';
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
      // Login user
      const userData = await loginUser(formData.email, formData.senha);
      
      // Redirect based on role or specified redirect path
      if (redirectTo) {
        router.push(redirectTo);
      } else if (userData.role === 'admin') {
        //Set user data in store
        dispatch(setUser(userData));
        // Redirect to dashboard
        toast.success('Login realizado com sucesso!');
        router.push('/admin/dashboard');

      } else {
        //Set user data in store
        toast.success('Login realizado com sucesso!');
        dispatch(setUser(userData));
        // Redirect to dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      console.error("Erro no login:", error);
      // Toast is handled in the service
      toast.error('Não foi possível fazer o login. Verifique suas credenciais e tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };
  
  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
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
          <div className="flex justify-between items-center">
            <Label htmlFor="senha">Senha</Label>
            <Link href="/recuperar-senha" className="text-sm text-primary hover:underline">
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <Input 
              id="senha"
              name="senha"
              type={showPassword ? "text" : "password"}
              value={formData.senha}
              onChange={handleChange}
              placeholder="••••••••"
              className={errors.senha ? "border-red-500 pr-10" : "pr-10"}
            />
            <button 
              type="button" 
              onClick={toggleShowPassword}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.senha && <p className="text-sm text-red-500">{errors.senha}</p>}
        </div>
        
        <Button type="submit" className="w-full bg-primary" disabled={loading}>
          {loading ? "Entrando..." : (
            <>
              <LogIn size={18} /> <span>Entrar</span>
            </>
          )}
        </Button>
      </form>
      
      <div className="text-center">
        <p className="text-gray-600">
          Não tem uma conta?{" "}
          <Link href="/cadastro" className="text-primary hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
