# Instruções para Deploy do Webhook

## Status
O código está compilado e pronto para deploy. A função `asaasWebhook` está pronta.

## Passos para Deploy

### 1. Verificar Login no Firebase
```bash
firebase login:list
```

Se não estiver logado, faça login:
```bash
firebase login
```

### 2. Verificar Permissões
Certifique-se de que a conta `contato@devana.com.br` (ou a conta que você está usando) tem a role **"Service Account User"** no projeto `jurispolicial-5da87`.

Acesse: https://console.cloud.google.com/iam-admin/iam?project=jurispolicial-5da87

### 3. Fazer o Deploy
```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:asaasWebhook
```

### 4. Copiar a URL do Webhook
Após o deploy bem-sucedido, o Firebase mostrará algo como:

```
✔  functions[asaasWebhook(us-central1)] Successful create operation.
Function URL (asaasWebhook): https://us-central1-jurispolicial-5da87.cloudfunctions.net/asaasWebhook
```

**Copie essa URL** - você precisará dela para configurar no Asaas.

## URLs Possíveis (dependendo da região)

- **us-central1**: `https://us-central1-jurispolicial-5da87.cloudfunctions.net/asaasWebhook`
- **southamerica-east1**: `https://southamerica-east1-jurispolicial-5da87.cloudfunctions.net/asaasWebhook`

## Se o Deploy Falhar

Se ainda der erro de permissão:

1. Verifique se a permissão foi adicionada para a conta correta
2. Aguarde alguns minutos para a propagação das permissões
3. Tente fazer logout e login novamente:
   ```bash
   firebase logout
   firebase login
   ```

## Configurar no Asaas

Após obter a URL do webhook:

1. Acesse o painel do Asaas (sandbox ou produção)
2. Vá em **Integrações** > **Webhooks**
3. Clique em **Adicionar Webhook**
4. Cole a URL do webhook
5. Selecione os eventos (veja WEBHOOK_URL.md para lista completa)
6. Salve



