'use client'
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate, formatDateTime } from '@/utils/date';
import {
    Loader2, ArrowLeft, Tag as TagIcon, Calendar, MessageSquare, FileText,
    ChevronLeft, ChevronRight, AlertTriangle, Info, CheckCircle
} from 'lucide-react';
import { doc, getDoc, getDocs, query, where, collection, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux/store';
import Link from 'next/link';
import { Consulta, Tag, User } from '@/types/user';

// Interface for the analysis qualifications
interface Qualification {
    text: string;
    type: 'warning' | 'info' | 'success';
}

function removerPadrao(texto: string): string {
    return texto.replace(/【.*?】/g, '');
}

const Page = () => {
    const { slug } = useParams<{ slug: string }>();
    const user: User = useSelector((state: RootState) => state.userSlice.user)
    const [consulta, setConsulta] = useState<Consulta | null>(null);
    const [loading, setLoading] = useState(true);
    const [nextConsulta, setNextConsulta] = useState<string | null>(null);
    const [prevConsulta, setPrevConsulta] = useState<string | null>(null);
    const [qualifications, setQualifications] = useState<Qualification[]>([]);

    useEffect(() => {
        const fetchConsulta = async () => {
            if (!slug) return;

            setLoading(true);

            try {
                const docRef = doc(db, 'consultas', slug);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const consultaData = {
                        id: docSnap.id,
                        userId: data.userId,
                        assunto: data.assunto || 'Sem assunto',
                        mensagens: Array.isArray(data.mensagens) ? data.mensagens.map((msg: any) => ({
                            ...msg,
                            data: msg.data?.toDate ? msg.data.toDate() : new Date(msg.data?.seconds * 1000)
                        })) : [],
                        dataCriacao: data.dataCriacao?.toDate ? data.dataCriacao.toDate() : new Date(data.dataCriacao?.seconds * 1000),
                        tags: Array.isArray(data.tags) ? data.tags : [],
                        relatorio: data.relatorio || '',
                        analise: data.analise || ''
                    } as Consulta;

                    if (consultaData.userId !== user.uid) {
                        toast({
                            title: 'Acesso negado',
                            description: 'Você não tem permissão para visualizar esta consulta',
                            variant: 'destructive'
                        });
                        setConsulta(null);
                    } else {
                        setConsulta(consultaData);

                        // Extract qualifications from the analysis if they exist
                        // This is a placeholder for now - in a real scenario, 
                        // we would parse the analysis to extract the qualifications
                        // For demonstration, we'll create mock qualifications
                        /* extractQualifications(consultaData.analise); */

                        const consultasRef = collection(db, 'consultas');

                        const prevQuery = query(
                            consultasRef,
                            where('userId', '==', user.uid),
                            where('dataCriacao', '<', data.dataCriacao),
                            orderBy('dataCriacao', 'desc'),
                            limit(1)
                        );

                        const prevSnapshot = await getDocs(prevQuery);
                        if (!prevSnapshot.empty) {
                            setPrevConsulta(prevSnapshot.docs[0].id);
                        }

                        const nextQuery = query(
                            consultasRef,
                            where('userId', '==', user.uid),
                            where('dataCriacao', '>', data.dataCriacao),
                            orderBy('dataCriacao', 'asc'),
                            limit(1)
                        );

                        const nextSnapshot = await getDocs(nextQuery);
                        if (!nextSnapshot.empty) {
                            setNextConsulta(nextSnapshot.docs[0].id);
                        }
                    }
                } else {
                    toast({
                        title: 'Consulta não encontrada',
                        description: 'A consulta solicitada não foi encontrada',
                        variant: 'destructive'
                    });
                }
            } catch (error) {
                console.error('Erro ao buscar consulta:', error);
                toast({
                    title: 'Erro',
                    description: 'Não foi possível carregar a consulta',
                    variant: 'destructive'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchConsulta();
    }, [slug, user.uid]);

    // Function to extract qualifications from the analysis text
    // In a real scenario, the analysis would be structured with qualifications
    const extractQualifications = (analiseText: string) => {
        // Mock implementation - in reality, this would parse the analysis
        // In the future, the IA service should return structured data

        // For demonstration purposes, we'll create some mock qualifications
        // based on keywords in the analysis
        const mockQualifications: Qualification[] = [];

        if (analiseText?.includes('recomenda-se')) {
            mockQualifications.push({
                text: 'Recomendações para procedimentos subsequentes',
                type: 'info'
            });
        }

        if (analiseText?.includes('agravante')) {
            mockQualifications.push({
                text: 'Presença de circunstâncias agravantes',
                type: 'warning'
            });
        }

        if (analiseText?.includes('fundada suspeita')) {
            mockQualifications.push({
                text: 'Abordagem realizada com fundada suspeita',
                type: 'success'
            });
        }

        // If no qualifications were detected, add a default one
        if (mockQualifications.length === 0 && analiseText) {
            mockQualifications.push({
                text: 'Análise técnica da ocorrência',
                type: 'info'
            });
        }

        setQualifications(mockQualifications);
    };

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

    const renderQualificationIcon = (type: 'warning' | 'info' | 'success') => {
        switch (type) {
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-orange-500" />;
            case 'info':
                return <Info className="h-5 w-5 text-blue-500" />;
            case 'success':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            default:
                return <Info className="h-5 w-5 text-blue-500" />;
        }
    };

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    const displayConsulta = consulta;

    return (
        <div>
            {displayConsulta &&
                <>
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center">
                            <Link href="/dashboard/historico" className="mr-4">
                                <Button variant="outline" size="icon">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <h1 className="text-2xl font-bold text-gray-800">{displayConsulta.assunto}</h1>
                        </div>
                        <div className="flex gap-2">
                            {prevConsulta && (
                                <Link href={`/dashboard/historico/${prevConsulta}`}>
                                    <Button variant="outline" size="sm">
                                        <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                                    </Button>
                                </Link>
                            )}
                            {nextConsulta && (
                                <Link href={`/dashboard/historico/${nextConsulta}`}>
                                    <Button variant="outline" size="sm">
                                        Próximo <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <div className="flex flex-wrap items-center gap-4 mb-4">
                            <div className="flex items-center text-gray-600">
                                <Calendar className="h-4 w-4 mr-2" />
                                {formatDate(displayConsulta?.dataCriacao)}
                            </div>

                            <div className="flex items-center text-gray-600">
                                <TagIcon className="h-4 w-4 mr-2" />
                                <div className="flex flex-wrap">
                                    {displayConsulta.tags.map(renderTagBadge)}
                                </div>
                            </div>
                        </div>

                        <Tabs defaultValue="relatorio">
                            <TabsList className="mb-4">
                                <TabsTrigger value="relatorio" className="flex items-center">
                                    <FileText className="h-4 w-4 mr-2" /> Relatório
                                </TabsTrigger>
                                <TabsTrigger value="conversa" className="flex items-center">
                                    <MessageSquare className="h-4 w-4 mr-2" /> Conversa
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="relatorio" className="space-y-4">
                                <Card>
                                    <CardContent className="p-4">
                                        <h3 className="text-lg font-bold mb-2">Relatório</h3>
                                        <MarkdownRenderer content={displayConsulta.relatorio ? displayConsulta.relatorio : ''} />
                                    </CardContent>
                                </Card>

                                {/* Qualifications */}
                                {qualifications.length > 0 && (
                                    <div className="space-y-3">
                                        {qualifications.map((qual, index) => (
                                            <Card key={index} className={`border-l-4 ${qual.type === 'warning' ? 'border-l-orange-500 bg-orange-50' :
                                                qual.type === 'info' ? 'border-l-blue-500 bg-blue-50' :
                                                    'border-l-green-500 bg-green-50'
                                                }`}>
                                                <CardContent className="p-3 flex items-start gap-3">
                                                    {renderQualificationIcon(qual.type)}
                                                    <p className={`text-sm ${qual.type === 'warning' ? 'text-orange-800' :
                                                        qual.type === 'info' ? 'text-blue-800' :
                                                            'text-green-800'
                                                        }`}>
                                                        {qual.text}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}

                                <Card>
                                    <CardContent className="p-4">
                                        <h3 className="text-lg font-bold mb-2">Análise</h3>
                                        <MarkdownRenderer content={displayConsulta.analise ? displayConsulta.analise : ''} />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="conversa">
                                <Card>
                                    <CardContent className="p-4 space-y-4">
                                        {displayConsulta.mensagens.map(msg => (
                                            <div
                                                key={msg.id}
                                                className={`flex ${msg.remetente === 'usuario' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-3xl rounded-lg p-3 ${msg.remetente === 'usuario'
                                                        ? 'bg-primary text-white'
                                                        : msg.remetente === 'negative-report' ? 'bg-red-100 text-black' : msg.remetente === 'success-report' ? 'bg-green-100 text-black' : 'bg-gray-100 text-gray-800'
                                                        }`}
                                                >
                                                    {msg.remetente === 'usuario' ? (
                                                        <div className="whitespace-pre-wrap">{removerPadrao(msg.texto)}</div>
                                                    ) : (
                                                        <MarkdownRenderer content={removerPadrao(msg.texto)} />
                                                    )}
                                                    <div
                                                        className={`text-xs mt-1 ${msg.remetente === 'usuario' ? 'text-primary-50' : 'text-gray-500'
                                                            }`}
                                                    >
                                                        {formatDateTime(msg.data)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </>
            }

        </div>
    );
};

export default Page;
