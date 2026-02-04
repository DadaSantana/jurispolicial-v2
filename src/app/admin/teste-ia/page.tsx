'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, FlaskConical, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type CompareResult = {
  // Relatórios
  chatgpt?: string;
  gemini?: string;
  claude?: string;
  chatgptError?: string;
  geminiError?: string;
  claudeError?: string;
  // Análises gerais
  chatgptAnalysis?: string;
  geminiAnalysis?: string;
  claudeAnalysis?: string;
  chatgptAnalysisError?: string;
  geminiAnalysisError?: string;
  claudeAnalysisError?: string;
  // Negative reports
  chatgptNegative?: string;
  geminiNegative?: string;
  claudeNegative?: string;
  chatgptNegativeError?: string;
  geminiNegativeError?: string;
  claudeNegativeError?: string;
  // Positive reports
  chatgptPositive?: string;
  geminiPositive?: string;
  claudePositive?: string;
  chatgptPositiveError?: string;
  geminiPositiveError?: string;
  claudePositiveError?: string;
};

export default function TesteIAPage() {
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);

  const handleComparar = async () => {
    const trimmed = descricao.trim();
    if (!trimmed) {
      toast({
        title: 'Descrição obrigatória',
        description: 'Descreva a ocorrência antes de comparar.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/teste-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: trimmed }),
      });

      const data = (await res.json()) as CompareResult & { error?: string };

      if (!res.ok) {
        toast({
          title: 'Erro no teste de IA',
          description: data?.error ?? `Erro ${res.status}`,
          variant: 'destructive',
        });
        if (data?.chatgptError ?? data?.geminiError ?? data?.claudeError) {
          setResult({
            chatgptError: data.chatgptError,
            geminiError: data.geminiError,
            claudeError: data.claudeError,
          });
        }
        return;
      }

      setResult({
        chatgpt: data.chatgpt,
        gemini: data.gemini,
        claude: data.claude,
        chatgptError: data.chatgptError,
        geminiError: data.geminiError,
        claudeError: data.claudeError,
        chatgptAnalysis: data.chatgptAnalysis,
        geminiAnalysis: data.geminiAnalysis,
        claudeAnalysis: data.claudeAnalysis,
        chatgptAnalysisError: data.chatgptAnalysisError,
        geminiAnalysisError: data.geminiAnalysisError,
        claudeAnalysisError: data.claudeAnalysisError,
        chatgptNegative: data.chatgptNegative,
        geminiNegative: data.geminiNegative,
        claudeNegative: data.claudeNegative,
        chatgptNegativeError: data.chatgptNegativeError,
        geminiNegativeError: data.geminiNegativeError,
        claudeNegativeError: data.claudeNegativeError,
        chatgptPositive: data.chatgptPositive,
        geminiPositive: data.geminiPositive,
        claudePositive: data.claudePositive,
        chatgptPositiveError: data.chatgptPositiveError,
        geminiPositiveError: data.geminiPositiveError,
        claudePositiveError: data.claudePositiveError,
      });
    } catch (e) {
      toast({
        title: 'Erro no teste de IA',
        description: e instanceof Error ? e.message : 'Falha ao chamar a API.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'chatgpt' as const, label: 'ChatGPT (gpt-4o)', errorKey: 'chatgptError' as const },
    { key: 'gemini' as const, label: 'Gemini (2.5 Flash)', errorKey: 'geminiError' as const },
    { key: 'claude' as const, label: 'Claude (3.5 Haiku)', errorKey: 'claudeError' as const },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FlaskConical className="h-7 w-7" />
          Teste de IA
        </h1>
        <p className="text-gray-600 mt-1">
          Envie a mesma descrição de ocorrência para ChatGPT, Gemini e Claude e compare os relatórios e análises gerados.
        </p>
      </div>

      <div className="flex flex-col gap-4 mb-4">
        <Textarea
          placeholder="Descreva a ocorrência policial com detalhes..."
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="resize-none bg-gray-50 border-gray-200 focus:ring-primary focus:border-primary"
          rows={4}
          disabled={loading}
        />
        <Button
          onClick={handleComparar}
          disabled={loading || !descricao.trim()}
          className="self-start bg-primary hover:bg-primary/90 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Comparando…
            </>
          ) : (
            'Comparar'
          )}
        </Button>
      </div>

      {result && (
        <Tabs defaultValue="relatorios" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mb-4">
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
            <TabsTrigger value="analises">Análises</TabsTrigger>
            <TabsTrigger value="negative">Análise Negativa</TabsTrigger>
            <TabsTrigger value="positive">Análise Positiva</TabsTrigger>
          </TabsList>
          
          <TabsContent value="relatorios" className="flex-1 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
              {columns.map(({ key, label, errorKey }) => {
                const content = result[key];
                const err = result[errorKey];
                return (
                  <Card key={key} className={`flex flex-col overflow-hidden border ${
                    err ? 'border-red-300 bg-red-50/30' : 'border-gray-200 bg-white'
                  }`}>
                    <div className={`px-4 py-2 border-b font-medium ${
                      err ? 'bg-red-50 text-red-800 border-red-200' : 'bg-gray-50 text-gray-800 border-gray-100'
                    }`}>
                      {label}
                    </div>
                    <div className="flex-1 min-h-[200px] overflow-y-auto p-4">
                      {err ? (
                        <div className="flex items-start gap-2 text-sm text-red-700">
                          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                          <p className="flex-1">{err}</p>
                        </div>
                      ) : content ? (
                        <MarkdownRenderer content={content} />
                      ) : (
                        <p className="text-sm text-gray-500">Sem resposta.</p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="analises" className="flex-1 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
              {columns.map(({ key, label }) => {
                const analysisKey = `${key}Analysis` as keyof CompareResult;
                const errorKey = `${key}AnalysisError` as keyof CompareResult;
                const content = result[analysisKey] as string | undefined;
                const err = result[errorKey] as string | undefined;
                return (
                  <Card key={`${key}-analysis`} className={`flex flex-col overflow-hidden border ${
                    err ? 'border-red-300 bg-red-50/30' : 'border-gray-200 bg-white'
                  }`}>
                    <div className={`px-4 py-2 border-b font-medium ${
                      err ? 'bg-red-50 text-red-800 border-red-200' : 'bg-gray-50 text-gray-800 border-gray-100'
                    }`}>
                      {label} - Análise
                    </div>
                    <div className="flex-1 min-h-[200px] overflow-y-auto p-4">
                      {err ? (
                        <div className="flex items-start gap-2 text-sm text-red-700">
                          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                          <p className="flex-1">{err}</p>
                        </div>
                      ) : content ? (
                        <MarkdownRenderer content={content} />
                      ) : (
                        <p className="text-sm text-gray-500">Sem resposta.</p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="negative" className="flex-1 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
              {columns.map(({ key, label }) => {
                const negativeKey = `${key}Negative` as keyof CompareResult;
                const errorKey = `${key}NegativeError` as keyof CompareResult;
                const content = result[negativeKey] as string | undefined;
                const err = result[errorKey] as string | undefined;
                return (
                  <Card key={`${key}-negative`} className={`flex flex-col overflow-hidden border ${
                    err ? 'border-red-300 bg-red-50/30' : 'border-red-200 bg-red-50/10'
                  }`}>
                    <div className={`px-4 py-2 border-b font-medium ${
                      err ? 'bg-red-50 text-red-800 border-red-200' : 'bg-red-100 text-red-900 border-red-200'
                    }`}>
                      {label} - Análise Negativa
                    </div>
                    <div className="flex-1 min-h-[200px] overflow-y-auto p-4">
                      {err ? (
                        <div className="flex items-start gap-2 text-sm text-red-700">
                          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                          <p className="flex-1">{err}</p>
                        </div>
                      ) : content ? (
                        <MarkdownRenderer content={content} />
                      ) : (
                        <p className="text-sm text-gray-500">Sem resposta.</p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="positive" className="flex-1 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
              {columns.map(({ key, label }) => {
                const positiveKey = `${key}Positive` as keyof CompareResult;
                const errorKey = `${key}PositiveError` as keyof CompareResult;
                const content = result[positiveKey] as string | undefined;
                const err = result[errorKey] as string | undefined;
                return (
                  <Card key={`${key}-positive`} className={`flex flex-col overflow-hidden border ${
                    err ? 'border-red-300 bg-red-50/30' : 'border-green-200 bg-green-50/10'
                  }`}>
                    <div className={`px-4 py-2 border-b font-medium ${
                      err ? 'bg-red-50 text-red-800 border-red-200' : 'bg-green-100 text-green-900 border-green-200'
                    }`}>
                      {label} - Análise Positiva
                    </div>
                    <div className="flex-1 min-h-[200px] overflow-y-auto p-4">
                      {err ? (
                        <div className="flex items-start gap-2 text-sm text-red-700">
                          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                          <p className="flex-1">{err}</p>
                        </div>
                      ) : content ? (
                        <MarkdownRenderer content={content} />
                      ) : (
                        <p className="text-sm text-gray-500">Sem resposta.</p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
