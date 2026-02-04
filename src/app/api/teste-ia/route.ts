import { REPORT_SYSTEM_PROMPT, ANALYSIS_SYSTEM_PROMPT, NEGATIVE_REPORT_PROMPT, POSITIVE_REPORT_PROMPT } from '@/lib/prompts';

export const maxDuration = 180; // Aumentado para permitir relatório + análise + negative + positive

const MAX_TOKENS = 4096;
const TEMPERATURE = 0.7;

async function callOpenAI(descricao: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: REPORT_SYSTEM_PROMPT },
        { role: 'user', content: descricao },
      ],
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string; type?: string } };
    const errorMsg = err?.error?.message || '';
    
    // Mensagens mais amigáveis para erros comuns do OpenAI
    if (errorMsg.toLowerCase().includes('rate limit') || res.status === 429) {
      throw new Error('Limite de requisições do ChatGPT atingido. Tente novamente em alguns instantes.');
    }
    if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('billing')) {
      throw new Error('Cota da API OpenAI esgotada. Verifique sua conta.');
    }
    
    throw new Error(errorMsg || `ChatGPT ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data?.choices?.[0]?.message?.content;
  if (text == null) throw new Error('Resposta OpenAI sem conteúdo');
  return text;
}

async function callGemini(descricao: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: REPORT_SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: descricao }] }],
        generationConfig: {
          maxOutputTokens: MAX_TOKENS,
          temperature: TEMPERATURE,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string; status?: string } };
    const errorMsg = err?.error?.message || '';
    
    // Mensagens mais amigáveis para erros comuns do Gemini
    if (errorMsg.toLowerCase().includes('overloaded') || errorMsg.toLowerCase().includes('model is overloaded')) {
      throw new Error('O modelo Gemini está temporariamente sobrecarregado. Tente novamente em alguns instantes.');
    }
    if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate limit')) {
      throw new Error('Limite de requisições do Gemini atingido. Tente novamente mais tarde.');
    }
    
    throw new Error(errorMsg || `Gemini ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text == null) throw new Error('Resposta Gemini sem conteúdo');
  return text;
}

async function callClaude(descricao: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: MAX_TOKENS,
      system: REPORT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: descricao }],
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string; type?: string } };
    const errorMsg = err?.error?.message || '';
    
    // Mensagens mais amigáveis para erros comuns do Claude
    if (errorMsg.toLowerCase().includes('rate limit') || res.status === 429) {
      throw new Error('Limite de requisições do Claude atingido. Tente novamente em alguns instantes.');
    }
    if (errorMsg.toLowerCase().includes('overloaded')) {
      throw new Error('O modelo Claude está temporariamente sobrecarregado. Tente novamente em alguns instantes.');
    }
    
    throw new Error(errorMsg || `Claude ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const block = data?.content?.find((c) => c.type === 'text');
  const text = block && 'text' in block ? block.text : undefined;
  if (text == null) throw new Error('Resposta Claude sem conteúdo');
  return text;
}

// Funções para gerar análises baseadas nos relatórios
async function callOpenAIAnalysis(relatorio: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: `${ANALYSIS_SYSTEM_PROMPT}\n\nAnalise o seguinte relatório policial:\n\n${relatorio}` },
        { role: 'user', content: 'Forneça a análise técnica deste relatório.' },
      ],
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err?.error?.message || `OpenAI Análise ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data?.choices?.[0]?.message?.content;
  if (text == null) throw new Error('Resposta OpenAI análise sem conteúdo');
  return text;
}

