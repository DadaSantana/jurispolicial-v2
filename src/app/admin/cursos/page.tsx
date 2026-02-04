'use client'
import React, { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Image, Pencil, BookOpen, ExternalLink, Users, Award, Clock, TrendingUp } from 'lucide-react';
import CurrencyInput from 'react-currency-input-field';
import { Course } from '@/types/course';
import { createCourse, getAllCourses, updateCourse, deleteCourse } from '@/services/courseService';
import { getCourseEnrollments } from '@/services/courseProgressService';
import { getUserData } from '@/services/authService';
import { useRouter } from 'next/navigation';

const uploadFileToStorage = async (file: File, folder: string): Promise<string> => {
  const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};

const Page = () => {
  const router = useRouter();
  const [cursos, setCursos] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<'gratuito' | 'pago'>('gratuito');
  const [valor, setValor] = useState(0);
  const [imagem, setImagem] = useState('');
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [porcentagemMinimaCertificado, setPorcentagemMinimaCertificado] = useState(100);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [enrollmentsOpen, setEnrollmentsOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [enrollments, setEnrollments] = useState<{ progress: any; user: any }[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  const handleImageChange = (e: React.Change<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const courses = await getAllCourses();
      setCursos(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast({
        title: "Erro ao carregar cursos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [refresh]);

  const handleCreateCourse = async () => {
    try {
      setLoading(true);
      
      let imageUrl = imagem;
      if (file) {
        imageUrl = await uploadFileToStorage(file, 'cursos');
      }

      if (!imageUrl) {
        toast({
          title: "Erro",
          description: "Imagem de capa é obrigatória",
          variant: "destructive"
        });
        return;
      }

      await createCourse({
        titulo,
        descricao,
        imagem: imageUrl,
        tipo,
        valor: tipo === 'pago' ? valor : 0,
        porcentagemMinimaCertificado,
        status,
      });

      toast({
        title: "Curso criado com sucesso!",
      });

      setOpen(false);
      resetForm();
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error creating course:", error);
      toast({
        title: "Erro ao criar curso",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse) return;

    try {
      setLoading(true);
      
      let imageUrl = editingCourse.imagem;
      if (file) {
        imageUrl = await uploadFileToStorage(file, 'cursos');
      }

      await updateCourse(editingCourse.id, {
        titulo,
        descricao,
        imagem: imageUrl,
        tipo,
        valor: tipo === 'pago' ? valor : 0,
        porcentagemMinimaCertificado,
        status,
      });

      toast({
        title: "Curso atualizado com sucesso!",
      });

      setEditOpen(false);
      resetForm();
      setEditingCourse(null);
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error updating course:", error);
      toast({
        title: "Erro ao atualizar curso",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string, imageUrl: string) => {
    if (!confirm('Tem certeza que deseja excluir este curso?')) {
      return;
    }

    try {
      setLoading(true);
      
      if (imageUrl) {
        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        } catch (error) {
          console.error("Error deleting image:", error);
        }
      }

      await deleteCourse(courseId);

      toast({
        title: "Curso deletado com sucesso!",
      });

      setRefresh(!refresh);
    } catch (error) {
      console.error("Error deleting course:", error);
      toast({
        title: "Erro ao deletar curso",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setTitulo(course.titulo);
    setDescricao(course.descricao);
    setTipo(course.tipo);
    setValor(course.valor);
    setImagem(course.imagem);
    setStatus(course.status);
    setPorcentagemMinimaCertificado(course.porcentagemMinimaCertificado || 100);
    setPreviewUrl(course.imagem);
    setEditOpen(true);
  };

  const resetForm = () => {
    setTitulo('');
    setDescricao('');
    setTipo('gratuito');
    setValor(0);
    setImagem('');
    setStatus('ativo');
    setPorcentagemMinimaCertificado(100);
    setFile(null);
    setPreviewUrl(null);
  };

  const fetchEnrollments = async (courseId: string) => {
    try {
      setLoadingEnrollments(true);
      const enrollmentData = await getCourseEnrollments(courseId);
      setEnrollments(enrollmentData);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      toast({
        title: "Erro ao carregar inscritos",
        variant: "destructive"
      });
    } finally {
      setLoadingEnrollments(false);
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '-';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Gerenciar Cursos</h1>
          <p className="text-gray-600">Crie e gerencie cursos online para seus alunos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Curso
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Curso</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="flex flex-col items-center justify-center">
                <div className="border border-dashed border-gray-300 rounded-lg p-4 w-full h-[300px] flex items-center justify-center overflow-hidden mb-4">
                  {previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="max-w-full max-h-full object-contain" 
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <Image className="h-16 w-16 mx-auto mb-2" />
                      <p>Selecione uma imagem de capa</p>
                    </div>
                  )}
                </div>
                <div className="w-full">
                  <Label htmlFor="imagem" className="mb-2 block">
                    Imagem de Capa
                  </Label>
                  <Input
                    type="file"
                    id="imagem"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="titulo" className="mb-2 block">
                    Título *
                  </Label>
                  <Input 
                    id="titulo" 
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="w-full" 
                    placeholder="Nome do curso"
                  />
                </div>
                
                <div>
                  <Label htmlFor="descricao" className="mb-2 block">
                    Descrição
                  </Label>
                  <Textarea
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    className="w-full h-24"
                    placeholder="Descrição do curso"
                  />
                </div>
                
                <div>
                  <Label htmlFor="tipo" className="mb-2 block">
                    Tipo *
                  </Label>
                  <Select onValueChange={(value) => setTipo(value as 'gratuito' | 'pago')} value={tipo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gratuito">Gratuito</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {tipo === 'pago' && (
                  <div>
                    <Label htmlFor="valor" className="mb-2 block">
                      Valor (R$)
                    </Label>
                    <CurrencyInput
                      id="valor"
                      name="valor"
                      placeholder="R$ 0,00"
                      value={valor}
                      decimalsLimit={2}
                      onValueChange={(value) => setValor(Number(value) || 0)}
                      intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="porcentagemMinimaCertificado" className="mb-2 block">
                    Porcentagem Mínima para Certificado (%)
                  </Label>
                  <Input
                    id="porcentagemMinimaCertificado"
                    type="number"
                    min="0"
                    max="100"
                    value={porcentagemMinimaCertificado}
                    onChange={(e) => setPorcentagemMinimaCertificado(Number(e.target.value) || 100)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Porcentagem de conclusão necessária para gerar certificado (0-100%)
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="status"
                    checked={status === 'ativo'}
                    onCheckedChange={(checked) => setStatus(checked ? 'ativo' : 'inativo')}
                  />
                  <Label htmlFor="status">
                    Curso Ativo
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateCourse} disabled={loading}>
                {loading ? "Criando..." : "Criar Curso"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading && cursos.length === 0 ? (
        <div className="flex justify-center items-center h-40">
          <p>Carregando cursos...</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imagem</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Certificado (%)</TableHead>
              <TableHead className="w-[180px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cursos.map((curso) => (
              <TableRow key={curso.id}>
                <TableCell>
                  {curso.imagem && (
                    <img 
                      src={curso.imagem} 
                      alt={curso.titulo}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                </TableCell>
                <TableCell className="font-medium">{curso.titulo}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    curso.tipo === 'gratuito' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {curso.tipo === 'gratuito' ? 'Gratuito' : 'Pago'}
                  </span>
                </TableCell>
                <TableCell>
                  {curso.tipo === 'pago' 
                    ? `R$ ${curso.valor.toFixed(2)}` 
                    : 'Gratuito'}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    curso.status === 'ativo' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {curso.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell>{curso.porcentagemMinimaCertificado || 100}%</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setSelectedCourse(curso);
                        setEnrollmentsOpen(true);
                        fetchEnrollments(curso.id);
                      }}
                      title="Ver Inscritos"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => router.push(`/admin/cursos/${curso.id}/modulos`)}
                      title="Gerenciar Módulos"
                    >
                      <BookOpen className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(curso)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteCourse(curso.id, curso.imagem)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Curso</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="flex flex-col items-center justify-center">
              <div className="border border-dashed border-gray-300 rounded-lg p-4 w-full h-[300px] flex items-center justify-center overflow-hidden mb-4">
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain" 
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <Image className="h-16 w-16 mx-auto mb-2" />
                    <p>Selecione uma imagem de capa</p>
                  </div>
                )}
              </div>
              <div className="w-full">
                <Label htmlFor="imagem-edit" className="mb-2 block">
                  Imagem de Capa
                </Label>
                <Input
                  type="file"
                  id="imagem-edit"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="titulo-edit" className="mb-2 block">
                  Título *
                </Label>
                <Input 
                  id="titulo-edit" 
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full" 
                />
              </div>
              
              <div>
                <Label htmlFor="descricao-edit" className="mb-2 block">
                  Descrição
                </Label>
                <Textarea
                  id="descricao-edit"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full h-24"
                />
              </div>
              
              <div>
                <Label htmlFor="tipo-edit" className="mb-2 block">
                  Tipo *
                </Label>
                <Select value={tipo} onValueChange={(value) => setTipo(value as 'gratuito' | 'pago')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gratuito">Gratuito</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tipo === 'pago' && (
                <div>
                  <Label htmlFor="valor-edit" className="mb-2 block">
                    Valor (R$)
                  </Label>
                  <CurrencyInput
                    id="valor-edit"
                    name="valor"
                    placeholder="R$ 0,00"
                    value={valor}
                    decimalsLimit={2}
                    onValueChange={(value) => setValor(Number(value) || 0)}
                    intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="porcentagemMinimaCertificado-edit" className="mb-2 block">
                  Porcentagem Mínima para Certificado (%)
                </Label>
                <Input
                  id="porcentagemMinimaCertificado-edit"
                  type="number"
                  min="0"
                  max="100"
                  value={porcentagemMinimaCertificado}
                  onChange={(e) => setPorcentagemMinimaCertificado(Number(e.target.value) || 100)}
                  className="w-full"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="status-edit"
                  checked={status === 'ativo'}
                  onCheckedChange={(checked) => setStatus(checked ? 'ativo' : 'inativo')}
                />
                <Label htmlFor="status-edit">
                  Curso Ativo
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateCourse} disabled={loading}>
              {loading ? "Atualizando..." : "Atualizar Curso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Inscritos */}
      <Dialog open={enrollmentsOpen} onOpenChange={setEnrollmentsOpen}>
        <DialogContent className="sm:max-w-[95vw] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">
              Inscritos no Curso: {selectedCourse?.titulo}
            </DialogTitle>
            <DialogDescription>
              Visualize todos os alunos inscritos, seu progresso e certificados
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loadingEnrollments ? (
              <div className="flex justify-center items-center h-64">
                <p>Carregando inscritos...</p>
              </div>
            ) : enrollments.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Nenhum aluno inscrito ainda neste curso.</p>
              </div>
            ) : (
              <>
                {/* Estatísticas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total de Inscritos</p>
                        <p className="text-3xl font-bold text-blue-700">{enrollments.length}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Certificados Emitidos</p>
                        <p className="text-3xl font-bold text-green-700">
                          {enrollments.filter(e => e.progress.certificadoGerado).length}
                        </p>
                      </div>
                      <Award className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Média de Progresso</p>
                        <p className="text-3xl font-bold text-purple-700">
                          {enrollments.length > 0
                            ? Math.round(
                                enrollments.reduce((acc, e) => acc + (e.progress.progresso || 0), 0) /
                                enrollments.length
                              )
                            : 0}%
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Cursos Concluídos</p>
                        <p className="text-3xl font-bold text-orange-700">
                          {enrollments.filter(e => e.progress.progresso === 100).length}
                        </p>
                      </div>
                      <Award className="h-8 w-8 text-orange-500" />
                    </div>
                  </div>
                </div>

                {/* Lista de Inscritos */}
                <div className="space-y-4">
                  {enrollments.map((enrollment, index) => (
                    <div
                      key={enrollment.progress.id || index}
                      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary text-white font-semibold">
                              {enrollment.user?.nome?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {enrollment.user?.nome || 'Nome não disponível'}
                              </h3>
                              {enrollment.progress.certificadoGerado && (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                  <Award className="h-3 w-3 mr-1" />
                                  Certificado Emitido
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Email</p>
                                <p className="text-sm font-medium">{enrollment.user?.email || '-'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Data de Início</p>
                                <p className="text-sm font-medium">
                                  {formatDate(enrollment.progress.dataInicio)}
                                </p>
                              </div>
                              {enrollment.progress.dataConclusao && (
                                <div>
                                  <p className="text-sm text-gray-600 mb-1">Data de Conclusão</p>
                                  <p className="text-sm font-medium">
                                    {formatDate(enrollment.progress.dataConclusao)}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="mb-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700">Progresso</span>
                                <span className="text-sm font-bold text-primary">
                                  {enrollment.progress.progresso || 0}%
                                </span>
                              </div>
                              <Progress value={enrollment.progress.progresso || 0} className="h-2" />
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {enrollment.progress.aulasCompletas?.length || 0} aulas concluídas
                                </span>
                              </div>
                              {enrollment.progress.certificadoUrl && (
                                <a
                                  href={enrollment.progress.certificadoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  <Award className="h-4 w-4" />
                                  Ver Certificado
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          
          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setEnrollmentsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Page;
