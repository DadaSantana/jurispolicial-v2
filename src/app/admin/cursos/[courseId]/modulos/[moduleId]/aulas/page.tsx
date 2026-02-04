'use client'
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, storage } from '@/lib/firebase';
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
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Pencil, ArrowLeft, FileText, Video, Type, File } from 'lucide-react';
import { Lesson, Module, Course } from '@/types/course';
import { 
  getCourse, 
  getCourseModules,
  getModuleLessons, 
  createLesson, 
  updateLesson, 
  deleteLesson 
} from '@/services/courseService';

const uploadFileToStorage = async (file: File, folder: string): Promise<string> => {
  const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};

const Page = () => {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const moduleId = params.moduleId as string;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<'video' | 'texto' | 'pdf'>('video');
  const [url, setUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [ordem, setOrdem] = useState(0);
  const [duracaoEstimada, setDuracaoEstimada] = useState<number | undefined>(undefined);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [refresh, setRefresh] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchCourse = async () => {
    try {
      const courseData = await getCourse(courseId);
      if (!courseData) {
        toast({
          title: "Erro",
          description: "Curso não encontrado",
          variant: "destructive"
        });
        router.push('/admin/cursos');
        return;
      }
      setCourse(courseData);
    } catch (error) {
      console.error("Error fetching course:", error);
    }
  };

  const fetchModule = async () => {
    try {
      const modules = await getCourseModules(courseId);
      const moduleData = modules.find(m => m.id === moduleId);
      if (!moduleData) {
        toast({
          title: "Erro",
          description: "Módulo não encontrado",
          variant: "destructive"
        });
        router.push(`/admin/cursos/${courseId}/modulos`);
        return;
      }
      setModule(moduleData);
    } catch (error) {
      console.error("Error fetching module:", error);
    }
  };

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const lessonsData = await getModuleLessons(moduleId);
      setLessons(lessonsData);
      
      // Definir ordem como próximo número disponível
      if (lessonsData.length > 0) {
        const maxOrdem = Math.max(...lessonsData.map(l => l.ordem));
        setOrdem(maxOrdem + 1);
      } else {
        setOrdem(1);
      }
    } catch (error) {
      console.error("Error fetching lessons:", error);
      toast({
        title: "Erro ao carregar aulas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId && moduleId) {
      fetchCourse();
      fetchModule();
      fetchLessons();
    }
  }, [courseId, moduleId, refresh]);

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        toast({
          title: "Erro",
          description: "Por favor, selecione um arquivo PDF",
          variant: "destructive"
        });
        return;
      }
      setPdfFile(file);
      setSelectedPdfFile(file);
    }
  };

  const handleCreateLesson = async () => {
    try {
      if (!titulo.trim()) {
        toast({
          title: "Erro",
          description: "Título é obrigatório",
          variant: "destructive"
        });
        return;
      }

      setLoading(true);
      
      let finalPdfUrl: string | undefined = pdfUrl || undefined;
      if (pdfFile) {
        try {
          finalPdfUrl = await uploadFileToStorage(pdfFile, 'aulas');
        } catch (uploadError) {
          console.error("Error uploading PDF:", uploadError);
          toast({
            title: "Erro",
            description: "Erro ao fazer upload do PDF. Por favor, tente novamente.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
      }

      const lessonData: Omit<Lesson, 'id' | 'dataCriacao'> = {
        moduleId,
        courseId,
        titulo: titulo.trim(),
        tipo,
        ordem,
      };

      if (descricao.trim()) {
        lessonData.descricao = descricao.trim();
      }
      if (url.trim()) {
        lessonData.url = url.trim();
      }
      if (finalPdfUrl) {
        lessonData.pdfUrl = finalPdfUrl;
      }
      if (duracaoEstimada) {
        lessonData.duracaoEstimada = duracaoEstimada;
      }

      await createLesson(lessonData);

      toast({
        title: "Aula criada com sucesso!",
      });

      setOpen(false);
      resetForm();
      setRefresh(!refresh);
    } catch (error: any) {
      console.error("Error creating lesson:", error);
      toast({
        title: "Erro ao criar aula",
        description: error.message || "Ocorreu um erro ao criar a aula. Por favor, tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLesson = async () => {
    if (!editingLesson) return;

    try {
      if (!titulo.trim()) {
        toast({
          title: "Erro",
          description: "Título é obrigatório",
          variant: "destructive"
        });
        return;
      }

      setLoading(true);
      
      let finalPdfUrl: string | undefined = editingLesson.pdfUrl || pdfUrl || undefined;
      if (pdfFile) {
        // Se houver PDF antigo, deletar
        if (editingLesson.pdfUrl) {
          try {
            const oldPdfRef = ref(storage, editingLesson.pdfUrl);
            await deleteObject(oldPdfRef);
          } catch (error) {
            console.error("Error deleting old PDF:", error);
          }
        }
        finalPdfUrl = await uploadFileToStorage(pdfFile, 'aulas');
      }

      const updateData: Partial<Lesson> = {
        titulo: titulo.trim(),
        tipo,
        ordem,
      };

      if (descricao.trim()) {
        updateData.descricao = descricao.trim();
      }
      if (url.trim()) {
        updateData.url = url.trim();
      }
      if (finalPdfUrl) {
        updateData.pdfUrl = finalPdfUrl;
      }
      if (duracaoEstimada !== undefined) {
        updateData.duracaoEstimada = duracaoEstimada;
      }

      await updateLesson(editingLesson.id, updateData);

      toast({
        title: "Aula atualizada com sucesso!",
      });

      setEditOpen(false);
      resetForm();
      setEditingLesson(null);
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error updating lesson:", error);
      toast({
        title: "Erro ao atualizar aula",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string, pdfUrlToDelete?: string) => {
    if (!confirm('Tem certeza que deseja excluir esta aula?')) {
      return;
    }

    try {
      setLoading(true);
      
      // Deletar PDF do storage se existir
      if (pdfUrlToDelete) {
        try {
          const pdfRef = ref(storage, pdfUrlToDelete);
          await deleteObject(pdfRef);
        } catch (error) {
          console.error("Error deleting PDF:", error);
        }
      }

      await deleteLesson(lessonId);

      toast({
        title: "Aula deletada com sucesso!",
      });

      setRefresh(!refresh);
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast({
        title: "Erro ao deletar aula",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setTitulo(lesson.titulo);
    setDescricao(lesson.descricao || '');
    setTipo(lesson.tipo);
    setUrl(lesson.url || '');
    setPdfUrl(lesson.pdfUrl || '');
    setOrdem(lesson.ordem);
    setDuracaoEstimada(lesson.duracaoEstimada);
    setEditOpen(true);
  };

  const resetForm = () => {
    setTitulo('');
    setDescricao('');
    setTipo('video');
    setUrl('');
    setPdfUrl('');
    if (lessons.length > 0) {
      const maxOrdem = Math.max(...lessons.map(l => l.ordem));
      setOrdem(maxOrdem + 1);
    } else {
      setOrdem(1);
    }
    setDuracaoEstimada(undefined);
    setPdfFile(null);
    setSelectedPdfFile(null);
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      default:
        return <Type className="h-4 w-4" />;
    }
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/admin/cursos/${courseId}/modulos`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
          <h1 className="text-2xl font-bold mb-2">
            Aulas do Módulo: {module?.titulo || 'Carregando...'}
          </h1>
          <p className="text-gray-600">
            Curso: {course?.titulo || 'Carregando...'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Aula
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Aula</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="titulo" className="mb-2 block">
                  Título *
                </Label>
                <Input 
                  id="titulo" 
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full" 
                  placeholder="Ex: Introdução ao Direito Penal"
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
                  placeholder="Descrição da aula"
                />
              </div>
              
              <div>
                <Label htmlFor="tipo" className="mb-2 block">
                  Tipo *
                </Label>
                <Select onValueChange={(value) => setTipo(value as 'video' | 'texto' | 'pdf')} value={tipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="texto">Texto</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(tipo === 'video' || tipo === 'texto') && (
                <div>
                  <Label htmlFor="url" className="mb-2 block">
                    URL
                  </Label>
                  <Input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full"
                    placeholder={tipo === 'video' ? "URL do vídeo (YouTube, Vimeo, etc.)" : "URL do conteúdo"}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="pdf" className="mb-2 block">
                  Anexo PDF (opcional)
                </Label>
                <Input
                  type="file"
                  id="pdf"
                  accept=".pdf"
                  onChange={handlePdfChange}
                  className="w-full"
                />
                {selectedPdfFile && (
                  <p className="text-sm text-gray-500 mt-1">
                    Arquivo selecionado: {selectedPdfFile.name}
                  </p>
                )}
                {pdfUrl && !selectedPdfFile && (
                  <p className="text-sm text-blue-500 mt-1">
                    PDF atual: <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="underline">Visualizar PDF</a>
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ordem" className="mb-2 block">
                    Ordem
                  </Label>
                  <Input
                    id="ordem"
                    type="number"
                    min="1"
                    value={ordem}
                    onChange={(e) => setOrdem(Number(e.target.value) || 1)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="duracao" className="mb-2 block">
                    Duração (minutos)
                  </Label>
                  <Input
                    id="duracao"
                    type="number"
                    min="0"
                    value={duracaoEstimada || ''}
                    onChange={(e) => setDuracaoEstimada(Number(e.target.value) || undefined)}
                    className="w-full"
                    placeholder="Ex: 30"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault();
                  handleCreateLesson();
                }} 
                disabled={loading}
              >
                {loading ? "Criando..." : "Criar Aula"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading && lessons.length === 0 ? (
        <div className="flex justify-center items-center h-40">
          <p>Carregando aulas...</p>
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Nenhuma aula criada ainda.</p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Criar Primeira Aula
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Ordem</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>PDF</TableHead>
              <TableHead className="w-[180px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lessons.map((lesson) => (
              <TableRow key={lesson.id}>
                <TableCell className="font-medium">{lesson.ordem}</TableCell>
                <TableCell className="font-medium">{lesson.titulo}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTipoIcon(lesson.tipo)}
                    <span className="capitalize">{lesson.tipo}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {lesson.duracaoEstimada 
                    ? `${lesson.duracaoEstimada} min` 
                    : '-'}
                </TableCell>
                <TableCell>
                  {lesson.pdfUrl ? (
                    <a 
                      href={lesson.pdfUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <File className="h-4 w-4" />
                      Ver PDF
                    </a>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(lesson)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteLesson(lesson.id, lesson.pdfUrl)}
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Aula</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
              <Select value={tipo} onValueChange={(value) => setTipo(value as 'video' | 'texto' | 'pdf')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="texto">Texto</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(tipo === 'video' || tipo === 'texto') && (
              <div>
                <Label htmlFor="url-edit" className="mb-2 block">
                  URL
                </Label>
                <Input
                  id="url-edit"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full"
                />
              </div>
            )}

            <div>
              <Label htmlFor="pdf-edit" className="mb-2 block">
                Anexo PDF (opcional)
              </Label>
              <Input
                type="file"
                id="pdf-edit"
                accept=".pdf"
                onChange={handlePdfChange}
                className="w-full"
              />
              {selectedPdfFile && (
                <p className="text-sm text-gray-500 mt-1">
                  Novo arquivo: {selectedPdfFile.name}
                </p>
              )}
              {pdfUrl && !selectedPdfFile && (
                <p className="text-sm text-blue-500 mt-1">
                  PDF atual: <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="underline">Visualizar PDF</a>
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ordem-edit" className="mb-2 block">
                  Ordem
                </Label>
                <Input
                  id="ordem-edit"
                  type="number"
                  min="1"
                  value={ordem}
                  onChange={(e) => setOrdem(Number(e.target.value) || 1)}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="duracao-edit" className="mb-2 block">
                  Duração (minutos)
                </Label>
                <Input
                  id="duracao-edit"
                  type="number"
                  min="0"
                  value={duracaoEstimada || ''}
                  onChange={(e) => setDuracaoEstimada(Number(e.target.value) || undefined)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              onClick={(e) => {
                e.preventDefault();
                handleUpdateLesson();
              }} 
              disabled={loading}
            >
              {loading ? "Atualizando..." : "Atualizar Aula"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Page;
