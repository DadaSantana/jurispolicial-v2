'use client'
import React, { useState, useEffect } from 'react';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Produto } from '@/types/user';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { User } from '@/types/user';
import Image from 'next/image';

const LojaPage = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const user: User = useSelector((state: RootState) => state.userSlice.user);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "produtos"));
        const productsData: Produto[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Verificar se o produto está disponível (não exclusivo ou dentro do período)
          const now = new Date();
          const dataInicio = data.dataInicio instanceof Timestamp 
            ? data.dataInicio.toDate() 
            : data.dataInicio ? new Date(data.dataInicio) : null;
          const dataFim = data.dataFim instanceof Timestamp 
            ? data.dataFim.toDate() 
            : data.dataFim ? new Date(data.dataFim) : null;

          const isAvailable = !data.exclusivo || 
            (dataInicio && dataFim && now >= dataInicio && now <= dataFim) ||
            (!dataInicio && !dataFim);

          if (isAvailable) {
            productsData.push({
              id: doc.id,
              titulo: data.titulo,
              descricao: data.descricao,
              tipo: data.tipo,
              valor: data.valor,
              imagem: data.imagem,
              exclusivo: data.exclusivo,
              dataCriacao: data.dataCriacao instanceof Timestamp 
                ? data.dataCriacao.toDate() 
                : new Date(),
              dataInicio: dataInicio,
              dataFim: dataFim,
            } as Produto);
          }
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
  }, []);

  const handlePurchase = async (product: Produto) => {
    if (!user.uid || !user.email) {
      toast({
        title: "Login necessário",
        description: "Por favor, faça login para comprar produtos.",
        variant: "destructive"
      });
      return;
    }

    setPurchasing(product.id);

    try {
      const response = await fetch('/api/checkout/product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          productId: product.id,
          email: user.email,
          nome: user.nome,
          return_link: window.location.origin + '/loja',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar compra');
      }

      if (data.invoiceUrl) {
        // Abrir URL do boleto/pagamento em nova aba
        window.open(data.invoiceUrl, '_blank');
        toast({
          title: "Pagamento criado",
          description: "Siga as instruções na página de pagamento para finalizar sua compra.",
        });
      } else {
        toast({
          title: "Compra processada",
          description: "Sua compra está sendo processada. Você receberá um e-mail com os detalhes.",
        });
      }
    } catch (error: any) {
      console.error('Error purchasing product:', error);
      toast({
        title: "Erro na compra",
        description: error.message || "Não foi possível processar sua compra. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Nossa Loja</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Descubra nossos produtos exclusivos e materiais especiais
          </p>
        </div>

        {produtos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Nenhum produto disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {produtos.map((produto) => (
              <Card key={produto.id} className="flex flex-col">
                {produto.imagem && (
                  <div className="relative w-full h-48 bg-gray-200">
                    <Image
                      src={produto.imagem}
                      alt={produto.titulo}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{produto.titulo}</CardTitle>
                  <CardDescription>{produto.descricao}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">
                      R$ {produto.valor.toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {produto.tipo === 'digital' ? 'Digital' : 'Físico'}
                    </span>
                  </div>
                  {produto.exclusivo && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                      Exclusivo
                    </span>
                  )}
                </CardContent>
                <CardFooter className="mt-auto">
                  <Button
                    onClick={() => handlePurchase(produto)}
                    disabled={purchasing === produto.id}
                    className="w-full"
                  >
                    {purchasing === produto.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Comprar
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LojaPage;



