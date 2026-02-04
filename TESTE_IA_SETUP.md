# Teste de IA — Configuração

A página **Teste de IA** (`/admin/teste-ia`) compara relatórios gerados por ChatGPT, Gemini e Claude usando o mesmo prompt. Para funcionar, configure as variáveis de ambiente abaixo.

## Variáveis de ambiente

Adicione ao `.env` (local) e ao ambiente de deploy (ex.: Vercel):

| Variável | Descrição |
|----------|-----------|
| `OPENAI_API_KEY` | Chave da API OpenAI (Chat Completions) |
| `GEMINI_API_KEY` | Chave da API Google AI (Gemini) |
| `ANTHROPIC_API_KEY` | Chave da API Anthropic (Claude) |

**Importante:** Nunca commite as chaves. Use apenas em `.env` (gitignored) ou nas variáveis de ambiente do provedor de deploy.

## Exemplo no `.env`

```env
OPENAI_API_KEY=sua-chave-openai
GEMINI_API_KEY=sua-chave-gemini
ANTHROPIC_API_KEY=sua-chave-anthropic
```

## Uso

1. Acesse **Admin** → **Teste de IA**.
2. Descreva a ocorrência policial no campo de texto.
3. Clique em **Comparar**.
4. Os relatórios gerados por ChatGPT (gpt-4o), Gemini (2.5 Flash) e Claude (3.5 Haiku) aparecem lado a lado para comparação.
