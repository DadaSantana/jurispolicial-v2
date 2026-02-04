'use client'
import React, { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Post } from '@/types/Post';

const Page = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [linkInstagram, setLinkInstagram] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exclusivo, setExclusivo] = useState(false);
  const [refresh, setRefresh] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const uploadFileToStorage = async (file: File, folder: string): Promise<string> => {
    const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  const createPost = async () => {
    try {
      setLoading(true);
      
      let imageUrl = '';
      if (file) {
        imageUrl = await uploadFileToStorage(file, 'posts');
      }

      await addDoc(collection(db, "posts"), {
        titulo,
        descricao,
        linkInstagram,
        imagem: imageUrl,
        exclusivo,
        dataCriacao: serverTimestamp()
      });

      toast({
        title: "Publicação criada com sucesso!",
      });

      setOpen(false);
      setRefresh(prev => !prev);

      // Clear form fields
      setTitulo('');
      setDescricao('');
      setLinkInstagram('');
      setFile(null);
      setPreviewUrl(null);
      setExclusivo(false);
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Erro ao criar publicação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (id: string, imageUrl: string) => {
    try {
      setLoading(true);
      
      // Delete the image from storage
      if (imageUrl) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      }

      // Delete the post from Firestore
      await deleteDoc(doc(db, "posts", id));

      toast({
        title: "Publicação deletada com sucesso!",
      });

      setRefresh(prev => !prev);
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: "Erro ao deletar publicação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "posts"));
        const postsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dataCriacao: doc.data().dataCriacao instanceof Timestamp 
            ? doc.data().dataCriacao.toDate() 
            : doc.data().dataCriacao
        })) as Post[];

        setPosts(postsData);
      } catch (error) {
        console.error("Error fetching posts:", error);
        toast({
          title: "Erro ao carregar publicações",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [refresh]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Gerenciar Publicações</h1>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Adicionar Publicação
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Adicionar Publicação</DialogTitle>
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
                <Label htmlFor="linkInstagram" className="mb-2 block">
                  Link do Instagram
                </Label>
                <Input
                  id="linkInstagram"
                  value={linkInstagram}
                  onChange={(e) => setLinkInstagram(e.target.value)}
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
                  Conteúdo Exclusivo
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={createPost} disabled={loading}>
              {loading ? "Criando..." : "Criar Publicação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-6">
        {loading ? (
          <div className="text-center py-8">
            <p>Carregando publicações...</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagem</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Exclusivo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id} className={cn(post.exclusivo && "bg-[#FFD700]/10")}>
                  <TableCell>
                    <img 
                      src={post.imagem} 
                      alt={post.titulo} 
                      className="w-16 h-16 object-cover rounded"
                    />
                  </TableCell>
                  <TableCell>{post.titulo}</TableCell>
                  <TableCell>
                    <a 
                      href={post.linkInstagram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Ver no Instagram
                    </a>
                  </TableCell>
                  <TableCell>{post.exclusivo ? 'Sim' : 'Não'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => deletePost(post.id, post.imagem)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deletar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default Page;