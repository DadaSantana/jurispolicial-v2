'use client'
import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types/user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { SubscriptionDialog } from '@/components/admin/SubscriptionDialog';

const Page = () => {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
    
    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // Filtros
    const [filterPlano, setFilterPlano] = useState<string>('todos');
    const [filterStatus, setFilterStatus] = useState<string>('todos');
    const [sortBy, setSortBy] = useState<'dataCadastro' | 'nome' | 'ultimoLogin'>('dataCadastro');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const usersQuery = query(collection(db, "users"), orderBy("dataCadastro", "desc"));
                const querySnapshot = await getDocs(usersQuery);
                const usersData: User[] = [];

                querySnapshot.forEach((doc) => {
                    const userData = doc.data();
                    usersData.push({
                        uid: doc.id,
                        ...userData,
                        dataCadastro: userData.dataCadastro instanceof Timestamp
                            ? userData.dataCadastro.toDate()
                            : userData.dataCadastro,
                        ultimoLogin: userData.ultimoLogin instanceof Timestamp
                            ? userData.ultimoLogin.toDate()
                            : userData.ultimoLogin
                    } as User);
                });

                setUsers(usersData);
            } catch (error) {
                console.error("Error fetching users:", error);
                toast({
                    title: "Erro ao carregar usuários",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const addCredits = async (userId: string, credits: number) => {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                creditos: credits + 5
            });

            // Update local state
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.uid === userId
                        ? { ...user, creditos: user.creditos + 5 }
                        : user
                )
            );

            toast({
                title: "Créditos adicionados",
                description: "5 créditos foram adicionados ao usuário."
            });
        } catch (error) {
            console.error("Error adding credits:", error);
            toast({
                title: "Erro ao adicionar créditos",
                variant: "destructive"
            });
        }
    };

    // Aplicar filtros e ordenação
    const filteredAndSortedUsers = useMemo(() => {
        let filtered = [...users];

        // Filtro de busca
        if (searchTerm) {
            filtered = filtered.filter(user =>
                user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.cpf.includes(searchTerm)
            );
        }

        // Filtro por plano
        if (filterPlano !== 'todos') {
            filtered = filtered.filter(user => {
                if (filterPlano === 'sem-plano') {
                    return !user.plano || !user.plano.tipo;
                }
                return user.plano?.tipo === filterPlano;
            });
        }

        // Filtro por status do plano
        if (filterStatus !== 'todos') {
            filtered = filtered.filter(user => {
                if (filterStatus === 'sem-status') {
                    return !user.plano || !user.plano.status;
                }
                return user.plano?.status === filterStatus;
            });
        }

        // Ordenação
        filtered.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'nome':
                    comparison = a.nome.localeCompare(b.nome);
                    break;
                case 'ultimoLogin':
                    const loginA = a.ultimoLogin instanceof Date ? a.ultimoLogin : new Date(a.ultimoLogin || 0);
                    const loginB = b.ultimoLogin instanceof Date ? b.ultimoLogin : new Date(b.ultimoLogin || 0);
                    comparison = loginA.getTime() - loginB.getTime();
                    break;
                case 'dataCadastro':
                default:
                    const cadA = a.dataCadastro instanceof Date ? a.dataCadastro : new Date(a.dataCadastro || 0);
                    const cadB = b.dataCadastro instanceof Date ? b.dataCadastro : new Date(b.dataCadastro || 0);
                    comparison = cadA.getTime() - cadB.getTime();
                    break;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [users, searchTerm, filterPlano, filterStatus, sortBy, sortOrder]);

    // Paginação
    const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = filteredAndSortedUsers.slice(startIndex, endIndex);

    // Resetar para primeira página quando filtros mudarem
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterPlano, filterStatus, sortBy, sortOrder, itemsPerPage]);

    const formatDate = (date: Date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Gerenciar Assinantes</h1>

            {/* Filtros e Busca */}
            <div className="mb-6 space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Buscar por nome, email ou CPF..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Adicionar Usuário
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <Label htmlFor="filter-plano" className="mb-2 block">
                            Filtrar por Plano
                        </Label>
                        <Select value={filterPlano} onValueChange={setFilterPlano}>
                            <SelectTrigger id="filter-plano">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os Planos</SelectItem>
                                <SelectItem value="gratuito">Gratuito</SelectItem>
                                <SelectItem value="mensal">Mensal</SelectItem>
                                <SelectItem value="trimestral">Trimestral</SelectItem>
                                <SelectItem value="semestral">Semestral</SelectItem>
                                <SelectItem value="anual">Anual</SelectItem>
                                <SelectItem value="teste">Teste</SelectItem>
                                <SelectItem value="sem-plano">Sem Plano</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="filter-status" className="mb-2 block">
                            Filtrar por Status
                        </Label>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger id="filter-status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os Status</SelectItem>
                                <SelectItem value="ativo">Ativo</SelectItem>
                                <SelectItem value="inativo">Inativo</SelectItem>
                                <SelectItem value="trial">Trial</SelectItem>
                                <SelectItem value="cancelado">Cancelado</SelectItem>
                                <SelectItem value="sem-status">Sem Status</SelectItem>
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
                                <SelectItem value="dataCadastro">Data de Cadastro</SelectItem>
                                <SelectItem value="nome">Nome</SelectItem>
                                <SelectItem value="ultimoLogin">Último Login</SelectItem>
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
                        Mostrando {paginatedUsers.length > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, filteredAndSortedUsers.length)} de {filteredAndSortedUsers.length} assinantes
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

            <Card>
                <CardHeader>
                    <CardTitle>Assinantes</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <p>Carregando assinantes...</p>
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>CPF</TableHead>
                                        <TableHead>Plano</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Créditos</TableHead>
                                        <TableHead>Data Cadastro</TableHead>
                                        <TableHead className="w-[80px]">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center h-24">
                                                Nenhum assinante encontrado
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedUsers.map((user) => (
                                            <TableRow key={user.uid}>
                                                <TableCell className="font-medium">{user.nome}</TableCell>
                                                <TableCell>{user.email || '-'}</TableCell>
                                                <TableCell>{user.cpf}</TableCell>
                                                <TableCell>
                                                    <Badge variant={user.plano?.tipo === 'gratuito' ? 'outline' : 'special'}>
                                                        {user.plano?.tipo ? user.plano.tipo.charAt(0).toUpperCase() + user.plano.tipo.slice(1) : 'Não definido'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge 
                                                        variant="outline"
                                                        className={
                                                            user.plano?.status === 'ativo' 
                                                                ? 'bg-green-100 text-green-800 border-green-300'
                                                                : user.plano?.status === 'trial'
                                                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                                                : user.plano?.status === 'cancelado'
                                                                ? 'bg-red-100 text-red-800 border-red-300'
                                                                : 'bg-gray-100 text-gray-800 border-gray-300'
                                                        }
                                                    >
                                                        {user.plano?.status || 'Sem status'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{user.creditos || 0}</TableCell>
                                                <TableCell>{formatDate(user.dataCadastro)}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                                <span className="sr-only">Abrir menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => addCredits(user.uid, user.creditos)}>
                                                                Adicionar 5 créditos
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => router.push(`/admin/historico/membro/${user.uid}`)}>
                                                                Ver consultas
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => {
                                                                setSelectedUser(user);
                                                                setSubscriptionDialogOpen(true);
                                                            }}>
                                                                Editar assinatura
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-600">
                                                                Desativar usuário
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
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
                </CardContent>
            </Card>
            
            {selectedUser && (
                <SubscriptionDialog
                    open={subscriptionDialogOpen}
                    onOpenChange={setSubscriptionDialogOpen}
                    user={selectedUser}
                />
            )}
        </div>
    );
};

export default Page;
