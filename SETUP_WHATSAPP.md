# Configuração do Sistema de Relatórios Policiais via WhatsApp

Este documento explica como configurar e usar o sistema adaptado para gerar relatórios policiais via WhatsApp.

## Mudanças Implementadas

### 1. Novo Sistema de Usuários

- **Antes**: Sistema usava coleção `clientes` com campo `telefone_principal`
- **Agora**: Sistema usa coleção `users` com campo `telefone`

### 2. Adaptações no Backend (Firebase Functions)

- Criado novo `UserService` que substitui o `ClienteService`
- Busca usuários na coleção `users` pelo campo `telefone`
- Integração com sistema de geração de relatórios existente
- Salvamento automático na coleção `consultas`

### 3. Adaptações no Frontend

- Adicionado campo `telefone` ao formulário de cadastro
- Atualizado tipo `User` para incluir telefone opcional
- Validação de telefone no cadastro

## Como Funciona

### Fluxo do Sistema

1. **Usuário envia mensagem via WhatsApp** → Firebase Function recebe webhook
2. **Sistema busca usuário** → Consulta coleção `users` pelo número de telefone
3. **Validação de acesso** → Verifica se usuário tem telefone, email e role válidos
4. **Geração do relatório** → Usa APIs OpenAI existentes para gerar:
   - Assunto do relatório
   - Relatório policial completo
   - Análise positiva (opcional)
   - Qualificações extraídas
5. **Salvamento** → Salva na coleção `consultas` como no dashboard
6. **Resposta** → Envia relatório via WhatsApp (resumo se muito longo)

### Estrutura de Dados

#### Usuário (coleção `users`)
```typescript
{
  uid: string;
  email: string;
  nome: string;
  cpf: string;
  telefone?: string;  // NOVO CAMPO
  role: 'membro' | 'admin';
  creditos: number;
  dataCadastro: Date;
  ultimoLogin: Date;
  // ... outros campos
}
```

#### Consulta Salva (coleção `consultas`)
```typescript
{
  userId: string;
  assunto: string;
  mensagens: Mensagem[];
  dataCriacao: Date;
  tags: [];
  relatorio: string;
  analise?: string;
  qualificacoes?: Qualificacao[];
}
```

## Configuração

### 1. Cadastro de Usuários

Os usuários devem se cadastrar no sistema web informando:
- Nome completo
- Email
- CPF
- **Telefone** (novo campo obrigatório)
- Senha

### 2. Deploy das Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 3. Configuração do Webhook Z-API

Configure o webhook do Z-API para apontar para:
```
https://your-project.cloudfunctions.net/whatsappWebhook
```

## Uso do Sistema

### Para Usuários

1. **Cadastre-se** no sistema web com telefone
2. **Envie mensagem** via WhatsApp para o número configurado
3. **Aguarde processamento** (1-3 minutos)
4. **Receba relatório** via WhatsApp
5. **Acesse versão completa** no dashboard web

### Exemplo de Uso

**Usuário envia:**
```
Ontem às 14h na Rua das Flores, 123, houve uma briga entre dois vizinhos. 
João Silva agrediu Pedro Santos com um bastão de madeira. 
Há testemunhas e vítima foi socorrida pelo SAMU.
```

**Sistema responde:**
```
✅ Mensagem recebida! Estou processando sua solicitação de relatório policial. 
Isso pode levar alguns minutos...

📋 Relatório Policial Gerado

RELATÓRIO DE OCORRÊNCIA POLICIAL

Data/Hora: [data atual]
Local: Rua das Flores, 123

RESUMO DOS FATOS:
Foi registrada ocorrência de lesão corporal entre vizinhos...
[relatório completo ou resumo]

✅ Relatório salvo em seu histórico no sistema.
```

## Validações e Segurança

### Usuário Não Cadastrado
```
❌ Desculpe, você não possui acesso a esta funcionalidade. 
Verifique se seu telefone está cadastrado no sistema.
```

### Usuário Sem Dados Válidos
```
❌ Desculpe, você não possui acesso ativo a esta funcionalidade. 
Verifique seus dados de cadastro.
```

### Erro no Processamento
```
❌ Ocorreu um erro ao processar seu relatório. 
Tente novamente em alguns minutos ou entre em contato com o suporte.
```

## Assistentes OpenAI Utilizados

1. **Geração de Assunto**: `asst_oc6NLxtLbdI7uDfcYiL8iOS6`
2. **Relatório Principal**: `asst_TrDDW6hlCMBeYBHoo94XHCDG`
3. **Análise Positiva**: `asst_zJgbX5J2ju9gsWbMcYRynh4z`

## Logs e Monitoramento

O sistema registra logs detalhados em Firebase Functions:
- Mensagens recebidas
- Usuários validados
- Relatórios gerados
- Erros de processamento

Monitore via Firebase Console > Functions > Logs

## Backup e Compatibilidade

- Sistema mantém compatibilidade com `ClienteService` anterior
- Métodos deprecados marcados com `@deprecated`
- Possível migração gradual de clientes para users

## Troubleshooting

### Função não responde
1. Verifique se webhook está configurado corretamente
2. Confira logs no Firebase Functions
3. Verifique se OpenAI API key está válida

### Usuário não encontrado
1. Confirme se telefone está cadastrado exatamente como enviado
2. Verifique formatação do número (com/sem código país)
3. Sistema tenta múltiplas formatações automaticamente

### Relatório não é gerado
1. Verifique créditos OpenAI
2. Confira se assistentes estão ativos
3. Monitore logs para erros específicos 