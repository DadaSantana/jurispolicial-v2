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
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Image, Pencil, Package, ExternalLink } from 'lucide-react';
import CurrencyInput from 'react-currency-input-field';
import { Produto } from '@/types/user';
import { createCheckout } from '@/services/asaasService';
import { uploadFileToStorage } from '@/services/storageService';

const Page = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  
  // Form fields
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState(0);
  const [tipo, setTipo] = useState<'fisico' | 'digital'>('digital');
  const [imagem, setImagem] = useState('');
  const [exclusivo, setExclusivo] = useState(false);
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(false);
  const [creatingAsaas, setCreatingAsaas] = useState(false);

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date instanceof Date 
      ? date.toISOString().split('T')[0]
      : new Date(date).toISOString().split('T')[0];
  };

  const resetForm = () => {
    setTitulo('');
    setDescricao('');
    setValor(0);
    setTipo('digital');
    setImagem('');
    setExclusivo(false);
    setDataInicio(null);
    setDataFim(null);
    setFile(null);
    setPreviewUrl(null);
    setEditingProduct(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const createProductWithAsaas = async () => {
    try {
      setLoading(true);
      setCreatingAsaas(true);

      // Validar campos obrigatórios
      if (!titulo.trim()) {
        toast({
          title: "Erro",
          description: "Título é obrigatório",
          variant: "destructive"
        });
        setLoading(false);
        setCreatingAsaas(false);
        return;
      }

      if (valor <= 0) {
        toast({
          title: "Erro",
          description: "Valor deve ser maior que zero",
          variant: "destructive"
        });
        setLoading(false);
        setCreatingAsaas(false);
        return;
      }

      // Upload da imagem se houver
      let imageUrl = imagem;
      if (file) {
        imageUrl = await uploadFileToStorage(file, 'produtos');
      }

      // Criar checkout no Asaas (link de pagamento para o produto)
      const YOUR_DOMAIN = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      try {
        let checkoutData = {
          name: titulo,
          description: descricao || `Produto: ${titulo}`,
          billingTypes: ['CREDIT_CARD', 'PIX', 'BOLETO'],
          chargeTypes: ['DETACHED'],
          items: [
            {
              name: titulo,
              description: descricao || `Produto: ${titulo}`,
              quantity: 1,
              value: valor,
            },
          ],
          value: valor,
          dueDate: dueDateStr,
          callback: {
            successUrl: `${YOUR_DOMAIN}/dashboard/produtos/success`,
            cancelUrl: `${YOUR_DOMAIN}/loja`,
            expiredUrl: `${YOUR_DOMAIN}/loja`,
          },
          backUrl: `${YOUR_DOMAIN}/loja`,
        };

        const checkout = await createCheckout(checkoutData);

        // Salvar produto no Firestore com IDs do Asaas
        await addDoc(collection(db, "produtos"), {
          titulo,
          descricao,
          tipo,
          valor,
          imagem: imageUrl,
          exclusivo,
          dataInicio,
          dataFim,
          asaasProductId: checkout.id,
          asaasCheckoutUrl: checkout.url,
          dataCriacao: serverTimestamp()
        });
      } catch (asaasError: any) {
        // Se falhar ao criar checkout no Asaas, salvar produto mesmo assim
        // O checkout será criado quando necessário na compra
        console.warn("Erro ao criar checkout no Asaas, salvando produto sem checkout:", asaasError);
        
        await addDoc(collection(db, "produtos"), {
          titulo,
          descricao,
          tipo,
          valor,
          imagem: imageUrl,
          exclusivo,
          dataInicio,
          dataFim,
          dataCriacao: serverTimestamp()
        });
        
        toast({
          title: "Produto criado, mas checkout não foi criado",
          description: "O checkout será criado automaticamente na compra.",
          variant: "default"
        });
      }
      
      toast({
        title: "Produto criado com sucesso!",
        description: "Produto cadastrado e checkout criado no Asaas.",
      });
      
      setOpen(false);
      resetForm();
      setRefresh(!refresh);
    } catch (error: any) {
      console.error("Error creating product:", error);
      toast({
        title: "Erro ao criar produto",
        description: error.message || "Não foi possível criar o produto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setCreatingAsaas(false);
    }
  };

  const handleEdit = (produto: Produto) => {
    setEditingProduct(produto);
    setTitulo(produto.titulo);
    setDescricao(produto.descricao);
    setValor(produto.valor);
    setTipo(produto.tipo);
    setImagem(produto.imagem || '');
    setExclusivo(produto.exclusivo || false);
    setDataInicio(produto.dataInicio || null);
    setDataFim(produto.dataFim || null);
    setPreviewUrl(produto.imagem || null);
    setEditOpen(true);
  };

  const updateProduct = async () => {
    if (!editingProduct) return;

    try {
      setLoading(true);

      // Upload da nova imagem se houver
      let imageUrl = editingProduct.imagem || '';
      if (file) {
        imageUrl = await uploadFileToStorage(file, 'produtos');
      }

      // Atualizar no Firestore
      const productRef = doc(db, "produtos", editingProduct.id);
      await updateDoc(productRef, {
        titulo,
        descricao,
        tipo,
        valor,
        imagem: imageUrl,
        exclusivo,
        dataInicio,
        dataFim,
      });

      toast({
        title: "Produto atualizado com sucesso!",
      });

      setEditOpen(false);
      resetForm();
      setRefresh(!refresh);
    } catch (error: any) {
      console.error("Error updating product:", error);
      toast({
        title: "Erro ao atualizar produto",
        description: error.message || "Não foi possível atualizar o produto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string, imageUrl: string) => {
    if (!confirm('Tem certeza que deseja deletar este produto?')) {
      return;
    }

    try {
      setLoading(true);
      
      // Deletar imagem do storage se existir
      if (imageUrl) {
        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        } catch (error) {
          console.error("Error deleting image:", error);
          // Continuar mesmo se não conseguir deletar a imagem
        }
      }
      
      // Deletar do Firestore
      await deleteDoc(doc(db, "produtos", id));
      
      toast({
        title: "Produto deletado com sucesso!",
      });
      
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Erro ao deletar produto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, "produtos"));
        const productsData: Produto[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          productsData.push({
            id: doc.id,
            titulo: data.titulo,
            descricao: data.descricao,
            tipo: data.tipo,
            valor: data.valor,
            imagem: data.imagem,
            exclusivo: data.exclusivo || false,
            asaasProductId: data.asaasProductId,
            asaasPriceId: data.asaasPriceId,
            dataCriacao: data.dataCriacao instanceof Timestamp 
              ? data.dataCriacao.toDate() 
              : new Date(),
            dataInicio: data.dataInicio instanceof Timestamp 
              ? data.dataInicio.toDate() 
              : (data.dataInicio ? new Date(data.dataInicio) : null),
            dataFim: data.dataFim instanceof Timestamp 
              ? data.dataFim.toDate() 
              : (data.dataFim ? new Date(data.dataFim) : null)
          } as Produto);
        });
        
        setProdutos(productsData);
      } catch (error) {
        console.error("Error fetching products:", error);
        toast({
          title: "Erro ao carregar produtos",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-gray-500 mt-1">Gerencie os produtos que serão vendidos na loja</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Produto</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="flex flex-col items-center justify-center">
                <div className="border border-dashed border-gray-300 rounded-lg p-4 w-full h-[300px] flex items-center justify-center overflow-hidden bg-gray-50">
                  {previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="max-w-full max-h-full object-contain" 
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <Image className="h-16 w-16 mx-auto mb-2" />
                      <p className="text-sm">Selecione uma imagem</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 w-full">
                  <Label htmlFor="imagem" className="mb-2 block">
                    Imagem do Produto
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
                    placeholder="Nome do produto"
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
                    placeholder="Descrição do produto"
                    className="w-full h-24"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipo" className="mb-2 block">
                      Tipo
                    </Label>
                    <Select value={tipo} onValueChange={(value) => setTipo(value as 'fisico' | 'digital')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fisico">Físico</SelectItem>
                        <SelectItem value="digital">Digital</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="valor" className="mb-2 block">
                      Valor (R$) *
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
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="exclusivo"
                    checked={exclusivo}
                    onCheckedChange={(checked) => setExclusivo(checked)}
                  />
                  <Label htmlFor="exclusivo">
                    Produto Exclusivo (com prazo de validade)
                  </Label>
                </div>
                
                {exclusivo && (
                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <Label htmlFor="dataInicio" className="mb-2 block">
                        Data de Início
                      </Label>
                      <Input
                        id="dataInicio"
                        type="date"
                        value={formatDate(dataInicio)}
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
                        value={formatDate(dataFim)}
                        onChange={(e) => setDataFim(e.target.value ? new Date(e.target.value) : null)}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                onClick={createProductWithAsaas} 
                disabled={loading || creatingAsaas}
              >
                {creatingAsaas ? "Criando no Asaas..." : loading ? "Criando..." : "Criar Produto"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {loading && produtos.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <p>Carregando produtos...</p>
            </div>
          ) : produtos.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Nenhum produto cadastrado ainda.</p>
              <p className="text-sm text-gray-400 mt-2">Clique em "Adicionar Produto" para começar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imagem</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Exclusivo</TableHead>
                  <TableHead>Status Asaas</TableHead>
                  <TableHead className="w-[150px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell>
                      {produto.imagem ? (
                        <img 
                          src={produto.imagem} 
                          alt={produto.titulo}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{produto.titulo}</TableCell>
                    <TableCell>
                      <span className="capitalize">{produto.tipo}</span>
                    </TableCell>
                    <TableCell>R$ {produto.valor.toFixed(2)}</TableCell>
                    <TableCell>{produto.exclusivo ? 'Sim' : 'Não'}</TableCell>
                    <TableCell>
                      {produto.asaasProductId ? (
                        <span className="text-green-600 text-sm">✓ Vinculado</span>
                      ) : (
                        <span className="text-gray-400 text-sm">Não vinculado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEdit(produto)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteProduct(produto.id, produto.imagem)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Modal de Edição */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="flex flex-col items-center justify-center">
              <div className="border border-dashed border-gray-300 rounded-lg p-4 w-full h-[300px] flex items-center justify-center overflow-hidden bg-gray-50">
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain" 
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <Image className="h-16 w-16 mx-auto mb-2" />
                    <p className="text-sm">Selecione uma imagem</p>
                  </div>
                )}
              </div>
              <div className="mt-4 w-full">
                <Label htmlFor="edit-imagem" className="mb-2 block">
                  Imagem do Produto
                </Label>
                <Input
                  type="file"
                  id="edit-imagem"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-titulo" className="mb-2 block">
                  Título *
                </Label>
                <Input 
                  id="edit-titulo" 
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Nome do produto"
                  className="w-full" 
                />
              </div>
              <div>
                <Label htmlFor="edit-descricao" className="mb-2 block">
                  Descrição
                </Label>
                <Textarea
                  id="edit-descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição do produto"
                  className="w-full h-24"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-tipo" className="mb-2 block">
                    Tipo
                  </Label>
                  <Select value={tipo} onValueChange={(value) => setTipo(value as 'fisico' | 'digital')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fisico">Físico</SelectItem>
                      <SelectItem value="digital">Digital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-valor" className="mb-2 block">
                    Valor (R$) *
                  </Label>
                  <CurrencyInput
                    id="edit-valor"
                    name="valor"
                    placeholder="R$ 0,00"
                    value={valor}
                    decimalsLimit={2}
                    onValueChange={(value) => setValor(Number(value) || 0)}
                    intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-exclusivo"
                  checked={exclusivo}
                  onCheckedChange={(checked) => setExclusivo(checked)}
                />
                <Label htmlFor="edit-exclusivo">
                  Produto Exclusivo (com prazo de validade)
                </Label>
              </div>
              
              {exclusivo && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <Label htmlFor="edit-dataInicio" className="mb-2 block">
                      Data de Início
                    </Label>
                    <Input
                      id="edit-dataInicio"
                      type="date"
                      value={formatDate(dataInicio)}
                      onChange={(e) => setDataInicio(e.target.value ? new Date(e.target.value) : null)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-dataFim" className="mb-2 block">
                      Data de Término
                    </Label>
                    <Input
                      id="edit-dataFim"
                      type="date"
                      value={formatDate(dataFim)}
                      onChange={(e) => setDataFim(e.target.value ? new Date(e.target.value) : null)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setEditOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              onClick={updateProduct} 
              disabled={loading}
            >
              {loading ? "Atualizando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Page;
