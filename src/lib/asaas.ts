// Cliente Asaas para integração com API
const getAsaasBaseUrl = () => {
  const environment = process.env.ASAAS_ENVIRONMENT || 'sandbox';
  return environment === 'production' 
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';
};

const getAsaasApiKey = () => {
  // Tentar obter de diferentes variáveis de ambiente
  const apiKey = process.env.ASAAS_API_KEY || 
                 process.env.NEXT_PUBLIC_ASAAS_API_KEY ||
                 '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjA4YjAyYTA3LWU2YjYtNDFkOC05YTAwLThmNjY0MzM2NWI0Zjo6JGFhY2hfMDBmZmE1OTAtZTkyNS00Y2VmLTk5MzItMjc2ZmY1MmM1NDI5';
  
  if (!apiKey) {
    throw new Error('ASAAS_API_KEY não está configurada nas variáveis de ambiente');
  }
  return apiKey;
};

export const asaasConfig = {
  baseUrl: getAsaasBaseUrl(),
  apiKey: getAsaasApiKey(),
  environment: process.env.ASAAS_ENVIRONMENT || 'sandbox',
};

// Função auxiliar para fazer requisições à API do Asaas
export const asaasRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const url = `${asaasConfig.baseUrl}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'access_token': asaasConfig.apiKey,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: any = {};
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        errorData = await response.json();
      } catch (e) {
        // Se não conseguir parsear JSON, tentar ler como texto
        const text = await response.text();
        console.error('Resposta de erro do Asaas (texto):', text);
        throw new Error(`Erro na requisição ao Asaas: ${response.status} - ${text.substring(0, 200)}`);
      }
    } else {
      const text = await response.text();
      console.error('Resposta de erro do Asaas (HTML/texto):', text.substring(0, 500));
      throw new Error(`Erro na requisição ao Asaas: ${response.status} - Resposta não é JSON`);
    }
    
    // Log completo do erro para debug
    console.error('Erro completo do Asaas:', JSON.stringify(errorData, null, 2));
    
    const errorMessage = errorData.errors?.[0]?.description || 
                        errorData.errors?.[0]?.message ||
                        errorData.message || 
                        `Erro na requisição ao Asaas: ${response.status}`;
    
    throw new Error(errorMessage);
  }

  return response.json();
};

export default asaasConfig;


