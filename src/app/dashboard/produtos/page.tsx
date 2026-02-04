'use client'
import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux/store';
import { User } from '@/types/user';
import { Produto } from '@/types/user';
import { getAllProducts, getUserPurchasedProducts } from '@/services/productService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Package, ShoppingCart, CheckCircle, Loader2, CreditCard, QrCode, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

const Page = () => {
  const router = useRouter();
  const user: User = useSelector((state: RootState) => state.userSlice.user);
  
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [purchasedProductIds, setPurchasedProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'fisico' | 'digital'>('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'disponiveis' | 'meus-produtos'>('todos');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT_CARD' | 'PIX' | 'BOLETO'>('CREDIT_CARD');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Buscar todos os produtos disponíveis
        const allProducts = await getAllProducts();
        setProdutos(allProducts || []);

        // Buscar produtos comprados pelo usuário
        if (user?.uid) {
          try {
            const purchased = await getUserPurchasedProducts(user.uid);
            setPurchasedProductIds(purchased || []);
          } catch (purchaseError) {
            console.error('Error fetching purchased products:', purchaseError);
            // Continuar mesmo se não conseguir buscar produtos comprados
            setPurchasedProductIds([]);
          }
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        toast({
          title: 'Erro ao carregar produtos',
          description: 'Não foi possível carregar os produtos disponíveis.',
          variant: 'destructive'
        });
        setProdutos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]);

  const handlePurchase = async (productId: string, product: Produto) => {
    try {
      if (!user?.uid) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar logado para comprar produtos.',
          variant: 'destructive'
        });
        router.push('/login');
        return;
      }

      // Verificar se já foi comprado
      if (purchasedProductIds.includes(productId)) {
        toast({
          title: 'Produto já adquirido',
          description: 'Você já possui este produto.',
        });
        return;
      }

      // Mostrar modal de escolha de método de pagamento
      setSelectedProduct(product);
      setShowPaymentModal(true);
    } catch (error: any) {
      console.error('Error purchasing product:', error);
      toast({
        title: 'Erro ao processar compra',
        description: error.message || 'Não foi possível processar sua compra.',
        variant: 'destructive'
      });
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedProduct || !user?.uid) return;

    try {
      setPurchasing(selectedProduct.id);
      setShowPaymentModal(false);

      // Criar checkout com método de pagamento selecionado
      const response = await fetch('/api/checkout/product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.uid,
          productId: selectedProduct.id,
          email: user.email,
          nome: user.nome,
          billingType: paymentMethod,
          return_link: `${window.location.origin}/dashboard/produtos`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar compra');
      }

      if (data.checkoutUrl) {
        // Abrir checkout do Asaas em nova aba
        window.open(data.checkoutUrl, '_blank');
        toast({
          title: 'Redirecionando para pagamento',
          description: 'A página de pagamento foi aberta em uma nova aba.',
        });
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
      setPurchasing(null);
      setSelectedProduct(null);
    }
  };

  // Filtrar produtos
  const filteredProducts = useMemo(() => {
    let filtered = [...produtos];

    // Busca
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por tipo
    if (filterType !== 'todos') {
      filtered = filtered.filter(product => product.tipo === filterType);
    }

    // Filtro por status (disponíveis vs meus produtos)
    if (filterStatus === 'meus-produtos') {
      filtered = filtered.filter(product =>
        purchasedProductIds.includes(product.id)
      );
    } else if (filterStatus === 'disponiveis') {
      filtered = filtered.filter(product =>
        !purchasedProductIds.includes(product.id)
      );
    }

    return filtered;
  }, [produtos, searchTerm, filterType, filterStatus, purchasedProductIds]);

  const isPurchased = (productId: string) => {
    return purchasedProductIds.includes(productId);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Produtos Disponíveis</h1>
        <p className="text-gray-600">Explore nossos produtos exclusivos e materiais especiais</p>
      </div>

      {/* Filtros e Busca */}
      <div className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar produtos..."
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
              <option value="digital">Digital</option>
              <option value="fisico">Físico</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Filtrar por Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="todos">Todos os Produtos</option>
              <option value="disponiveis">Disponíveis</option>
              <option value="meus-produtos">Meus Produtos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid de Produtos */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">
            {searchTerm || filterType !== 'todos' || filterStatus !== 'todos'
              ? 'Nenhum produto encontrado com os filtros selecionados.'
              : 'Nenhum produto disponível no momento.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const purchased = isPurchased(product.id);

            return (
              <Card key={product.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                {product.imagem && (
                  <div className="relative h-48 w-full overflow-hidden">
                    <Image
                      src={product.imagem}
                      alt={product.titulo}
                      fill
                      className="object-cover"
                    />
                    {purchased && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Comprado
                        </Badge>
                      </div>
                    )}
                    {product.exclusivo && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-yellow-500 text-white">
                          Exclusivo
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-xl line-clamp-2">{product.titulo}</CardTitle>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {product.descricao || 'Sem descrição'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">
                      R$ {product.valor.toFixed(2)}
                    </span>
                    <Badge variant="outline">
                      {product.tipo === 'digital' ? 'Digital' : 'Físico'}
                    </Badge>
                  </div>
                </CardContent>

                <CardFooter className="mt-auto">
                  {purchased ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Produto Adquirido
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handlePurchase(product.id, product)}
                      disabled={purchasing === product.id}
                    >
                      {purchasing === product.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Comprar Produto
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
              Selecione como deseja pagar pelo produto {selectedProduct?.titulo}
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
            
            {selectedProduct && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-semibold">Total:</span>
                <span className="text-2xl font-bold text-primary">R$ {selectedProduct.valor.toFixed(2)}</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmPayment} disabled={purchasing === selectedProduct?.id}>
              {purchasing === selectedProduct?.id ? (
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