async function callGeminiAnalysis(relatorio: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { 
          parts: [{ text: `${ANALYSIS_SYSTEM_PROMPT}\n\nAnalise o seguinte relatório policial:\n\n${relatorio}` }] 
        },
        contents: [{ parts: [{ text: 'Forneça a análise técnica deste relatório.' }] }],
        generationConfig: {
          maxOutputTokens: MAX_TOKENS,
          temperature: TEMPERATURE,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err?.error?.message || `Gemini Análise ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text == null) throw new Error('Resposta Gemini análise sem conteúdo');
  return text;
}

async function callClaudeAnalysis(relatorio: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: MAX_TOKENS,
      system: `${ANALYSIS_SYSTEM_PROMPT}\n\nAnalise o seguinte relatório policial:\n\n${relatorio}`,
      messages: [{ role: 'user', content: 'Forneça a análise técnica deste relatório.' }],
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err?.error?.message || `Claude Análise ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const block = data?.content?.find((c) => c.type === 'text');
  const text = block && 'text' in block ? block.text : undefined;
  if (text == null) throw new Error('Resposta Claude análise sem conteúdo');
  return text;
}

// Funções para gerar negative-report (análise negativa)
async function callOpenAINegativeReport(relatorio: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: `${NEGATIVE_REPORT_PROMPT}\n\nAnalise o seguinte relatório policial:\n\n${relatorio}` },
        { role: 'user', content: 'Forneça a análise negativa deste relatório, focando em problemas e pontos de atenção.' },
      ],
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err?.error?.message || `OpenAI Negative Report ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data?.choices?.[0]?.message?.content;
  if (text == null) throw new Error('Resposta OpenAI negative report sem conteúdo');
  return text;
}

async function callGeminiNegativeReport(relatorio: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { 
          parts: [{ text: `${NEGATIVE_REPORT_PROMPT}\n\nAnalise o seguinte relatório policial:\n\n${relatorio}` }] 
        },
        contents: [{ parts: [{ text: 'Forneça a análise negativa deste relatório, focando em problemas e pontos de atenção.' }] }],
        generationConfig: {
          maxOutputTokens: MAX_TOKENS,
          temperature: TEMPERATURE,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err?.error?.message || `Gemini Negative Report ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text == null) throw new Error('Resposta Gemini negative report sem conteúdo');
  return text;
}

async function callClaudeNegativeReport(relatorio: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: MAX_TOKENS,
      system: `${NEGATIVE_REPORT_PROMPT}\n\nAnalise o seguinte relatório policial:\n\n${relatorio}`,
      messages: [{ role: 'user', content: 'Forneça a análise negativa deste relatório, focando em problemas e pontos de atenção.' }],
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err?.error?.message || `Claude Negative Report ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const block = data?.content?.find((c) => c.type === 'text');
  const text = block && 'text' in block ? block.text : undefined;
  if (text == null) throw new Error('Resposta Claude negative report sem conteúdo');
  return text;
}

// Funções para gerar positive-report (análise positiva)
async function callOpenAIPositiveReport(relatorio: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: `${POSITIVE_REPORT_PROMPT}\n\nAnalise o seguinte relatório policial:\n\n${relatorio}` },
        { role: 'user', content: 'Forneça a análise positiva deste relatório, focando em acertos e procedimentos corretos.' },
      ],
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err?.error?.message || `OpenAI Positive Report ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data?.choices?.[0]?.message?.content;
  if (text == null) throw new Error('Resposta OpenAI positive report sem conteúdo');
  return text;
}

