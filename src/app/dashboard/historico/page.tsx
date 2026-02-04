'use client'
import React, { useEffect, useState } from 'react';
import { formatDate } from '@/utils/date';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Eye, Tag as TagIcon, Plus } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
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
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const Page = () => {
    const user: User = useSelector((state: RootState) => state.userSlice.user)
    const [consultas, setConsultas] = useState<Consulta[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showTagDialog, setShowTagDialog] = useState(false);
    const [currentConsultaId, setCurrentConsultaId] = useState<string | null>(null);
    const [newTagText, setNewTagText] = useState('');
    const [newTagLevel, setNewTagLevel] = useState<'normal' | 'atencao' | 'importante'>('normal');
    const [addingTag, setAddingTag] = useState(false);

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
                    
                    // Verificar se as tags existem e são um array
                    console.log(`Consulta ${doc.id} - Tags:`, data.tags);
                    
                    const consultaItem = {
                        id: doc.id,
                        ...data,
                        dataCriacao: data.dataCriacao?.toDate ? data.dataCriacao.toDate() : new Date(data.dataCriacao?.seconds * 1000),
                        // Garantir que tags seja sempre um array
                        tags: Array.isArray(data.tags) ? data.tags : []
                    } as Consulta;
                    
                    console.log(`Consulta processada ${doc.id} - Tags:`, consultaItem.tags);
                    items.push(consultaItem);
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
        // Debug para verificar o formato da tag
        console.log('Renderizando tag:', tag);
        
        if (!tag || typeof tag !== 'object' || !tag.nivel) {
            console.error('Tag inválida:', tag);
            return null;
        }
        
        const colors = {
            normal: 'bg-gray-200 text-gray-800',
            atencao: 'bg-yellow-200 text-yellow-800',
            importante: 'bg-red-200 text-red-800'
        };

        return (
            <Badge
                key={tag.id}
                className={`${colors[tag.nivel] || 'bg-gray-200 text-gray-800'} mr-2 mb-1`}
            >
                {tag.texto || 'Tag sem texto'}
            </Badge>
        );
    };

    const handleOpenTagDialog = (consultaId: string) => {
        setCurrentConsultaId(consultaId);
        setNewTagText('');
        setNewTagLevel('normal');
        setShowTagDialog(true);
    };

    const addTag = async () => {
        if (!newTagText.trim() || !currentConsultaId) return;
        
        try {
            setAddingTag(true);
            
            const newTag: Tag = {
                id: Date.now().toString(),
                texto: newTagText.trim(),
                nivel: newTagLevel
            };
            
            // Atualizar no Firestore
            const consultaRef = doc(db, 'consultas', currentConsultaId);
            await updateDoc(consultaRef, {
                tags: arrayUnion(newTag)
            });
            
            // Atualizar o estado local
            setConsultas(prev => prev.map(consulta => {
                if (consulta.id === currentConsultaId) {
                    return {
                        ...consulta,
                        tags: [...(consulta.tags || []), newTag]
                    };
                }
                return consulta;
            }));
            
            toast({
                title: 'Sucesso',
                description: 'Tag adicionada com sucesso.',
            });
            
            setShowTagDialog(false);
        } catch (error) {
            console.error('Erro ao adicionar tag:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível adicionar a tag.',
                variant: 'destructive'
            });
        } finally {
            setAddingTag(false);
        }
    };

    const filteredConsultas = consultas.filter(consulta =>
        consulta.assunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (consulta.tags && Array.isArray(consulta.tags) && consulta.tags.some(tag => 
            tag && tag.texto && tag.texto.toLowerCase().includes(searchTerm.toLowerCase())
        ))
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
                                        <div className="flex flex-wrap items-center">
                                            {consulta.tags && Array.isArray(consulta.tags) ? 
                                                consulta.tags.map(renderTagBadge) : 
                                                <span className="text-gray-400 text-sm">Sem tags</span>
                                            }
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-6 w-6 p-0 ml-1" 
                                                onClick={() => handleOpenTagDialog(consulta.id)}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
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

            <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adicionar Tag</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Input placeholder="Texto da tag" value={newTagText} onChange={e => setNewTagText(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Nível da tag:</p>
                            <Select value={newTagLevel} onValueChange={(value: any) => setNewTagLevel(value)}>
                                <SelectTrigger>
                                    <SelectValue>
                                        {newTagLevel === 'normal' && 
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                                                <span>Normal</span>
                                            </div>
                                        }
                                        {newTagLevel === 'atencao' && 
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                                <span>Requer Atenção</span>
                                            </div>
                                        }
                                        {newTagLevel === 'importante' && 
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                <span>Importante</span>
                                            </div>
                                        }
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normal">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                                            <span>Normal</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="atencao">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                            <span>Requer Atenção</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="importante">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                            <span>Importante</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTagDialog(false)}>Cancelar</Button>
                        <Button onClick={addTag} disabled={addingTag || !newTagText.trim()}>
                            {addingTag ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adicionando...
                                </>
                            ) : (
                                'Adicionar'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Page;
