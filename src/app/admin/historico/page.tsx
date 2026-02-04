'use client'
import React, { useEffect, useState } from 'react';
import { formatDate } from '@/utils/date';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Eye } from 'lucide-react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Consulta, Tag, User } from '@/types/user';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux/store';
import Link from 'next/link';

const Page = () => {
    const user: User = useSelector((state: RootState) => state.userSlice.user)
    const [consultas, setConsultas] = useState<Consulta[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchConsultas = async () => {
            try {
                setLoading(true);
                const q = query(
                    collection(db, 'consultas'),
                    where('userId', '==', user.uid),
                    orderBy('dataCriacao', 'desc')
                );

                const snapshot = await getDocs(q);
                const items: Consulta[] = [];

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    items.push({
                        id: doc.id,
                        ...data,
                        dataCriacao: data.dataCriacao?.toDate ? data.dataCriacao.toDate() : new Date(data.dataCriacao?.seconds * 1000)
                    } as Consulta);
                });

                setConsultas(items);
                console.log('Consultas carregadas:', items);
            } catch (error) {
                console.error('Erro ao buscar consultas:', error);
                toast({
                    title: 'Erro',
                    description: 'Não foi possível carregar o histórico de consultas.',
                    variant: 'destructive'
                });
            } finally {
                setLoading(false);
            }
        };

        if (user && user.uid) {
            fetchConsultas();
        }
    }, [user]);

    const renderTagBadge = (tag: Tag) => {
        const colors = {
            normal: 'bg-gray-200 text-gray-800',
            atencao: 'bg-yellow-200 text-yellow-800',
            importante: 'bg-red-200 text-red-800'
        };

        return (
            <Badge
                key={tag.id}
                className={`${colors[tag.nivel]} mr-2 mb-1`}
            >
                {tag.texto}
            </Badge>
        );
    };

    const filteredConsultas = consultas.filter(consulta =>
        consulta.assunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        consulta.tags.some(tag => tag.texto.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const displayConsultas = filteredConsultas.length > 0 ? filteredConsultas : [];

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Histórico de Consultas</h1>
                <div className="relative w-64">
                    <Input
                        placeholder="Buscar por assunto ou tag..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-8"
                    />
                    <Search className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                </div>
            </div>

            {displayConsultas.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhuma consulta encontrada</h3>
                    <p className="text-gray-500">
                        Você ainda não realizou nenhuma consulta ou não há resultados para sua busca.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Assunto</TableHead>
                                <TableHead>Tags</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayConsultas.map((consulta) => (
                                <TableRow key={consulta.id}>
                                    <TableCell className="font-medium">
                                        {formatDate(consulta.dataCriacao)}
                                    </TableCell>
                                    <TableCell>{consulta.assunto}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap">
                                            {consulta.tags.map(renderTagBadge)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            asChild
                                        >
                                            <Link href={`/dashboard/historico/${consulta.id}`}>
                                                <Eye className="mr-2 h-4 w-4" /> Ver
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
};

export default Page;
