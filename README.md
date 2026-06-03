# CRM Imobiliário — SaaS Profissional

Sistema completo de CRM para corretores, equipes de vendas e imobiliárias.

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Shadcn UI |
| Backend | NestJS, TypeScript |
| Banco | PostgreSQL + Prisma ORM |
| Auth | JWT (access token) |
| Deploy | Docker + Vercel/Railway |

---

## Módulos implementados

- ✅ Dashboard executivo com gráficos em tempo real
- ✅ CRM de Clientes/Leads com histórico completo
- ✅ Funil Kanban com Drag & Drop
- ✅ Gestão de Atendimentos/Atividades
- ✅ Gestão de Visitas com calendário
- ✅ Cadastro de Imóveis com galeria
- ✅ Reservas de Imóveis
- ✅ Propostas Comerciais
- ✅ Gestão de Vendas
- ✅ Comissões por corretor
- ✅ Tarefas e Follow-up
- ✅ KPIs Avançados
- ✅ Relatórios (Leads, Vendas, Visitas, Comissões)
- ✅ Perfis de Acesso (Admin, Gerente, Corretor)
- ✅ Auditoria de ações
- ✅ Multiempresa (isolamento total de dados)
- ✅ Modo claro/escuro
- ✅ Mobile First

---

## Instalação rápida (desenvolvimento)

### Pré-requisitos
- Node.js 20+
- Docker Desktop
- npm 9+

### 1. Clonar e instalar

```bash
cd crm-imobiliario
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com suas configurações
```

### 3. Subir banco de dados

```bash
docker-compose up postgres redis -d
```

### 4. Rodar migrations e seed

```bash
cd apps/api
npm install
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
```

### 5. Iniciar o projeto

Na raiz do monorepo:
```bash
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Swagger**: http://localhost:3001/api/docs

### Credenciais de demo

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Admin | admin@demo.com | admin123 |
| Gerente | gerente@demo.com | broker123 |
| Corretor | joao@demo.com | broker123 |

---

## Deploy com Docker Compose

```bash
# Copiar e configurar
cp .env.example .env
# Edite JWT_SECRET, POSTGRES_PASSWORD e outras variáveis

# Build e subir tudo
docker-compose up -d --build

# Rodar migrations
docker-compose exec api npx prisma migrate deploy
docker-compose exec api npx ts-node prisma/seed.ts
```

---

## Deploy em produção

### Backend → Railway

1. Conectar repositório ao Railway
2. Adicionar serviço PostgreSQL
3. Configurar variáveis de ambiente (DATABASE_URL, JWT_SECRET)
4. Railway detecta automaticamente o Dockerfile

### Frontend → Vercel

1. Importar repositório no Vercel
2. Root Directory: `apps/web`
3. Configurar `NEXT_PUBLIC_API_URL` apontando para o backend

---

## Estrutura do projeto

```
crm-imobiliario/
├── apps/
│   ├── api/                    # Backend NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Schema completo
│   │   │   └── seed.ts         # Dados iniciais
│   │   └── src/
│   │       ├── modules/        # Módulos NestJS
│   │       │   ├── auth/       # Autenticação JWT
│   │       │   ├── leads/      # CRM de leads
│   │       │   ├── pipeline/   # Funil Kanban
│   │       │   ├── properties/ # Imóveis
│   │       │   ├── visits/     # Visitas
│   │       │   ├── proposals/  # Propostas
│   │       │   ├── reservations/# Reservas
│   │       │   ├── sales/      # Vendas
│   │       │   ├── commissions/# Comissões
│   │       │   ├── tasks/      # Tarefas
│   │       │   ├── dashboard/  # Métricas
│   │       │   ├── reports/    # Relatórios
│   │       │   ├── automations/# Automações
│   │       │   └── audit/      # Auditoria
│   │       └── common/         # Guards, decorators, filters
│   └── web/                    # Frontend Next.js
│       └── src/
│           ├── app/            # Pages (App Router)
│           ├── components/     # Componentes React
│           ├── lib/            # API client, utils
│           └── store/          # Zustand (auth)
├── docker-compose.yml
├── .env.example
└── package.json                # Monorepo workspace
```

---

## API REST

Todos os endpoints seguem o padrão:
- `GET /api/v1/{resource}` — listar
- `GET /api/v1/{resource}/:id` — buscar por ID
- `POST /api/v1/{resource}` — criar
- `PUT /api/v1/{resource}/:id` — atualizar
- `DELETE /api/v1/{resource}/:id` — remover

Documentação interativa: http://localhost:3001/api/docs

---

## Variáveis de ambiente importantes

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URL do PostgreSQL |
| `JWT_SECRET` | Chave secreta do JWT (mude em produção!) |
| `NEXT_PUBLIC_API_URL` | URL do backend (frontend) |
| `SMTP_*` | Configurações de e-mail (opcional) |
