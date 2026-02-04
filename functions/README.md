# 🚀 Webhook WhatsApp - Firebase Functions

Este projeto implementa um webhook para integração WhatsApp via Z-API com assistente OpenAI para atendimento automatizado de clientes.

## 📋 Funcionalidades

- ✅ **Recebe mensagens** do WhatsApp via webhook Z-API
- ✅ **Valida clientes** no Firestore (telefone + status ativo)
- ✅ **Processa mensagens** com OpenAI Assistant (`asst_nPI8CHjSGpkeVhm4hlwWPERc`)
- ✅ **Envia respostas** de volta via Z-API
- ✅ **Registra interações** no Firestore
- ✅ **Trata escopo** - bloqueia perguntas fora do contexto de psicologia

## 🏗️ Arquitetura

```
WhatsApp → Z-API → Firebase Functions → OpenAI → Z-API → WhatsApp
                         ↓
                    Firestore (clientes + logs)
```

## 🔧 Configuração

### 1. Pré-requisitos

- Conta Firebase ativa
- Projeto configurado no Firebase Console
- Instância Z-API ativa
- Chave API OpenAI
- Assistant OpenAI criado

### 2. Instalação

```bash
# Instalar dependências
cd functions
npm install

# Fazer login no Firebase
firebase login

# Configurar projeto
firebase use ciclo-ceap-insight
```

### 3. Variáveis de Ambiente

Configure as variáveis no Firebase Functions:

```bash
# Z-API
firebase functions:config:set \
  zapi.instance_id="SUA_INSTANCIA" \
  zapi.token="SEU_TOKEN" \
  zapi.client_token="SEU_CLIENT_TOKEN"

# OpenAI
firebase functions:config:set \
  openai.api_key="sk-..." \
  openai.assistant_id="asst_nPI8CHjSGpkeVhm4hlwWPERc"
```

### 4. Deploy

```bash
# Compilar e fazer deploy
npm run build
firebase deploy --only functions

# Ou usar o script automatizado
./deploy.sh
```

## 🔗 Endpoints

### Webhook Principal
```
POST https://us-central1-ciclo-ceap-insight.cloudfunctions.net/whatsappWebhook
```

**Payload esperado (Z-API):**
```json
{
  "type": "ReceivedCallback",
  "phone": "5511999999999",
  "fromMe": false,
  "status": "RECEIVED",
  "text": {
    "message": "Olá, preciso de ajuda"
  },
  "senderName": "João Silva",
  "messageId": "ABC123",
  "momment": 1640995200000
}
```

### Endpoint de Teste
```
POST https://us-central1-ciclo-ceap-insight.cloudfunctions.net/testWhatsappFlow
```

**Payload para teste:**
```json
{
  "phone": "5511999999999",
  "message": "Estou com ansiedade"
}
```

## 💾 Estrutura do Firestore

### Coleção `clientes`
```javascript
{
  "id": "cliente123",
  "nome": "João Silva",
  "telefone_principal": "11999999999",
  "email": "joao@email.com",
  "ativo": true,
  "psicologo": "SIM",
  "profissao": "Psicólogo",
  "ultimo_acesso_whatsapp": Timestamp
}
```

### Subcoleção `whatsapp_interactions`
```javascript
{
  "message": "Estou com ansiedade",
  "response": "Compreendo que você está passando...",
  "phone": "5511999999999", 
  "timestamp": Timestamp,
  "assistantData": {
    "psychology_topic": "ansiedade",
    "identified_course_id": "curso_tcc_ansiedade",
    "out_of_scope": false
  },
  "createdAt": Timestamp
}
```

## 🔄 Fluxo de Processamento

1. **Recebe webhook** da Z-API
2. **Valida mensagem** (não é grupo, não é de mim, etc.)
3. **Busca cliente** no Firestore por telefone
4. **Verifica acesso** (ativo + dados válidos)
5. **Processa com OpenAI** (context + message)
6. **Envia resposta** via Z-API
7. **Registra interação** no Firestore

## 🚫 Tratamento de Acesso Negado

**Casos de bloqueio:**
- Cliente não encontrado no sistema
- Cliente inativo (`ativo: false`)
- Dados inválidos (sem email, telefone inválido)

**Resposta padrão:** 
```
"Desculpe, você não possui acesso à esta funcionalidade"
```

## 🧠 Integração OpenAI

### Assistant ID
```
asst_nPI8CHjSGpkeVhm4hlwWPERc
```

### Contexto Enviado
```
Cliente: João Silva
Telefone: 11999999999
Email: joao@email.com
Profissão: Psicólogo
É Psicólogo: SIM

Mensagem: Estou com ansiedade
```

### Resposta Estruturada
```json
{
  "reply": "Compreendo que você está passando por momentos de ansiedade...",
  "identified_course_id": "curso_tcc_ansiedade",
  "psychology_topic": "ansiedade", 
  "out_of_scope": false
}
```

## 📝 Logs e Monitoramento

### Visualizar logs
```bash
firebase functions:log
```

### Logs estruturados
- 📨 **Webhook recebido**: type, phone, messageId
- 🔍 **Cliente encontrado**: clienteId, nome, ativo
- 🤖 **Resposta processada**: topic, course, outOfScope
- ✅ **Sucesso**: clienteId, messageId

## 🧪 Testes

### Teste Manual
```bash
curl -X POST \
  https://us-central1-ciclo-ceap-insight.cloudfunctions.net/testWhatsappFlow \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "message": "Estou com ansiedade"
  }'
```

### Casos de Teste

**✅ Sucesso:**
- Cliente ativo + mensagem válida

**❌ Cliente não encontrado:**
- Telefone não cadastrado

**❌ Sem acesso:**
- Cliente com `ativo: false`
- Email/telefone inválido

**⚠️ Fora do escopo:**
- Perguntas sobre medicina, política, etc.

## 🔧 Configuração Z-API

### Configurar Webhook
1. Acesse painel Z-API
2. Vá em **Webhooks**
3. Configure:
   - **URL**: `https://us-central1-ciclo-ceap-insight.cloudfunctions.net/whatsappWebhook`
   - **Eventos**: Message Received
   - **Método**: POST

### Headers Necessários
```
Content-Type: application/json
Client-Token: SEU_CLIENT_TOKEN
```

## 🚨 Troubleshooting

### Função não responde
- Verificar logs: `firebase functions:log`
- Verificar variáveis: `firebase functions:config:get`

### Cliente não encontrado
- Verificar formato do telefone no Firestore
- Verificar se campo `ativo` existe e é `true`

### OpenAI falha
- Verificar chave API válida
- Verificar assistant ID correto
- Fallback automático ativo

### Z-API não envia
- Verificar instance_id e token
- Verificar client_token no header
- Verificar status da instância Z-API

## 📈 Próximos Passos

- [ ] Dashboard de monitoramento
- [ ] Métricas de conversas
- [ ] Cache de respostas frequentes  
- [ ] Suporte a múltiplas instâncias Z-API
- [ ] Integração com CRM 