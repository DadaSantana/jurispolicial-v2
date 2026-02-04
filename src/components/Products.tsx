'use client'
import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Produto } from '@/types/user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Package, Image } from 'lucide-react';
import { uploadFile } from '@/services/storageService';
import CurrencyInput from 'react-currency-input-field';

const Products = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
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
  
  const createProduct = async () => {
    try {
      setLoading(true);
      
      let imageUrl = '';
      if (file) {
        // Upload image to Firebase Storage
        const uploadTask = uploadFile({
          file,
          path: `produtos/${file.name}`,
          onSuccess: (url) => {
            imageUrl = url;
            // Continue creating product
            addProductToFirestore(url);
          },
          onError: (error) => {
            throw error;
          }
        });
      } else {
        addProductToFirestore('');
      }
      
    } catch (error) {
      console.error("Error creating product:", error);
      toast({
        title: "Erro ao criar produto",
        variant: "destructive"
      });
      setLoading(false);
    }
  };
  
  const addProductToFirestore = async (imageUrl: string) => {
    try {
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
        title: "Produto criado com sucesso!",
      });
      
      setOpen(false);
      setRefresh(!refresh);
      
      // Clear form fields
      setTitulo('');
      setDescricao('');
      setTipo('digital');
      setValor(0);
      setImagem('');
      setExclusivo(false);
      setDataInicio(null);
      setDataFim(null);
      setFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error("Error adding product to Firestore:", error);
      toast({
        title: "Erro ao salvar produto",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const deleteProduct = async (id: string, imageUrl: string) => {
    try {
      setLoading(true);
      
      // Delete the image from storage if it exists
      if (imageUrl) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      }
      
      // Delete from Firestore
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
            exclusivo: data.exclusivo,
            stripeProductId: data.stripeProductId,
            stripePriceId: data.stripePriceId,
            dataCriacao: data.dataCriacao instanceof Timestamp 
              ? data.dataCriacao.toDate() 
              : new Date(),
            dataInicio: data.dataInicio instanceof Timestamp 
              ? data.dataInicio.toDate() 
              : null,
            dataFim: data.dataFim instanceof Timestamp 
              ? data.dataFim.toDate() 
              : null
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
  
  const formatDate = (date: Date) => {
    return date.toISOString().substring(0, 10);
  };
  
  return (
    <div>
      <div className="mb-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Adicionar Produto</DialogTitle>
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
                      <p>Selecione uma imagem para visualizar</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 w-full">
                  <Label htmlFor="imagem" className="mb-2 block">
                    Imagem
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
                  <Select onValueChange={(value) => setTipo(value as 'fisico' | 'digital')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fisico">Físico</SelectItem>
                      <SelectItem value="digital">Digital</SelectItem>
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
                        value={dataInicio ? formatDate(dataInicio) : ''}
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
                        value={dataFim ? formatDate(dataFim) : ''}
                        onChange={(e) => setDataFim(e.target.value ? new Date(e.target.value) : null)}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={createProduct} disabled={loading}>
                {loading ? "Criando..." : "Criar Produto"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <p>Carregando produtos...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Exclusivo</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell className="font-medium">{produto.titulo}</TableCell>
                    <TableCell>{produto.tipo}</TableCell>
                    <TableCell>R$ {produto.valor.toFixed(2)}</TableCell>
                    <TableCell>{produto.exclusivo ? 'Sim' : 'Não'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deleteProduct(produto.id, produto.imagem)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deletar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Products;