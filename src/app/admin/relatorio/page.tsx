'use client'
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Save, Tag as TagIcon, Info } from 'lucide-react';
import { generateReport } from '@/services/openaiService';
import { toast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import CreditsModal from '@/components/dashboard/CreditsModal';
import { deductUserCredits } from '@/services/authService';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux/store';
import { useRouter } from 'next/navigation';
import { Mensagem, Qualificacao, Tag, User } from '@/types/user';

const Page = () => {
    const user: User = useSelector((state: RootState) => state.userSlice.user)
    const router = useRouter()
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Mensagem[]>([]);
    const [loading, setLoading] = useState(false);
    const [subject, setSubject] = useState('');
    const [report, setReport] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [tags, setTags] = useState<Tag[]>([]);
    const [showTagDialog, setShowTagDialog] = useState(false);
    const [showCreditsModal, setShowCreditsModal] = useState(false);
    const [newTagText, setNewTagText] = useState('');
    const [newTagLevel, setNewTagLevel] = useState<'normal' | 'atencao' | 'importante'>('normal');
    const [qualificacoes, setQualificacoes] = useState<Qualificacao[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth'
        });
    };

    const saveConsultaToFirebase = async (newSubject: string, newReport: string, newAnalysis: string, messagesList: Mensagem[], qualificacoesList: Qualificacao[] = []) => {
        try {
            const consulta = {
                userId: user.uid,
                assunto: newSubject,
                mensagens: messagesList,
                dataCriacao: serverTimestamp(),
                tags: tags,
                relatorio: newReport,
                analise: newAnalysis,
                qualificacoes: qualificacoesList
            };
            await addDoc(collection(db, "consultas"), consulta);
            toast({
                title: 'Consulta salva',
                description: 'A consulta foi salva com sucesso no histórico'
            });
        } catch (error) {
            console.error('Error saving consulta:', error);
            toast({
                title: 'Erro ao salvar',
                description: 'Ocorreu um erro ao salvar a consulta',
                variant: 'destructive'
            });
        }
    };

    const extractQualifications = (analysisText: string): Qualificacao[] => {
        const qualificacoesList: Qualificacao[] = [];

        const successMatches = analysisText.match(/- \*\*Success:\*\*\s*(.*?)(?=\n\n|\n- \*\*|\n$|$)/gs);
        const warningMatches = analysisText.match(/- \*\*Warning:\*\*\s*(.*?)(?=\n\n|\n- \*\*|\n$|$)/gs);
        const infoMatches = analysisText.match(/- \*\*Info:\*\*\s*(.*?)(?=\n\n|\n- \*\*|\n$|$)/gs);

        if (successMatches) {
            successMatches.forEach(match => {
                const texto = match.replace(/- \*\*Success:\*\*\s*/g, '').trim();
                qualificacoesList.push({
                    id: Date.now() + Math.random().toString(),
                    texto,
                    tipo: 'success'
                });
            });
        }

        if (warningMatches) {
            warningMatches.forEach(match => {
                const texto = match.replace(/- \*\*Warning:\*\*\s*/g, '').trim();
                qualificacoesList.push({
                    id: Date.now() + Math.random().toString(),
                    texto,
                    tipo: 'warning'
                });
            });
        }

        if (infoMatches) {
            infoMatches.forEach(match => {
                const texto = match.replace(/- \*\*Info:\*\*\s*/g, '').trim();
                qualificacoesList.push({
                    id: Date.now() + Math.random().toString(),
                    texto,
                    tipo: 'info'
                });
            });
        }

        return qualificacoesList;
    };

    function removeSourceReferences(text: string): string {
        return text.replace(/【\d+:\d+†source】/g, '');
    }

    const handleSendMessage = async () => {
        if (!message.trim()) return;

        if (user.plano?.tipo === 'trial' || user.plano?.tipo === 'teste') {
            if (user.creditos <= 0) {
                setShowCreditsModal(true);
                return;
            }
        }

        const userMessage: Mensagem = {
            id: Date.now().toString(),
            texto: message,
            remetente: 'usuario',
            data: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setMessage('');
        setLoading(true);

        try {
            //Gerando assunto
            const fetchResumeText = await fetch('/api/openai/create-text', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: userMessage.texto
                })
            })

            if (fetchResumeText.ok) {
                const data = await fetchResumeText.json()
                setSubject(JSON.parse(data.message).content);
            } else {
                console.log('error')
            }

            //Gerando relatório
            const response = await fetch('/api/openai/generate', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: {
                        links: [],
                        descricao: userMessage.texto
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const generatedReport = await response.json();

            const removeMarkdown = (text: string) => {
                // Remove formatação do Markdown
                return text
                    .replace(/([*_~`#\[\]()])/g, '')  // Remove caracteres especiais como *, _, ~, `, #, [], ()
                    .replace(/\n+/g, ' ')  // Substitui quebras de linha por espaço
                    .replace(/\s{2,}/g, ' ') // Substitui múltiplos espaços por um único
                    .trim(); // Remove espaços no início e no final
            }

            setReport(removeSourceReferences(generatedReport.message))

            const aiMessage: Mensagem = {
                id: (Date.now() + 1).toString(),
                texto: generatedReport.message,
                remetente: 'ia',
                data: new Date()
            };

            //Gerando análise negativa
            const fetchAnalysis = await fetch('/api/openai/negative-report', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: removeMarkdown(removeSourceReferences(generatedReport.message))
                })
            })

            if (fetchAnalysis.ok) {
                const dataAnalise = await fetchAnalysis.json()

                const negativeReportMessage: Mensagem = {
                    id: (Date.now() + 1).toString(),
                    texto: dataAnalise.message,
                    remetente: 'negative-report',
                    data: new Date()
                };

                const fetchPositiveAnalysis = await fetch('/api/openai/positive-report', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        data: removeMarkdown(removeSourceReferences(generatedReport.message))
                    })
                })

                if (fetchPositiveAnalysis.ok) {
                    const dataPositiveAnalysis = await fetchPositiveAnalysis.json()

                    const positiveReportMessage: Mensagem = {
                        id: (Date.now() + 1).toString(),
                        texto: dataPositiveAnalysis.message,
                        remetente: 'success-report',
                        data: new Date()
                    };

                    const updatedMessages = [...messages, userMessage, aiMessage, negativeReportMessage, positiveReportMessage];

                    setMessages(updatedMessages);

                    const creditResult = await deductUserCredits(user.uid);
                }
            }




        } catch (error: any) {
            console.error('Error generating report:', error);
            const errorMessage: Mensagem = {
                id: (Date.now() + 1).toString(),
                texto: 'Ocorreu um erro ao gerar o relatório. Por favor, tente novamente.',
                remetente: 'ia',
                data: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const addTag = () => {
        if (!newTagText.trim()) {
            toast({
                title: 'Texto obrigatório',
                description: 'Digite um texto para a tag',
                variant: 'destructive'
            });
            return;
        }
        if (tags.length >= 5) {
            toast({
                title: 'Limite de tags',
                description: 'O limite máximo é de 5 tags por relatório',
                variant: 'destructive'
            });
            return;
        }
        const newTag: Tag = {
            id: Date.now().toString(),
            texto: newTagText.trim(),
            nivel: newTagLevel
        };
        setTags(prev => [...prev, newTag]);
        setNewTagText('');
        setNewTagLevel('normal');
        setShowTagDialog(false);
    };

    const removeTag = (id: string) => {
        setTags(prev => prev.filter(tag => tag.id !== id));
    };

    const saveConsulta = async () => {
        if (!report || messages.length < 2) {
            toast({
                title: 'Relatório não gerado',
                description: 'Gere um relatório antes de salvar',
                variant: 'destructive'
            });
            return;
        }
        try {
            await saveConsultaToFirebase(subject, report, analysis, messages);
        } catch (error) {
            console.error('Error saving consulta:', error);
        }
    };

    const renderTagBadge = (tag: Tag) => {
        const colors = {
            normal: 'bg-gray-200 text-gray-800',
            atencao: 'bg-yellow-200 text-yellow-800',
            importante: 'bg-red-200 text-red-800'
        };
        return <Badge key={tag.id} className={`${colors[tag.nivel]} flex items-center gap-1 cursor-pointer mr-2 mb-2`} onClick={() => removeTag(tag.id)}>
            {tag.texto}
            <span className="text-xs">×</span>
        </Badge>;
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Gerar Relatório</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowTagDialog(true)} disabled={!report || tags.length >= 5}>
                        <TagIcon className="mr-2 h-4 w-4" /> Add Tag ({tags.length}/5)
                    </Button>
                    <Button onClick={saveConsulta} disabled={!report} className="text-neutral-50">
                        <Save className="mr-2 h-4 w-4" /> Salvar
                    </Button>
                </div>
            </div>

            {tags.length > 0 && (
                <div className="mb-4 flex flex-wrap">
                    {tags.map(renderTagBadge)}
                </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden relative bg-gray-50 rounded-lg border border-gray-200">
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                            <Info size={48} className="text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-700 mb-2">Como usar o gerador de relatórios</h3>
                            <p className="text-gray-500 max-w-md">
                                Descreva a ocorrência policial abaixo com o máximo de detalhes possível.
                                A IA irá analisar e gerar um relatório profissional com base nas informações fornecidas.
                            </p>
                        </div>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.remetente === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-3xl rounded-lg p-3 ${msg.remetente === 'usuario' ? 'bg-primary text-white' : msg.remetente === 'negative-report' ? 'bg-red-100 text-black' : msg.remetente === 'success-report' ? 'bg-green-100 text-black' : 'bg-white shadow-sm border border-gray-100 text-gray-800'}`}>
                                    {msg.remetente === 'usuario' ? (
                                        <div className="whitespace-pre-wrap">{msg.texto}</div>
                                    ) : (
                                        <MarkdownRenderer content={msg.texto} />
                                    )}
                                    <div className={`text-xs mt-1 ${msg.remetente === 'usuario' ? 'text-primary-50' : 'text-gray-500'}`}>
                                        {msg.data.toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-gray-200 shadow-lg rounded-b-lg">
                    <div className="flex space-x-2">
                        <Textarea
                            placeholder="Descreva a ocorrência policial com detalhes..."
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 resize-none bg-gray-50 border-gray-200 focus:ring-primary focus:border-primary"
                            rows={3}
                            disabled={loading}
                        />
                        <Button
                            onClick={handleSendMessage}
                            disabled={!message.trim() || loading}
                            className="self-end rounded-full w-12 h-12 p-0 flex items-center justify-center text-neutral-50"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </Button>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-gray-500">
                            Pressione Enter para enviar, Shift+Enter para nova linha
                        </div>
                        <div className="text-xs font-medium">
                            Créditos disponíveis: {user.creditos}
                        </div>
                    </div>
                </div>
            </div>

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
                            <div className="flex space-x-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start">
                                            {newTagLevel === 'normal' && <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                                                <span>Normal</span>
                                            </div>}
                                            {newTagLevel === 'atencao' && <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                                <span>Requer Atenção</span>
                                            </div>}
                                            {newTagLevel === 'importante' && <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                <span>Importante</span>
                                            </div>}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => setNewTagLevel('normal')}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                                                <span>Normal</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setNewTagLevel('atencao')}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                                <span>Requer Atenção</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setNewTagLevel('importante')}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                <span>Importante</span>
                                            </div>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTagDialog(false)}>Cancelar</Button>
                        <Button onClick={addTag}>Adicionar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CreditsModal open={showCreditsModal} onOpenChange={setShowCreditsModal} />
        </div>
    );
};

export default Page;
