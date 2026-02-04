# URL do Webhook do Asaas

## Projeto Firebase
- **Project ID**: `jurispolicial-5da87`

## URL do Webhook

Após fazer o deploy da function, a URL do webhook será uma das seguintes (dependendo da região):

### Região us-central1 (padrão):
```
https://us-central1-jurispolicial-5da87.cloudfunctions.net/asaasWebhook
```

### Região southamerica-east1 (São Paulo):
```
https://southamerica-east1-jurispolicial-5da87.cloudfunctions.net/asaasWebhook
```

## Como fazer o deploy

1. **Resolver permissões** (se necessário):
   - Acesse: https://console.cloud.google.com/iam-admin/iam?project=jurispolicial-5da87
   - Certifique-se de que sua conta tem a role "Service Account User"

2. **Fazer o deploy**:
   ```bash
   cd functions
   npm run build
   firebase deploy --only functions:asaasWebhook
   ```

3. **Verificar a URL após deploy**:
   O Firebase mostrará a URL completa após o deploy bem-sucedido.

## Configuração no Asaas

1. Acesse o painel do Asaas (sandbox ou produção)
2. Vá em **Integrações** > **Webhooks**
3. Clique em **Adicionar Webhook**
4. Cole a URL do webhook (uma das URLs acima, ou a que aparecer após o deploy)
5. Selecione os seguintes eventos:

   **Eventos de Pagamento:**
   - ✅ `PAYMENT_RECEIVED` - Cobrança recebida (principal)
   - ✅ `PAYMENT_CONFIRMED` - Cobrança confirmada
   - ✅ `PAYMENT_OVERDUE` - Cobrança vencida
   - ✅ `PAYMENT_REFUNDED` - Cobrança estornada
   - ✅ `PAYMENT_PARTIALLY_REFUNDED` - Cobrança estornada parcialmente

   **Eventos de Assinatura:**
   - ✅ `SUBSCRIPTION_CREATED` - Assinatura criada
   - ✅ `SUBSCRIPTION_UPDATED` - Assinatura atualizada
   - ✅ `SUBSCRIPTION_DELETED` - Assinatura removida
   - ✅ `SUBSCRIPTION_INACTIVATED` - Assinatura inativada
6. Salve o webhook

## Testar o Webhook

Após configurar, você pode testar fazendo um pagamento de teste no Asaas. O webhook será chamado automaticamente quando:
- Um pagamento for confirmado
- Uma assinatura for criada/atualizada/cancelada
- Um reembolso for processado

## Verificar Logs

Para ver os logs do webhook:
```bash
firebase functions:log --only asaasWebhook
```

Ou acesse o console do Firebase:
https://console.firebase.google.com/project/jurispolicial-5da87/functions/logs

