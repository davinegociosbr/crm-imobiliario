# Deploy — CRM Imobiliário

## Visão Geral

- **Frontend (Next.js)** → Vercel (grátis)
- **Backend (NestJS)** → Railway (~$5/mês)
- **Banco de dados (PostgreSQL)** → Railway (incluso no plano)

---

## PASSO 1 — Criar conta no GitHub e subir o projeto

1. Acesse https://github.com e crie uma conta (se ainda não tiver)
2. Clique em **New repository**
3. Nome sugerido: `crm-imobiliario`
4. Deixe como **Private** (recomendado)
5. Clique em **Create repository**
6. O GitHub vai mostrar os comandos — execute no terminal dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/crm-imobiliario.git
git push -u origin main
```

---

## PASSO 2 — Deploy do Backend no Railway

1. Acesse https://railway.app e crie conta (pode usar o login do GitHub)
2. Clique em **New Project → Deploy from GitHub repo**
3. Selecione o repositório `crm-imobiliario`
4. Clique em **Add service → Database → PostgreSQL**
   - O Railway cria o banco automaticamente
5. Clique no serviço do backend e vá em **Settings → Root Directory**
   - Digite: `apps/api`
6. Vá em **Variables** e adicione uma por uma:

```
NODE_ENV=production
JWT_SECRET=TROQUE_POR_UMA_SENHA_FORTE_ALEATORIA
JWT_EXPIRES_IN=7d
PORT=3001
FRONTEND_URL=https://SEU_PROJETO.vercel.app
DATABASE_URL=  ← o Railway preenche automaticamente ao linkar o PostgreSQL
```

> Para `JWT_SECRET` use algo como: `xK9#mP2$nQ7@vL4&wR8!`

7. Em **Settings → Build Command**: `npm run build`
8. Em **Settings → Start Command**: `npx prisma migrate deploy && node dist/main`
9. Clique em **Deploy** e aguarde ~3 minutos
10. Após o deploy, copie a URL pública gerada (ex: `https://crm-api-production.up.railway.app`)

---

## PASSO 3 — Deploy do Frontend na Vercel

1. Acesse https://vercel.com e crie conta (use login do GitHub)
2. Clique em **Add New → Project**
3. Selecione o repositório `crm-imobiliario`
4. Em **Root Directory** clique em **Edit** e selecione: `apps/web`
5. Em **Environment Variables** adicione:

```
NEXT_PUBLIC_API_URL=https://SUA_URL_DO_RAILWAY.up.railway.app
```

6. Clique em **Deploy** e aguarde ~2 minutos
7. Após o deploy, a Vercel fornece uma URL (ex: `https://crm-imobiliario.vercel.app`)

---

## PASSO 4 — Atualizar FRONTEND_URL no Railway

Agora que você tem a URL da Vercel:

1. Volte ao Railway → seu serviço → **Variables**
2. Atualize `FRONTEND_URL` com a URL real da Vercel
3. O Railway faz redeploy automático

---

## Fazendo modificações depois do deploy

O fluxo é simples:

```bash
# 1. Edita os arquivos normalmente
# 2. Salva e testa localmente
# 3. Sobe para o GitHub:

git add .
git commit -m "descrição da mudança"
git push
```

**Railway e Vercel detectam o push automaticamente e fazem o redeploy em ~2 minutos.**

### Se a mudança envolver o banco de dados (schema.prisma):
O comando `npx prisma migrate deploy` já está no start do Railway — ele roda automaticamente a cada deploy e aplica as migrations pendentes.

---

## Custo estimado

| Serviço | Plano | Custo |
|---------|-------|-------|
| Vercel  | Hobby (grátis) | R$ 0/mês |
| Railway | Starter | ~R$ 25/mês |
| **Total** | | **~R$ 25/mês** |
