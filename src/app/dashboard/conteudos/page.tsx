'use client'
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Play, FileText } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Conteudo, User } from '@/types/user';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux/store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const Page = () => {
    const router = useRouter();
    const user: User = useSelector((state: RootState) => state.userSlice.user)
    const [conteudos, setConteudos] = useState<Conteudo[]>([]);
    const [loading, setLoading] = useState(true);
    const isAnualPlan = user.plano?.tipo === 'anual';

    useEffect(() => {
        const fetchConteudos = async () => {
            try {
                const q = query(
                    collection(db, 'conteudos')
                );

                const snapshot = await getDocs(q);
                const items: Conteudo[] = [];

                snapshot.forEach((doc) => {
                    items.push({ id: doc.id, ...doc.data() } as Conteudo);
                });

                setConteudos(items);
            } catch (error) {
                console.error('Erro ao buscar conteúdos exclusivos:', error);
                toast.error('Não foi possível carregar os conteúdos exclusivos.');
            } finally {
                setLoading(false);
            }
        };

        if (isAnualPlan) {
            fetchConteudos();
        }
    }, [isAnualPlan]);

    if (!isAnualPlan) {
        router.push('/dashboard');
    }

    const accessContent = (conteudo: Conteudo) => {
        toast.success(`Acessando ${conteudo.titulo}`);
        if (conteudo.url) {
            window.open(conteudo.url, '_blank');
        }
    };

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Conteúdos Exclusivos</h1>
                <p className="text-gray-600">
                    Materiais exclusivos disponíveis para o seu plano anual.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {conteudos.map((conteudo) => (
                    <Link key={conteudo.id} href={`/dashboard/conteudos/media/${conteudo.id}`}>
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full transition-transform hover:scale-105">
                            <div className="h-48 bg-gray-200 relative">
                                <img
                                    src={conteudo.imagem}
                                    alt={conteudo.titulo}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 right-2">
                                    <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded">
                                        EXCLUSIVO
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 flex-grow">
                                <h3 className="text-lg font-bold text-gray-800 mb-2">{conteudo.titulo}</h3>
                                <p className="text-gray-600 mb-4">{conteudo.descricao}</p>
                            </div>
                            <div className="p-4 pt-0 border-t border-gray-100 mt-auto">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="bg-gray-100 px-2 py-1 rounded text-xs uppercase font-semibold text-gray-600">
                                        {conteudo.tipo}
                                    </span>
                                </div>
                                <Button className="w-full">
                                    Acessar Conteúdo
                                </Button>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default Page;