async function callGeminiPositiveReport(relatorio: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { 
          parts: [{ text: `${POSITIVE_REPORT_PROMPT}\n\nAnalise o seguinte relatório policial:\n\n${relatorio}` }] 
        },
        contents: [{ parts: [{ text: 'Forneça a análise positiva deste relatório, focando em acertos e procedimentos corretos.' }] }],
        generationConfig: {
          maxOutputTokens: MAX_TOKENS,
          temperature: TEMPERATURE,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err?.error?.message || `Gemini Positive Report ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text == null) throw new Error('Resposta Gemini positive report sem conteúdo');
  return text;
}

async function callClaudePositiveReport(relatorio: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: MAX_TOKENS,
      system: `${POSITIVE_REPORT_PROMPT}\n\nAnalise o seguinte relatório policial:\n\n${relatorio}`,
      messages: [{ role: 'user', content: 'Forneça a análise positiva deste relatório, focando em acertos e procedimentos corretos.' }],
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err?.error?.message || `Claude Positive Report ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const block = data?.content?.find((c) => c.type === 'text');
  const text = block && 'text' in block ? block.text : undefined;
  if (text == null) throw new Error('Resposta Claude positive report sem conteúdo');
  return text;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { descricao?: string };
    const descricao = typeof body?.descricao === 'string' ? body.descricao.trim() : '';

    if (!descricao) {
      return new Response(
        JSON.stringify({ error: 'Campo "descricao" é obrigatório e deve ser um texto não vazio.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    const missing: string[] = [];
    if (!openaiKey) missing.push('OPENAI_API_KEY');
    if (!geminiKey) missing.push('GEMINI_API_KEY');
    if (!anthropicKey) missing.push('ANTHROPIC_API_KEY');
    if (missing.length) {
      return new Response(
        JSON.stringify({
          error: `Variáveis de ambiente ausentes: ${missing.join(', ')}. Configure-as no .env ou no ambiente de deploy.`,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Garantir tipagem após checagem (openaiKey, geminiKey, anthropicKey já validados acima)
    const openai = openaiKey as string;
    const gemini = geminiKey as string;
    const anthropic = anthropicKey as string;

    // Primeiro: gerar relatórios
    const [chatgptReportResult, geminiReportResult, claudeReportResult] = await Promise.allSettled([
      callOpenAI(descricao, openai),
      callGemini(descricao, gemini),
      callClaude(descricao, anthropic),
    ]);

    const chatgptReport = chatgptReportResult.status === 'fulfilled' ? chatgptReportResult.value : undefined;
    const geminiReport = geminiReportResult.status === 'fulfilled' ? geminiReportResult.value : undefined;
    const claudeReport = claudeReportResult.status === 'fulfilled' ? claudeReportResult.value : undefined;
    const chatgptReportError = chatgptReportResult.status === 'rejected' ? chatgptReportResult.reason?.message : undefined;
    const geminiReportError = geminiReportResult.status === 'rejected' ? geminiReportResult.reason?.message : undefined;
    const claudeReportError = claudeReportResult.status === 'rejected' ? claudeReportResult.reason?.message : undefined;

    // Segundo: gerar análises baseadas nos relatórios (apenas se o relatório foi gerado com sucesso)
    const analysisPromises: Promise<PromiseSettledResult<string>>[] = [];
    
    if (chatgptReport) {
      analysisPromises.push(
        callOpenAIAnalysis(chatgptReport, openai)
          .then(value => ({ status: 'fulfilled' as const, value }))
          .catch(reason => ({ status: 'rejected' as const, reason }))
      );
    } else {
      analysisPromises.push(Promise.resolve({ status: 'rejected' as const, reason: new Error(chatgptReportError || 'Relatório não gerado') }));
    }
    
    if (geminiReport) {
      analysisPromises.push(
        callGeminiAnalysis(geminiReport, gemini)
          .then(value => ({ status: 'fulfilled' as const, value }))
          .catch(reason => ({ status: 'rejected' as const, reason }))
      );
    } else {
      analysisPromises.push(Promise.resolve({ status: 'rejected' as const, reason: new Error(geminiReportError || 'Relatório não gerado') }));
    }
    
    if (claudeReport) {
      analysisPromises.push(
        callClaudeAnalysis(claudeReport, anthropic)
          .then(value => ({ status: 'fulfilled' as const, value }))
          .catch(reason => ({ status: 'rejected' as const, reason }))
      );
    } else {
      analysisPromises.push(Promise.resolve({ status: 'rejected' as const, reason: new Error(claudeReportError || 'Relatório não gerado') }));
    }

    const [chatgptAnalysisResult, geminiAnalysisResult, claudeAnalysisResult] = await Promise.all(analysisPromises);

    const chatgptAnalysis = chatgptAnalysisResult.status === 'fulfilled' ? chatgptAnalysisResult.value : undefined;
    const geminiAnalysis = geminiAnalysisResult.status === 'fulfilled' ? geminiAnalysisResult.value : undefined;
    const claudeAnalysis = claudeAnalysisResult.status === 'fulfilled' ? claudeAnalysisResult.value : undefined;
    const chatgptAnalysisError = chatgptAnalysisResult.status === 'rejected' ? chatgptAnalysisResult.reason?.message : undefined;
    const geminiAnalysisError = geminiAnalysisResult.status === 'rejected' ? geminiAnalysisResult.reason?.message : undefined;
    const claudeAnalysisError = claudeAnalysisResult.status === 'rejected' ? claudeAnalysisResult.reason?.message : undefined;

    // Terceiro: gerar negative-report e positive-report baseados nos relatórios
    const negativeReportPromises: Promise<PromiseSettledResult<string>>[] = [];
    const positiveReportPromises: Promise<PromiseSettledResult<string>>[] = [];
    
    // Helper para criar promise de negative report
    const createNegativePromise = (report: string | undefined, error: string | undefined, callFn: (r: string, k: string) => Promise<string>, key: string) => {
      if (report) {
        return callFn(report, key)
          .then(value => ({ status: 'fulfilled' as const, value }))
          .catch(reason => ({ status: 'rejected' as const, reason }));
      }
      return Promise.resolve({ status: 'rejected' as const, reason: new Error(error || 'Relatório não gerado') });
    };
    
    // Helper para criar promise de positive report
    const createPositivePromise = (report: string | undefined, error: string | undefined, callFn: (r: string, k: string) => Promise<string>, key: string) => {
      if (report) {
        return callFn(report, key)
          .then(value => ({ status: 'fulfilled' as const, value }))
          .catch(reason => ({ status: 'rejected' as const, reason }));
      }
      return Promise.resolve({ status: 'rejected' as const, reason: new Error(error || 'Relatório não gerado') });
    };

    negativeReportPromises.push(createNegativePromise(chatgptReport, chatgptReportError, callOpenAINegativeReport, openai));
    negativeReportPromises.push(createNegativePromise(geminiReport, geminiReportError, callGeminiNegativeReport, gemini));
    negativeReportPromises.push(createNegativePromise(claudeReport, claudeReportError, callClaudeNegativeReport, anthropic));

    positiveReportPromises.push(createPositivePromise(chatgptReport, chatgptReportError, callOpenAIPositiveReport, openai));
    positiveReportPromises.push(createPositivePromise(geminiReport, geminiReportError, callGeminiPositiveReport, gemini));
    positiveReportPromises.push(createPositivePromise(claudeReport, claudeReportError, callClaudePositiveReport, anthropic));

    const [chatgptNegativeResult, geminiNegativeResult, claudeNegativeResult] = await Promise.all(negativeReportPromises);
    const [chatgptPositiveResult, geminiPositiveResult, claudePositiveResult] = await Promise.all(positiveReportPromises);

    const chatgptNegative = chatgptNegativeResult.status === 'fulfilled' ? chatgptNegativeResult.value : undefined;
    const geminiNegative = geminiNegativeResult.status === 'fulfilled' ? geminiNegativeResult.value : undefined;
    const claudeNegative = claudeNegativeResult.status === 'fulfilled' ? claudeNegativeResult.value : undefined;
    const chatgptNegativeError = chatgptNegativeResult.status === 'rejected' ? chatgptNegativeResult.reason?.message : undefined;
    const geminiNegativeError = geminiNegativeResult.status === 'rejected' ? geminiNegativeResult.reason?.message : undefined;
    const claudeNegativeError = claudeNegativeResult.status === 'rejected' ? claudeNegativeResult.reason?.message : undefined;

    const chatgptPositive = chatgptPositiveResult.status === 'fulfilled' ? chatgptPositiveResult.value : undefined;
    const geminiPositive = geminiPositiveResult.status === 'fulfilled' ? geminiPositiveResult.value : undefined;
    const claudePositive = claudePositiveResult.status === 'fulfilled' ? claudePositiveResult.value : undefined;
    const chatgptPositiveError = chatgptPositiveResult.status === 'rejected' ? chatgptPositiveResult.reason?.message : undefined;
    const geminiPositiveError = geminiPositiveResult.status === 'rejected' ? geminiPositiveResult.reason?.message : undefined;
    const claudePositiveError = claudePositiveResult.status === 'rejected' ? claudePositiveResult.reason?.message : undefined;

    if (!chatgptReport && !geminiReport && !claudeReport) {
      return new Response(
        JSON.stringify({
          error: 'Nenhum provedor respondeu com sucesso.',
          chatgptError: chatgptReportError,
          geminiError: geminiReportError,
          claudeError: claudeReportError,
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        // Relatórios
        chatgpt: chatgptReport,
        gemini: geminiReport,
        claude: claudeReport,
        chatgptError: chatgptReportError,
        geminiError: geminiReportError,
        claudeError: claudeReportError,
        // Análises gerais
        chatgptAnalysis,
        geminiAnalysis,
        claudeAnalysis,
        chatgptAnalysisError,
        geminiAnalysisError,
        claudeAnalysisError,
        // Negative reports
        chatgptNegative,
        geminiNegative,
        claudeNegative,
        chatgptNegativeError,
        geminiNegativeError,
        claudeNegativeError,
        // Positive reports
        chatgptPositive,
        geminiPositive,
        claudePositive,
        chatgptPositiveError,
        geminiPositiveError,
        claudePositiveError,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Erro em /api/teste-ia:', e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : 'Erro inesperado ao processar o teste de IA.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
