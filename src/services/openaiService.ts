import { auth } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';
import { REPORT_SYSTEM_PROMPT } from '@/lib/prompts';

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function generateReport(userMessage: string) {
  try {
    // Step 1: Generate the summary and subject
    const summaryResponse = await callOpenAIAssistant(
      'asst_oc6NLxtLbdI7uDfcYiL8iOS6',
      userMessage
    );
    
    if (!summaryResponse) {
      throw new Error('Falha ao gerar resumo da ocorrência');
    }
    
    // Step 2: Generate the police report
    const reportResponse = await callOpenAIAssistant(
      'asst_TrDDW6hlCMBeYBHoo94XHCDG',
      userMessage
    );
    
    if (!reportResponse) {
      throw new Error('Falha ao gerar relatório policial');
    }
    
    // Step 3: Generate analysis
    const analysisResponse = await callOpenAIAssistant(
      'asst_X9BfjjgEIIeMXg4xd1nSHL1g',
      userMessage,
      reportResponse
    );
    
    if (!analysisResponse) {
      throw new Error('Falha ao gerar análise');
    }
    
    return {
      subject: summaryResponse,
      report: reportResponse,
      analysis: analysisResponse
    };
  } catch (error: any) {
    console.error('Error generating report:', error);
    toast({
      title: 'Erro na geração do relatório',
      description: error.message || 'Ocorreu um erro ao gerar o relatório',
      variant: 'destructive'
    });
    throw error;
  }
}

async function callOpenAIAssistant(
  assistantId: string,
  userMessage: string,
  additionalContext?: string
): Promise<string> {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Usuário não autenticado');
    
    const apiKey = process.env.OPENAI_API_KEY;
    
    // Construct messages for the OpenAI API
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: getSystemPromptForAssistant(assistantId, additionalContext)
      },
      {
        role: 'user', 
        content: userMessage
      }
    ];
    
    console.log(`Calling OpenAI assistant ${assistantId}`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1500
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI assistant:', error);
    throw error;
  }
}

function getSystemPromptForAssistant(assistantId: string, additionalContext?: string): string {
  switch (assistantId) {
    case 'asst_oc6NLxtLbdI7uDfcYiL8iOS6':
      return `Você é um assistente especializado em analisar ocorrências policiais e criar resumos concisos. 
              Seu objetivo é gerar um título/assunto claro e objetivo que resuma a ocorrência descrita pelo usuário.
              Forneça apenas o título, sem explicações adicionais. 
              O título deve ter entre 5 e 12 palavras e ser informativo o suficiente para identificar o tipo de ocorrência.`;
    
    case 'asst_TrDDW6hlCMBeYBHoo94XHCDG':
      return REPORT_SYSTEM_PROMPT;

    case 'asst_X9BfjjgEIIeMXg4xd1nSHL1g':
      return `Você é um especialista em análise jurídica e procedimentos policiais.
              ${additionalContext ? 'Analise o seguinte relatório policial:\n\n' + additionalContext + '\n\n' : ''}
              Com base na ocorrência descrita, forneça uma análise técnica que inclua:
              1. Aspectos legais relevantes (tipificação penal, legislação aplicável)
              2. Avaliação da legalidade e correção dos procedimentos adotados
              3. Recomendações para procedimentos subsequentes
              4. Pontos de atenção que merecem destaque
              5. Possíveis implicações jurídicas
              
              Para cada ponto que você identificar, classifique-o como:
              - "success" para procedimentos corretos e bem executados
              - "info" para informações importantes e recomendações
              - "warning" para pontos de atenção e possíveis problemas
              
              Apresente sua análise em formato de tópicos numerados, usando linguagem técnico-jurídica apropriada e formatação markdown.`;
    
    default:
      return 'Você é um assistente policial. Responda de forma profissional e objetiva usando formatação markdown quando apropriado.';
  }
}
