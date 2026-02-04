'use client'
import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux/store';
import { User } from '@/types/user';
import { Course } from '@/types/course';
import { getAllCourses, getCourse } from '@/services/courseService';
import { getUserCoursesProgress, getUserCourseProgress } from '@/services/courseProgressService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Search, GraduationCap, Award, Clock, Lock, Play, CheckCircle, Loader2, CreditCard, QrCode } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const Page = () => {
  const router = useRouter();
  const user: User = useSelector((state: RootState) => state.userSlice.user);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [userProgresses, setUserProgresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'gratuito' | 'pago'>('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'disponiveis' | 'meus-cursos'>('todos');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'PIX' | 'BOLETO'>('CREDIT_CARD');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Buscar todos os cursos ativos
        const allCourses = await getAllCourses();
        const activeCourses = allCourses.filter(c => c.status === 'ativo');
        setCourses(activeCourses);

        // Buscar progressos do usuário
        if (user?.uid) {
          const progresses = await getUserCoursesProgress(user.uid);
          setUserProgresses(progresses);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        toast({
          title: 'Erro ao carregar cursos',
          description: 'Não foi possível carregar os cursos disponíveis.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]);

  const handleEnroll = async (courseId: string, course: Course) => {
    try {
      if (!user?.uid) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar logado para se inscrever em cursos.',
          variant: 'destructive'
        });
        router.push('/login');
        return;
      }

      setEnrolling(courseId);

      // Verificar se já está inscrito
      const existingProgress = await getUserCourseProgress(user.uid, courseId);
      if (existingProgress) {
        toast({
          title: 'Você já está inscrito',
          description: 'Você já possui acesso a este curso.',
        });
        router.push(`/dashboard/cursos/${courseId}`);
        return;
      }

      // Se curso é gratuito, inscrever diretamente
      if (course.tipo === 'gratuito') {
        const response = await fetch(`/api/cursos/${courseId}/inscrever`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.uid }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao inscrever-se no curso');
        }

        toast({
          title: 'Inscrição realizada!',
          description: 'Você foi inscrito com sucesso no curso.',
        });

        // Atualizar progressos
        const progresses = await getUserCoursesProgress(user.uid);
        setUserProgresses(progresses);

        // Redirecionar para o curso
        router.push(`/dashboard/cursos/${courseId}`);
      } else {
        // Se curso é pago, mostrar modal de escolha de método de pagamento
        setSelectedCourse(course);
        setShowPaymentModal(true);
      }
    } catch (error: any) {
      console.error('Error enrolling in course:', error);
      toast({
        title: 'Erro ao inscrever-se',
        description: error.message || 'Não foi possível processar sua inscrição.',
        variant: 'destructive'
      });
    } finally {
      setEnrolling(null);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedCourse || !user?.uid) return;

    try {
      setEnrolling(selectedCourse.id);
      setShowPaymentModal(false);

      // Criar checkout com método de pagamento selecionado
      const response = await fetch(`/api/cursos/${selectedCourse.id}/inscrever`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.uid,
          billingType: paymentMethod 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar inscrição');
      }

      if (data.checkoutUrl) {
        // Abrir checkout do Asaas em nova aba
        window.open(data.checkoutUrl, '_blank');
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Erro ao processar pagamento',
        description: error.message || 'Não foi possível processar o pagamento.',
        variant: 'destructive'
      });
    } finally {
      setEnrolling(null);
      setSelectedCourse(null);
    }
  };

  // Filtrar cursos
  const filteredCourses = useMemo(() => {
    let filtered = [...courses];

    // Busca
    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por tipo
    if (filterType !== 'todos') {
      filtered = filtered.filter(course => course.tipo === filterType);
    }

    // Filtro por status (disponíveis vs meus cursos)
    if (filterStatus === 'meus-cursos') {
      filtered = filtered.filter(course =>
        userProgresses.some(progress => progress.courseId === course.id)
      );
    } else if (filterStatus === 'disponiveis') {
      filtered = filtered.filter(course =>
        !userProgresses.some(progress => progress.courseId === course.id)
      );
    }

    return filtered;
  }, [courses, searchTerm, filterType, filterStatus, userProgresses]);

  const getCourseProgress = (courseId: string) => {
    return userProgresses.find(p => p.courseId === courseId);
  };

  const isEnrolled = (courseId: string) => {
    return userProgresses.some(p => p.courseId === courseId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cursos Disponíveis</h1>
        <p className="text-gray-600">Explore nossos cursos e aprimore seus conhecimentos</p>
      </div>

      {/* Filtros e Busca */}
      <div className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar cursos..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Filtrar por Tipo</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="gratuito">Gratuitos</option>
              <option value="pago">Pagos</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Filtrar por Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="todos">Todos os Cursos</option>
              <option value="disponiveis">Disponíveis</option>
              <option value="meus-cursos">Meus Cursos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid de Cursos */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">
            {searchTerm || filterType !== 'todos' || filterStatus !== 'todos'
              ? 'Nenhum curso encontrado com os filtros selecionados.'
              : 'Nenhum curso disponível no momento.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const progress = getCourseProgress(course.id);
            const enrolled = isEnrolled(course.id);
            const hasCertificate = progress?.certificadoGerado || false;

            return (
              <Card key={course.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                {course.imagem && (
                  <div className="relative h-48 w-full overflow-hidden">
                    <img
                      src={course.imagem}
                      alt={course.titulo}
                      className="w-full h-full object-cover"
                    />
                    {enrolled && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Inscrito
                        </Badge>
                      </div>
                    )}
                    {course.tipo === 'pago' && !enrolled && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-primary text-white">
                          <Lock className="h-3 w-3 mr-1" />
                          Pago
                        </Badge>
                      </div>
                    )}
                    {course.tipo === 'gratuito' && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-green-500 text-white">
                          Gratuito
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-xl line-clamp-2">{course.titulo}</CardTitle>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {course.descricao || 'Sem descrição'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  {enrolled && progress && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progresso</span>
                        <span className="font-semibold text-primary">
                          {progress.progresso || 0}%
                        </span>
                      </div>
                      <Progress value={progress.progresso || 0} className="h-2" />
                      {hasCertificate && (
                        <div className="flex items-center gap-1 text-sm text-green-600">
                          <Award className="h-4 w-4" />
                          <span>Certificado Disponível</span>
                        </div>
                      )}
                    </div>
                  )}

                  {course.tipo === 'pago' && !enrolled && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-bold text-lg">R$ {course.valor.toFixed(2)}</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="mt-auto">
                  {enrolled ? (
                    <Button
                      className="w-full"
                      onClick={() => router.push(`/dashboard/cursos/${course.id}`)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Continuar Curso
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleEnroll(course.id, course)}
                      disabled={enrolling === course.id}
                    >
                      {enrolling === course.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : course.tipo === 'gratuito' ? (
                        <>
                          <GraduationCap className="h-4 w-4 mr-2" />
                          Inscrever-se Grátis
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Comprar Curso
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Escolha de Método de Pagamento */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escolha o método de pagamento</DialogTitle>
            <DialogDescription>
              Selecione como deseja pagar pelo curso {selectedCourse?.titulo}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'CREDIT_CARD' | 'PIX' | 'BOLETO')}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="CREDIT_CARD" id="credit-card" />
                <Label htmlFor="credit-card" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Cartão de Crédito</span>
                    <CreditCard className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Parcelamento em até 12x</p>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="PIX" id="pix" />
                <Label htmlFor="pix" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">PIX</span>
                    <QrCode className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Aprovação imediata</p>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="BOLETO" id="boleto" />
                <Label htmlFor="boleto" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Boleto Bancário</span>
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Vencimento em 7 dias</p>
                </Label>
              </div>
            </RadioGroup>
            
            {selectedCourse && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-semibold">Total:</span>
                <span className="text-2xl font-bold text-primary">R$ {selectedCourse.valor.toFixed(2)}</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmPayment} disabled={enrolling === selectedCourse?.id}>
              {enrolling === selectedCourse?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Continuar para Pagamento'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Page;
