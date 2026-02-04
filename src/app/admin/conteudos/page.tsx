'use client'
import React, { useState, useEffect, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Image, FileText, Package, Pencil, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import CurrencyInput from 'react-currency-input-field';
import Products from '@/components/Products';
import { formatDate } from '@/utils/date';

type Conteudo = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'pdf' | 'video';
  valor: number;
  url: string;
  imagem: string;
  arquivo: string;
  exclusivo: boolean;
  dataInicio: Date | null;
  dataFim: Date | null;
  dataCriacao: Timestamp;
};

const uploadFileToStorage = async (file: File, folder: string): Promise<string> => {
  const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};

const Page = () => {
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<'pdf' | 'video'>('pdf');
  const [valor, setValor] = useState(0);
  const [imagem, setImagem] = useState('');
  const [url, setUrl] = useState('');
  const [exclusivo, setExclusivo] = useState(false);
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [refresh, setRefresh] = useState(false);
  const [editingContent, setEditingContent] = useState<Conteudo | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  
  // Paginação e Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterExclusivo, setFilterExclusivo] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<'dataCriacao' | 'titulo' | 'valor'>('dataCriacao');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFile(file);
      
      // Create a preview URL for the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setArquivo(file);
      setSelectedFile(file);
    }
  };
  
  const createContent = async () => {
    try {
      setLoading(true);
      
      let imageUrl = imagem;
      if (file) {
        imageUrl = await uploadFileToStorage(file, 'contents');
      }
      
      let arquivoUrl = '';
      if (arquivo) {
        arquivoUrl = await uploadFileToStorage(arquivo, 'contents');
      }
      
      await addDoc(collection(db, "conteudos"), {
        titulo,
        descricao,
        tipo,
        valor,
        imagem: imageUrl,
        url,
        exclusivo,
        dataInicio,
        dataFim,
        arquivo: arquivoUrl,
        dataCriacao: serverTimestamp()
      });
      
      toast({
        title: "Conteúdo criado com sucesso!",
      });
      
      setOpen(false);
      setRefresh(!refresh);
      
      // Clear form fields
      setTitulo('');
      setDescricao('');
      setTipo('pdf');
      setValor(0);
      setImagem('');
      setUrl('');
      setExclusivo(false);
      setDataInicio(null);
      setDataFim(null);
      setFile(null);
      setPreviewUrl(null);
      setArquivo(null);
      setSelectedFile(null);
    } catch (error) {
      console.error("Error creating content:", error);
      toast({
        title: "Erro ao criar conteúdo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const deleteContent = async (id: string, imageUrl: string, arquivoUrl: string) => {
    try {
      setLoading(true);
      
      // Delete the image from storage
      if (imageUrl) {
        const imageRef = ref(storage, imageUrl);
        await deleteDoc(doc(db, "conteudos", id));
        await deleteObject(imageRef);
      } else {
        await deleteDoc(doc(db, "conteudos", id));
      }
      
      // Delete the arquivo from storage
      if (arquivoUrl) {
        const arquivoRef = ref(storage, arquivoUrl);
        await deleteObject(arquivoRef);
      }
      
      toast({
        title: "Conteúdo deletado com sucesso!",
      });
      
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error deleting content:", error);
      toast({
        title: "Erro ao deletar conteúdo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateContent = async () => {
    try {
      setLoading(true);
      
      let imageUrl = editingContent?.imagem;
      if (file) {
        imageUrl = await uploadFileToStorage(file, 'contents');
      }
      
      let arquivoUrl = editingContent?.arquivo;
      if (arquivo) {
        arquivoUrl = await uploadFileToStorage(arquivo, 'contents');
      }
      
      if (editingContent) {
        const contentRef = doc(db, "conteudos", editingContent.id);
        await updateDoc(contentRef, {
          titulo,
          descricao,
          tipo,
          valor,
          imagem: imageUrl,
          url,
          exclusivo,
          dataInicio,
          dataFim,
          arquivo: arquivoUrl,
          dataAtualizacao: serverTimestamp()
        });
        
        toast({
          title: "Conteúdo atualizado com sucesso!",
        });
        
        setEditOpen(false);
        setRefresh(!refresh);
        
        // Clear form fields
        setTitulo('');
        setDescricao('');
        setTipo('pdf');
        setValor(0);
        setImagem('');
        setUrl('');
        setExclusivo(false);
        setDataInicio(null);
        setDataFim(null);
        setFile(null);
        setPreviewUrl(null);
        setArquivo(null);
        setSelectedFile(null);
        setEditingContent(null);
      }
    } catch (error) {
      console.error("Error updating content:", error);
      toast({
        title: "Erro ao atualizar conteúdo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (conteudo: Conteudo) => {
    setEditingContent(conteudo);
    setTitulo(conteudo.titulo);
    setDescricao(conteudo.descricao);
    setTipo(conteudo.tipo);
    setValor(conteudo.valor);
    setImagem(conteudo.imagem);
    setUrl(conteudo.url);
    setExclusivo(conteudo.exclusivo);
    setDataInicio(conteudo.dataInicio);
    setDataFim(conteudo.dataFim);
    setPreviewUrl(conteudo.imagem);
    setEditOpen(true);
  };

  useEffect(() => {
    const fetchContents = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, "conteudos"));
        const contentsData: Conteudo[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          contentsData.push({
            id: doc.id,
            titulo: data.titulo,
            descricao: data.descricao,
            tipo: data.tipo,
            valor: data.valor,
            imagem: data.imagem,
            url: data.url,
            arquivo: data.arquivo,
            exclusivo: data.exclusivo,
            dataInicio: data.dataInicio instanceof Timestamp 
              ? data.dataInicio.toDate() 
              : data.dataInicio,
            dataFim: data.dataFim instanceof Timestamp 
              ? data.dataFim.toDate() 
              : data.dataFim,
            dataCriacao: data.dataCriacao
          } as Conteudo);
        });
        
        setConteudos(contentsData);
      } catch (error) {
        console.error("Error fetching contents:", error);
        toast({
          title: "Erro ao carregar conteúdos",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchContents();
  }, [refresh]);

  // Aplicar filtros e ordenação
  const filteredAndSortedContents = useMemo(() => {
    let filtered = [...conteudos];

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(conteudo =>
        conteudo.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conteudo.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por tipo
    if (filterTipo !== 'todos') {
      filtered = filtered.filter(conteudo => conteudo.tipo === filterTipo);
    }

    // Filtro por exclusivo
    if (filterExclusivo !== 'todos') {
      filtered = filtered.filter(conteudo => {
        if (filterExclusivo === 'sim') return conteudo.exclusivo === true;
        if (filterExclusivo === 'nao') return conteudo.exclusivo === false;
        return true;
      });
    }

    // Ordenação
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'titulo':
          comparison = a.titulo.localeCompare(b.titulo);
          break;
        case 'valor':
          comparison = a.valor - b.valor;
          break;
        case 'dataCriacao':
        default:
          const dateA = a.dataCriacao instanceof Timestamp 
            ? a.dataCriacao.toDate() 
            : a.dataCriacao instanceof Date 
            ? a.dataCriacao 
            : new Date(a.dataCriacao);
          const dateB = b.dataCriacao instanceof Timestamp 
            ? b.dataCriacao.toDate() 
            : b.dataCriacao instanceof Date 
            ? b.dataCriacao 
            : new Date(b.dataCriacao);
          comparison = dateA.getTime() - dateB.getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [conteudos, searchTerm, filterTipo, filterExclusivo, sortBy, sortOrder]);

  // Paginação
  const totalPages = Math.ceil(filteredAndSortedContents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContents = filteredAndSortedContents.slice(startIndex, endIndex);

  // Resetar para primeira página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterTipo, filterExclusivo, sortBy, sortOrder, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Gerenciar Conteúdos</h1>
      
      <div className="mb-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Conteúdo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Adicionar Conteúdo</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="flex flex-col items-center justify-center">
                <div className="border border-dashed border-gray-300 rounded-lg p-4 w-full h-[300px] flex items-center justify-center overflow-hidden">
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
                <div className="mt-4 w-full space-y-4">
                  <div>
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
                  <div>
                    <Label htmlFor="arquivo" className="mb-2 block">
                      Arquivo do Conteúdo (PDF ou MP4)
                    </Label>
                    <Input
                      type="file"
                      id="arquivo"
                      accept=".pdf,.mp4"
                      onChange={handleFileChange}
                      className="w-full"
                    />
                    {selectedFile && (
                      <p className="text-sm text-gray-500 mt-1">
                        Arquivo selecionado: {selectedFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="titulo" className="mb-2 block">
                    Título
                  </Label>
                  <Input 
                    id="titulo" 
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="w-full" 
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
                  />
                </div>
                <div>
                  <Label htmlFor="tipo" className="mb-2 block">
                    Tipo
                  </Label>
                  <Select onValueChange={(value) => setTipo(value as 'pdf' | 'video')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="video">Vídeo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="valor" className="mb-2 block">
                    Valor (R$)
                  </Label>
                  <CurrencyInput
                    id="valor"
                    name="valor"
                    placeholder="R$ 0,00"
                    defaultValue={0}
                    decimalsLimit={2}
                    onValueChange={(value) => setValor(Number(value) || 0)}
                    intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="url" className="mb-2 block">
                    URL
                  </Label>
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="exclusivo"
                    checked={exclusivo}
                    onCheckedChange={(checked) => setExclusivo(checked)}
                  />
                  <Label htmlFor="exclusivo">
                    Exclusivo
                  </Label>
                </div>
                
                {exclusivo && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="dataInicio" className="mb-2 block">
                        Data de Início
                      </Label>
                      <Input
                        id="dataInicio"
                        type="date"
                        onChange={(e) => setDataInicio(e.target.value ? new Date(e.target.value) : null)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dataFim" className="mb-2 block">
                        Data de Término
                      </Label>
                      <Input
                        id="dataFim"
                        type="date"
                        onChange={(e) => setDataFim(e.target.value ? new Date(e.target.value) : null)}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={createContent} disabled={loading}>
                {loading ? "Criando..." : "Criar Conteúdo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Tabs defaultValue="contents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contents"><FileText className="h-4 w-4 mr-2" /> Conteúdos</TabsTrigger>
          <TabsTrigger value="products"><Package className="h-4 w-4 mr-2" /> Produtos</TabsTrigger>
        </TabsList>
        <TabsContent value="contents">
          <div>
            {/* Filtros e Busca */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[250px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Buscar por título ou descrição..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="filter-tipo" className="mb-2 block">
                    Filtrar por Tipo
                  </Label>
                  <Select value={filterTipo} onValueChange={setFilterTipo}>
                    <SelectTrigger id="filter-tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Tipos</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="video">Vídeo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="filter-exclusivo" className="mb-2 block">
                    Filtrar por Exclusivo
                  </Label>
                  <Select value={filterExclusivo} onValueChange={setFilterExclusivo}>
                    <SelectTrigger id="filter-exclusivo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="sim">Exclusivo</SelectItem>
                      <SelectItem value="nao">Não Exclusivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sort-by" className="mb-2 block">
                    Ordenar por
                  </Label>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger id="sort-by">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dataCriacao">Data de Criação</SelectItem>
                      <SelectItem value="titulo">Título</SelectItem>
                      <SelectItem value="valor">Valor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sort-order" className="mb-2 block">
                    Ordem
                  </Label>
                  <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                    <SelectTrigger id="sort-order">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Decrescente</SelectItem>
                      <SelectItem value="asc">Crescente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Informações de Resultados */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <p>
                  Mostrando {paginatedContents.length > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, filteredAndSortedContents.length)} de {filteredAndSortedContents.length} conteúdos
                </p>
                <div className="flex items-center gap-2">
                  <Label htmlFor="items-per-page" className="text-sm">
                    Itens por página:
                  </Label>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                    <SelectTrigger id="items-per-page" className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-bold mb-2">Conteúdos</h2>
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <p>Carregando conteúdos...</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Exclusivo</TableHead>
                        <TableHead className="w-[120px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedContents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center h-24">
                            Nenhum conteúdo encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedContents.map((conteudo) => (
                          <TableRow key={conteudo.id}>
                            <TableCell className="font-medium">{conteudo.titulo}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {conteudo.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell>R$ {conteudo.valor.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={conteudo.exclusivo ? "default" : "outline"}
                                className={conteudo.exclusivo ? "bg-green-100 text-green-800" : ""}
                              >
                                {conteudo.exclusivo ? 'Sim' : 'Não'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleEdit(conteudo)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => deleteContent(conteudo.id, conteudo.imagem, conteudo.arquivo)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        Página {currentPage} de {totalPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Anterior
                        </Button>
                        
                        {/* Botões de página */}
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            // Mostrar apenas algumas páginas próximas
                            if (
                              page === 1 ||
                              page === totalPages ||
                              (page >= currentPage - 1 && page <= currentPage + 1)
                            ) {
                              return (
                                <Button
                                  key={page}
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handlePageChange(page)}
                                  className="min-w-[40px]"
                                >
                                  {page}
                                </Button>
                              );
                            } else if (
                              page === currentPage - 2 ||
                              page === currentPage + 2
                            ) {
                              return <span key={page} className="px-2">...</span>;
                            }
                            return null;
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Próxima
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="products">
          <Products />
        </TabsContent>
      </Tabs>

      {/* Modal de Edição */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Editar Conteúdo</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="flex flex-col items-center justify-center">
              <div className="border border-dashed border-gray-300 rounded-lg p-4 w-full h-[300px] flex items-center justify-center overflow-hidden">
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
              <div className="mt-4 w-full space-y-4">
                <div>
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
                <div>
                  <Label htmlFor="arquivo" className="mb-2 block">
                    Arquivo do Conteúdo (PDF ou MP4)
                  </Label>
                  <Input
                    type="file"
                    id="arquivo"
                    accept=".pdf,.mp4"
                    onChange={handleFileChange}
                    className="w-full"
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-500 mt-1">
                      Arquivo selecionado: {selectedFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="titulo" className="mb-2 block">
                  Título
                </Label>
                <Input 
                  id="titulo" 
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full" 
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
                />
              </div>
              <div>
                <Label htmlFor="tipo" className="mb-2 block">
                  Tipo
                </Label>
                <Select value={tipo} onValueChange={(value) => setTipo(value as 'pdf' | 'video')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <div>
                <Label htmlFor="url" className="mb-2 block">
                  URL
                </Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="exclusivo"
                  checked={exclusivo}
                  onCheckedChange={(checked) => setExclusivo(checked)}
                />
                <Label htmlFor="exclusivo">
                  Exclusivo
                </Label>
              </div>
              
              {exclusivo && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="dataInicio" className="mb-2 block">
                      Data de Início
                    </Label>
                    <Input
                      id="dataInicio"
                      type="date"
                      value={dataInicio ? dataInicio.toISOString().split('T')[0] : ''}
                      onChange={(e) => setDataInicio(e.target.value ? new Date(e.target.value) : null)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dataFim" className="mb-2 block">
                      Data de Término
                    </Label>
                    <Input
                      id="dataFim"
                      type="date"
                      value={dataFim ? dataFim.toISOString().split('T')[0] : ''}
                      onChange={(e) => setDataFim(e.target.value ? new Date(e.target.value) : null)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={updateContent} disabled={loading}>
              {loading ? "Atualizando..." : "Atualizar Conteúdo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Page;