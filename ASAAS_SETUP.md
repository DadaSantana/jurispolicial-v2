# Configuração do Asaas

Este documento descreve como configurar a integração com o Asaas para pagamentos e assinaturas.

## Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env` ou `.env.local`:

```env
# Asaas API Configuration
ASAAS_API_KEY=$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjA4YjAyYTA3LWU2YjYtNDFkOC05YTAwLThmNjY0MzM2NWI0Zjo6JGFhY2hfMDBmZmE1OTAtZTkyNS00Y2VmLTk5MzItMjc2ZmY1MmM1NDI5
ASAAS_ENVIRONMENT=sandbox
```

### Para Produção

Quando estiver pronto para produção:

1. Acesse o painel do Asaas em produção
2. Gere uma nova chave de API
3. Atualize as variáveis:

```env
ASAAS_API_KEY=sua_chave_de_producao_aqui
ASAAS_ENVIRONMENT=production
```

## Configuração do Webhook

1. Acesse o painel do Asaas
2. Vá em **Integrações** > **Webhooks**
3. Adicione a URL do webhook do Firebase Functions:
   ```
   https://[sua-regiao]-[seu-projeto].cloudfunctions.net/asaasWebhook
   ```
4. Selecione os seguintes eventos:

   **Eventos de Pagamento:**
   - `PAYMENT_RECEIVED` - Cobrança recebida (principal - ativa assinaturas)
   - `PAYMENT_CONFIRMED` - Cobrança confirmada
   - `PAYMENT_OVERDUE` - Cobrança vencida
   - `PAYMENT_REFUNDED` - Cobrança estornada
   - `PAYMENT_PARTIALLY_REFUNDED` - Cobrança estornada parcialmente

   **Eventos de Assinatura:**
   - `SUBSCRIPTION_CREATED` - Assinatura criada
   - `SUBSCRIPTION_UPDATED` - Assinatura atualizada
   - `SUBSCRIPTION_DELETED` - Assinatura removida
   - `SUBSCRIPTION_INACTIVATED` - Assinatura inativada

## Deploy das Firebase Functions

Para fazer o deploy das functions com o webhook:

```bash
cd functions
npm install
npm run build
firebase deploy --only functions:asaasWebhook
```

## Estrutura de Dados

### Usuário (Firestore - coleção `usuarios`)

```typescript
{
  plano: {
    tipo: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'teste',
    inicio: Date,
    termino: Date,
    status: 'ativo' | 'inativo' | 'trial' | 'cancelado',
    asaasSubscriptionId?: string,
    asaasCustomerId?: string
  }
}
```

## Planos Configurados

- **Mensal**: R$ 29,90/mês
- **Trimestral**: R$ 49,90/trimestre
- **Semestral**: R$ 99,90/semestre
- **Anual**: R$ 199,90/ano
- **Teste**: R$ 0,01 (1 dia)

## Endpoints da API

### Checkout de Assinaturas
- `POST /api/checkout/prod_Rv5BKzklzzN8TY` - Plano Mensal
- `POST /api/checkout/prod_Rv5BQCIBSKtfWA` - Plano Trimestral
- `POST /api/checkout/prod_Rv5BecHr1RyOUx` - Plano Semestral
- `POST /api/checkout/prod_Rv5BwM0irfxVVe` - Plano Anual
- `POST /api/checkout/prod_RuDg0xy0SmJgve` - Plano Teste

### Checkout de Produtos
- `POST /api/checkout/product` - Compra de produto individual

### Cancelamento
- `POST /api/cancel-subscription` - Cancelar assinatura

## Páginas

- `/checkout` - Página de checkout de assinaturas
- `/loja` - Loja de produtos
- `/dashboard/subscription/success` - Página de sucesso após pagamento

## Notas Importantes

1. O webhook processa os eventos automaticamente e atualiza o status das assinaturas no Firestore
2. Os pagamentos são processados de forma assíncrona - o usuário pode ser redirecionado antes da confirmação
3. O sistema mantém compatibilidade com Stripe durante a migração (campos `stripeSubscriptionId` e `stripeCustomerId` ainda são suportados)
4. Para produtos exclusivos, verifique as datas de início e fim no Firestore

