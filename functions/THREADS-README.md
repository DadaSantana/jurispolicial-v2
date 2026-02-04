# Sistema de Threads Persistentes - OpenAI Assistant

## 📋 Visão Geral

Este sistema implementa threads persistentes da OpenAI para manter o contexto de conversas por cliente/número de telefone. Cada cliente possui um thread único que preserva todo o histórico da conversa.

## 🔧 Como Funciona

### Estrutura de Dados no Firestore

Cada documento de cliente na coleção `clientes` agora inclui os seguintes campos relacionados aos threads:

```json
{
  "openai_thread_id": "thread_abc123",
  "thread_created_at": "2024-12-23T10:30:00Z",
  "thread_last_used": "2024-12-23T15:45:00Z", 
  "thread_message_count": 15,
  "thread_reset_count": 0
}
```

### Fluxo de Funcionamento

1. **Primeira Mensagem**: Quando um cliente envia a primeira mensagem, um novo thread é criado na OpenAI e o ID é salvo no Firestore
2. **Mensagens Subsequentes**: O sistema busca o thread existente e adiciona a nova mensagem ao histórico
3. **Contexto Preservado**: O assistente tem acesso a toda a conversa anterior
4. **Verificação de Integridade**: Se um thread não existir mais na OpenAI, um novo é criado automaticamente

## 🚀 APIs Disponíveis

### Webhook Principal
- **URL**: `https://us-central1-psia-45bb6.cloudfunctions.net/whatsappWebhook`
- **Método**: POST
- **Descrição**: Recebe mensagens do WhatsApp e processa com thread persistente

### Resetar Thread
- **URL**: `https://us-central1-psia-45bb6.cloudfunctions.net/resetClientThread`
- **Método**: POST
- **Parâmetros**:
  ```json
  {
    "clienteId": "abc123",  // OU
    "phone": "5511999999999"
  }
  ```
- **Descrição**: Força a criação de um novo thread para o cliente (limpa histórico)

### Teste de Fluxo
- **URL**: `https://us-central1-psia-45bb6.cloudfunctions.net/testWhatsappFlow`
- **Método**: POST
- **Parâmetros**:
  ```json
  {
    "phone": "5511999999999",
    "message": "Sua mensagem de teste"
  }
  ```

## 📊 Monitoramento

### Logs Importantes

- `✅ Thread existente encontrado`: Thread reutilizado com sucesso
- `🆕 Novo thread criado`: Primeiro thread ou thread recreado
- `⚠️ Thread não existe mais na OpenAI`: Thread foi removido, criando novo
- `🔄 Thread resetado`: Thread foi resetado manualmente

### Métricas Coletadas

- `thread_message_count`: Número total de mensagens no thread
- `thread_last_used`: Último uso do thread
- `thread_reset_count`: Quantas vezes o thread foi resetado

## 🔧 Configuração

### Variáveis de Ambiente

```bash
firebase functions:config:set \
  openai.api_key="sua_chave_openai" \
  openai.assistant_id="asst_seu_assistant_id"
```

### Deploy

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

## 🌟 Benefícios

1. **Contexto Preservado**: Clientes podem fazer referência a mensagens anteriores
2. **Conversas Naturais**: O assistente lembra de preferências e histórico
3. **Eficiência**: Não recria threads desnecessariamente
4. **Recuperação Automática**: Sistema se recupera se thread for perdido
5. **Monitoramento**: Métricas detalhadas de uso dos threads

## 🚨 Quando Resetar um Thread

- Cliente reporta que assistente não lembra conversas anteriores
- Conversa ficou confusa ou fora de contexto
- Cliente solicita "começar do zero"
- Thread atingiu limite de mensagens (raro, mas possível)

## 📝 Exemplo de Uso

```bash
# Resetar thread por telefone
curl -X POST https://us-central1-psia-45bb6.cloudfunctions.net/resetClientThread \
  -H "Content-Type: application/json" \
  -d '{"phone": "5511999999999"}'

# Resetar thread por ID do cliente
curl -X POST https://us-central1-psia-45bb6.cloudfunctions.net/resetClientThread \
  -H "Content-Type: application/json" \
  -d '{"clienteId": "abc123"}'
```

## 🔍 Troubleshooting

### Thread não encontrado
- Verificar se cliente existe no Firestore
- Verificar logs para erros de API OpenAI
- Thread pode ter sido automaticamente recriado

### Contexto perdido
- Verificar se `thread_message_count` está incrementando
- Verificar se `thread_last_used` está sendo atualizado
- Considerar resetar o thread se necessário

### Erros de API OpenAI
- Verificar se assistant_id está correto
- Verificar se API key tem permissões adequadas
- Verificar logs de erro detalhados 