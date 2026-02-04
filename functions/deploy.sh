#!/bin/bash

echo "🚀 Configurando e fazendo deploy das Firebase Functions..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar se está logado no Firebase
echo -e "${BLUE}🔐 Verificando login no Firebase...${NC}"
firebase login:list

# Configurar variáveis de ambiente (você precisa substituir pelos valores reais)
echo -e "${YELLOW}⚙️ Configurando variáveis de ambiente...${NC}"

# Configurar Z-API (substitua pelos seus valores)
# firebase functions:config:set zapi.instance_id="YOUR_INSTANCE_ID" zapi.token="YOUR_TOKEN" zapi.client_token="YOUR_CLIENT_TOKEN"

# Configurar OpenAI (substitua pelos seus valores)
# firebase functions:config:set openai.api_key="YOUR_OPENAI_API_KEY" openai.assistant_id="YOUR_ASSISTANT_ID"

echo -e "${BLUE}📦 Instalando dependências...${NC}"
cd functions && npm install

echo -e "${BLUE}🔨 Compilando TypeScript...${NC}"
npm run build

echo -e "${BLUE}🚀 Fazendo deploy...${NC}"
cd .. && firebase deploy --only functions

echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo -e "${YELLOW}📋 URLs das functions:${NC}"
echo "Webhook: https://us-central1-ciclo-ceap-insight.cloudfunctions.net/whatsappWebhook"
echo "Teste: https://us-central1-ciclo-ceap-insight.cloudfunctions.net/testWhatsappFlow"

echo -e "${YELLOW}📝 Para configurar o webhook na Z-API:${NC}"
echo "URL: https://us-central1-ciclo-ceap-insight.cloudfunctions.net/whatsappWebhook"
echo "Método: POST"

echo -e "${YELLOW}⚠️ Lembre-se de:${NC}"
echo "1. Substituir as variáveis de ambiente pelos valores reais"
echo "2. Configurar o webhook na Z-API"
echo "3. Testar com a função testWhatsappFlow" 