'use client'
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Plus, Trash2, Pencil, ArrowLeft, BookOpen, List } from 'lucide-react';
import { Module, Course } from '@/types/course';
import { 
  getCourse, 
  getCourseModules, 
  createModule, 
  updateModule, 
  deleteModule 
} from '@/services/courseService';

const Page = () => {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ordem, setOrdem] = useState(0);
  const [refresh, setRefresh] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
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
      toast({
        title: "Erro ao carregar curso",
        variant: "destructive"
      });
    }
  };

  const fetchModules = async () => {
    try {
      setLoading(true);
      const modulesData = await getCourseModules(courseId);
      setModules(modulesData);
      
      // Definir ordem como próximo número disponível
      if (modulesData.length > 0) {
        const maxOrdem = Math.max(...modulesData.map(m => m.ordem));
        setOrdem(maxOrdem + 1);
      } else {
        setOrdem(1);
      }
    } catch (error) {
      console.error("Error fetching modules:", error);
      toast({
        title: "Erro ao carregar módulos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchCourse();
      fetchModules();
    }
  }, [courseId, refresh]);

  const handleCreateModule = async () => {
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
      
      await createModule({
        courseId,
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        ordem,
      });

      toast({
        title: "Módulo criado com sucesso!",
      });

      setOpen(false);
      resetForm();
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error creating module:", error);
      toast({
        title: "Erro ao criar módulo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateModule = async () => {
    if (!editingModule) return;

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
      
      await updateModule(editingModule.id, {
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        ordem,
      });

      toast({
        title: "Módulo atualizado com sucesso!",
      });

      setEditOpen(false);
      resetForm();
      setEditingModule(null);
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error updating module:", error);
      toast({
        title: "Erro ao atualizar módulo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Tem certeza que deseja excluir este módulo? Todas as aulas deste módulo também serão removidas.')) {
      return;
    }

    try {
      setLoading(true);
      await deleteModule(moduleId);

      toast({
        title: "Módulo deletado com sucesso!",
      });

      setRefresh(!refresh);
    } catch (error) {
      console.error("Error deleting module:", error);
      toast({
        title: "Erro ao deletar módulo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (module: Module) => {
    setEditingModule(module);
    setTitulo(module.titulo);
    setDescricao(module.descricao || '');
    setOrdem(module.ordem);
    setEditOpen(true);
  };

  const resetForm = () => {
    setTitulo('');
    setDescricao('');
    if (modules.length > 0) {
      const maxOrdem = Math.max(...modules.map(m => m.ordem));
      setOrdem(maxOrdem + 1);
    } else {
      setOrdem(1);
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
              onClick={() => router.push('/admin/cursos')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
          <h1 className="text-2xl font-bold mb-2">
            Módulos do Curso: {course?.titulo || 'Carregando...'}
          </h1>
          <p className="text-gray-600">Gerencie os módulos deste curso</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Módulo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Adicionar Módulo</DialogTitle>
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
                  placeholder="Descrição do módulo"
                />
              </div>
              
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
                <p className="text-xs text-gray-500 mt-1">
                  Ordem de exibição do módulo (número menor aparece primeiro)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateModule} disabled={loading}>
                {loading ? "Criando..." : "Criar Módulo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading && modules.length === 0 ? (
        <div className="flex justify-center items-center h-40">
          <p>Carregando módulos...</p>
        </div>
      ) : modules.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Nenhum módulo criado ainda.</p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Criar Primeiro Módulo
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Ordem</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-[180px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((module) => (
              <TableRow key={module.id}>
                <TableCell className="font-medium">{module.ordem}</TableCell>
                <TableCell className="font-medium">{module.titulo}</TableCell>
                <TableCell className="text-gray-600">
                  {module.descricao || '-'}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => router.push(`/admin/cursos/${courseId}/modulos/${module.id}/aulas`)}
                      title="Gerenciar Aulas"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(module)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteModule(module.id)}
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Módulo</DialogTitle>
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
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateModule} disabled={loading}>
              {loading ? "Atualizando..." : "Atualizar Módulo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Page;
