# GeoTask Pro

Sistema de gestao de tarefas para gerenciamento de operacoes em campo, contratos, equipes e setores.

---

## Indice

- [Visao Geral](#visao-geral)
- [Stack Tecnologica](#stack-tecnologica)
- [Arquitetura](#arquitetura)
- [Pre-requisitos](#pre-requisitos)
- [Instalacao e Configuracao](#instalacao-e-configuracao)
- [Variaveis de Ambiente](#variaveis-de-ambiente)
- [Scripts Disponiveis](#scripts-disponiveis)
- [Banco de Dados](#banco-de-dados)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API Routes](#api-routes)
- [Sistema de Permissoes](#sistema-de-permissoes)
- [Funcionalidades](#funcionalidades)
- [Testes](#testes)
- [Deploy](#deploy)
- [Contribuicao](#contribuicao)

---

## Visao Geral

O GeoTask Pro e uma aplicacao web full-stack para gestao de tarefas com foco em operacoes georreferenciadas. Permite o gerenciamento de tarefas por contrato, cidade, bairro, setor e equipe, com sistema de permissoes granular por cargo.

### Principais capacidades

- **Kanban Board** — Visualizacao e movimentacao de tarefas por status
- **Dashboard** — Metricas e graficos de desempenho por setor, equipe e responsavel
- **Cronograma** — Visualizacao temporal de tarefas com prazos
- **Mind Map** — Visualizacao hierarquica de tarefas pai/filho
- **Lista** — Tabela com filtros avancados e exportacao (Excel/PDF)
- **Templates** — Modelos de tarefas reutilizaveis com subtarefas
- **Notificacoes** — Sistema de mencoes e alertas em tempo real
- **Log de Atividades** — Auditoria completa de acoes no sistema
- **Gestao de Equipes** — Times/Polos com membros vinculados
- **Multi-setor** — Coordenadores podem gerenciar multiplos setores
- **Anexos** — Upload de imagens e PDFs vinculados a tarefas
- **Relatorios** — Geracao de relatorios com analise de dados por ia

---

## Stack Tecnologica

| Camada               | Tecnologia           | Versao        |
| -------------------- | -------------------- | ------------- |
| **Framework**        | Next.js (App Router) | 16.1.6        |
| **Frontend**         | React                | 19.0.0        |
| **Linguagem**        | TypeScript           | 5.x           |
| **Estilizacao**      | Tailwind CSS         | 4.2.1         |
| **ORM**              | Prisma               | 5.22.0        |
| **Banco de Dados**   | PostgreSQL           | 15+           |
| **State Management** | Zustand              | 5.0.11        |
| **Data Fetching**    | SWR                  | 2.4.0         |
| **Validacao**        | Zod                  | 3.23.8        |
| **Autenticacao**     | bcryptjs             | 3.0.3         |
| **Icones**           | Lucide React         | 0.574.0       |
| **Graficos**         | Recharts             | 3.7.0         |
| **Exportacao**       | ExcelJS, jsPDF       | 4.4.0 / 4.2.0 |
| **Testes**           | Vitest               | 4.0.18        |

---

## Arquitetura

```
Cliente (Browser)
    |
    v
Next.js App Router (SSR + CSR)
    |
    +--- /app/page.tsx            --> SPA principal (multi-view)
    +--- /app/login/page.tsx      --> Pagina de login
    +--- /app/api/**              --> 27 API Routes (REST)
    |       |
    |       +--- Prisma ORM
    |       |       |
    |       |       v
    |       |   PostgreSQL
    |       |
    |       +--- Storage (uploads)
    |
    +--- /components/**           --> Componentes React
    +--- /hooks/**                --> Custom Hooks (SWR)
    +--- /stores/**               --> Zustand Stores
    +--- /lib/**                  --> Utils, Services, Validators
```

### Fluxo de Autenticacao

1. Usuario faz login via `/api/auth/login`
2. Credenciais validadas com bcrypt
3. Dados do usuario armazenados no client-side state (Zustand)
4. Header `X-User-Id` enviado em todas as requisicoes API
5. Middleware valida presenca do header em rotas protegidas

---

## Pre-requisitos

- **Node.js** >= 18.x
- **npm** >= 9.x
- **PostgreSQL** >= 15 (local via Docker ou cloud)
- **Git**

---

## Instalacao e Configuracao

### 1. Clonar o repositorio

```bash
git clone https://github.com/VRA-DEV/geotask-pro.git
cd geotask-pro
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar banco de dados

**Opcao A — Docker (recomendado para desenvolvimento):**

```bash
docker compose up -d
```

Isso cria um PostgreSQL local na porta `5433`.

**Opcao B — Cloud (producao):**

Crie um banco PostgreSQL no seu provedor de escolha e use as connection strings fornecidas.

### 4. Configurar variaveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais (veja secao [Variaveis de Ambiente](#variaveis-de-ambiente)).

### 5. Executar migrations e seed

```bash
npx prisma generate
npx prisma migrate deploy
npx tsx prisma/seed_roles_v2.ts
```

### 6. Iniciar servidor de desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000`.

---

## Variaveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto (use `.env.example` como base):

```env
# Banco de Dados (obrigatorio)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"

# Seguranca (obrigatorio)
JWT_SECRET="gere-com: openssl rand -base64 32"
CRON_SECRET="gere-com: openssl rand -base64 32"

# Storage (opcional - para uploads em cloud)
NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sua-anon-key"

# IA - Relatorios (opcional)
XAI_API_KEY="sua-api-key-xai"
```

> **IMPORTANTE:** Nunca commite `.env` ou `.env.local`. Esses arquivos ja estao no `.gitignore`.

---

## Scripts Disponiveis

| Script        | Comando                           | Descricao                                  |
| ------------- | --------------------------------- | ------------------------------------------ |
| Dev           | `npm run dev`                     | Servidor de desenvolvimento com hot reload |
| Build         | `npm run build`                   | Build de producao                          |
| Start         | `npm start`                       | Inicia servidor de producao                |
| Lint          | `npm run lint`                    | Verificacao de codigo com ESLint           |
| Test          | `npm test`                        | Executa testes unitarios com Vitest        |
| Test Watch    | `npm run test:watch`              | Testes em modo watch                       |
| Prisma Studio | `npx prisma studio`               | Interface visual do banco de dados         |
| Migration     | `npx prisma migrate dev`          | Cria e aplica nova migration               |
| Seed          | `npx tsx prisma/seed_roles_v2.ts` | Popula roles, teams e sectors              |

---

## Banco de Dados

### Modelos Principais

| Modelo            | Descricao                                           |
| ----------------- | --------------------------------------------------- |
| `User`            | Usuarios com cargo, setor e equipe                  |
| `Task`            | Tarefas com status, prioridade, prazo e localizacao |
| `Subtask`         | Subtarefas vinculadas a uma tarefa                  |
| `Comment`         | Comentarios em tarefas com suporte a mencoes        |
| `Role`            | Cargos com permissoes JSON granulares               |
| `Sector`          | Setores/departamentos                               |
| `Team`            | Equipes/Polos                                       |
| `Contract`        | Contratos de servico                                |
| `City`            | Cidades                                             |
| `Neighborhood`    | Bairros (vinculados a cidade e contrato)            |
| `Template`        | Modelos de tarefas reutilizaveis                    |
| `TemplateTask`    | Tarefas dentro de templates                         |
| `TemplateSubtask` | Subtarefas dentro de tarefas de template            |
| `TaskHistory`     | Historico de alteracoes (auditoria)                 |
| `Notification`    | Notificacoes do sistema                             |
| `Mention`         | Mencoes em comentarios                              |
| `ActivityLog`     | Log de auditoria global                             |
| `TaskUser`        | Colaboradores em tarefas (N:N)                      |
| `UserSector`      | Usuarios com multiplos setores (N:N)                |
| `TaskAttachment`  | Anexos (imagens/PDFs)                               |
| `TaskPause`       | Registros de pausas com calculo de tempo            |
| `TaskType`        | Tipos de tarefa por setor                           |

### Diagrama de Relacoes

```
User ──< TaskUser >── Task
  |                     |
  +── Role              +── Subtask
  +── Sector            +── Comment ──< Mention
  +── Team              +── TaskHistory
  +── UserSector        +── TaskPause
  +── TaskAttachment    +── TaskAttachment
                        +── Notification
                        +── Contract
                        +── City ──< Neighborhood
```

---

## Estrutura do Projeto

```
geotask-pro/
├── prisma/
│   ├── schema.prisma              # Schema do banco de dados
│   ├── migrations/                # Historico de migrations
│   └── seed_roles_v2.ts           # Seed de roles, teams, sectors
├── public/
│   └── uploads/                   # Uploads de usuarios
├── src/
│   ├── app/
│   │   ├── page.tsx               # Pagina principal (SPA multi-view)
│   │   ├── login/page.tsx         # Pagina de login
│   │   ├── layout.tsx             # Layout raiz
│   │   ├── components/            # Componentes especificos de pagina
│   │   │   ├── SettingsPage.tsx   # Configuracoes do sistema
│   │   │   ├── UserModal.tsx      # Modal de usuario
│   │   │   └── ImportUsersModal.tsx
│   │   └── api/                   # 27 API Routes
│   │       ├── auth/              # Login, sessao, alterar senha
│   │       ├── tasks/             # CRUD + anexos
│   │       ├── users/             # CRUD + importacao
│   │       ├── comments/          # Comentarios e mencoes
│   │       ├── notifications/     # Notificacoes
│   │       ├── roles/             # Cargos e permissoes
│   │       ├── sectors/           # Setores
│   │       ├── teams/             # Times/Polos
│   │       ├── contracts/         # Contratos
│   │       ├── cities/            # Cidades
│   │       ├── neighborhoods/     # Bairros
│   │       ├── task-types/        # Tipos de tarefa
│   │       ├── templates/         # Templates
│   │       ├── user-sectors/      # Vinculos multi-setor
│   │       ├── activity-log/      # Log de atividades
│   │       ├── dashboard/         # Estatisticas
│   │       ├── lookups/           # Dados para dropdowns
│   │       ├── events/            # Eventos do cronograma
│   │       ├── reports/           # Relatorios
│   │       ├── ai/               # Integracao IA (XAI/Grok)
│   │       └── cron/             # Jobs agendados
│   ├── components/
│   │   ├── dashboard/             # Dashboard
│   │   ├── kanban/                # Kanban Board
│   │   ├── cronograma/            # Cronograma/Timeline
│   │   ├── mindmap/               # Mind Map
│   │   ├── list/                  # Lista/Tabela
│   │   ├── templates/             # Templates
│   │   ├── tasks/                 # TaskDetailModal, NewTaskModal
│   │   ├── notifications/         # Notificacoes
│   │   ├── activitylog/           # Log de Atividades
│   │   ├── layout/                # TopBar, Sidebar
│   │   ├── shared/                # TaskFilters, FilterInputs, Forms
│   │   ├── ui/                    # Componentes base
│   │   └── skeletons/             # Loading placeholders
│   ├── hooks/                     # Custom Hooks (SWR)
│   ├── stores/                    # Zustand Stores (auth, ui)
│   ├── lib/
│   │   ├── prisma.ts              # Prisma Client singleton
│   │   ├── permissions.ts         # Sistema RBAC
│   │   ├── helpers.ts             # Funcoes utilitarias
│   │   ├── constants.ts           # Constantes
│   │   ├── exportUtils.ts         # Exportacao Excel/PDF
│   │   ├── activityLog.ts         # Logger de atividades
│   │   ├── services/              # Servicos (auth, notifications)
│   │   ├── validators/            # Schemas Zod
│   │   └── __tests__/             # Testes unitarios
│   └── types/
│       └── index.ts               # Tipos TypeScript
├── docker-compose.yml             # PostgreSQL local
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── .env.example                   # Template de variaveis
├── .gitignore
└── README.md
```

---

## API Routes

### Autenticacao

| Metodo | Rota                        | Descricao               |
| ------ | --------------------------- | ----------------------- |
| POST   | `/api/auth/login`           | Login com email e senha |
| POST   | `/api/auth/me`              | Validacao de sessao     |
| POST   | `/api/auth/change-password` | Alterar senha           |

### Tarefas

| Metodo | Rota                          | Descricao                                |
| ------ | ----------------------------- | ---------------------------------------- |
| GET    | `/api/tasks`                  | Listar tarefas (com filtros e paginacao) |
| POST   | `/api/tasks`                  | Criar tarefa                             |
| PATCH  | `/api/tasks`                  | Atualizar tarefa                         |
| DELETE | `/api/tasks`                  | Excluir tarefa                           |
| GET    | `/api/tasks/[id]/attachments` | Listar anexos                            |
| POST   | `/api/tasks/[id]/attachments` | Upload de anexo                          |
| DELETE | `/api/tasks/[id]/attachments` | Remover anexo                            |
| GET    | `/api/tasks/history`          | Historico de alteracoes                  |

### Usuarios

| Metodo | Rota                | Descricao                   |
| ------ | ------------------- | --------------------------- |
| GET    | `/api/users`        | Listar usuarios             |
| POST   | `/api/users`        | Criar usuario               |
| PATCH  | `/api/users`        | Atualizar usuario           |
| POST   | `/api/users/import` | Importar usuarios via Excel |

### Administracao

| Metodo          | Rota                 | Descricao            |
| --------------- | -------------------- | -------------------- |
| GET/POST/PUT    | `/api/roles`         | Cargos e permissoes  |
| GET/POST/PUT    | `/api/sectors`       | Setores              |
| GET/POST/PUT    | `/api/teams`         | Times/Polos          |
| GET/POST        | `/api/user-sectors`  | Vinculos multi-setor |
| GET/POST/PUT    | `/api/contracts`     | Contratos            |
| GET/POST/PUT    | `/api/cities`        | Cidades              |
| GET/POST/PUT    | `/api/neighborhoods` | Bairros              |
| GET/POST/PUT    | `/api/task-types`    | Tipos de tarefa      |
| GET/POST/DELETE | `/api/templates`     | Templates            |

### Outros

| Metodo    | Rota                   | Descricao                 |
| --------- | ---------------------- | ------------------------- |
| GET/POST  | `/api/comments`        | Comentarios e mencoes     |
| GET/PATCH | `/api/notifications`   | Notificacoes              |
| GET       | `/api/activity-log`    | Log de atividades         |
| GET       | `/api/dashboard/stats` | Estatisticas do dashboard |
| GET       | `/api/lookups`         | Dados para dropdowns      |
| GET       | `/api/events`          | Eventos do cronograma     |
| POST      | `/api/ai/analyze`      | Relatorios com IA         |
| GET       | `/api/reports/weekly`  | Relatorio semanal         |
| GET       | `/api/cron/late-tasks` | Job de tarefas atrasadas  |

---

## Sistema de Permissoes

RBAC (Role-Based Access Control) com permissoes JSON armazenadas no campo `permissions` do modelo `Role`.

### Cargos e Niveis de Acesso

| Cargo                 | Visualizacao       | Criar | Editar | Atribuir           | Pausas |
| --------------------- | ------------------ | ----- | ------ | ------------------ | ------ |
| **Admin**             | Todos os setores   | Sim   | Sim    | Qualquer um        | Sim    |
| **Socio**             | Todos os setores   | Nao   | Nao    | Nao                | Nao    |
| **Diretor**           | Todos os setores   | Sim   | Nao    | Qualquer um        | Nao    |
| **Gerente**           | Todos os setores   | Sim   | Sim    | Qualquer um        | Sim    |
| **Coord. de Polo**    | Proprio time       | Sim   | Nao    | Proprio time       | Nao    |
| **Coord. de Setores** | Setores vinculados | Sim   | Sim    | Setores vinculados | Nao    |
| **Gestor**            | Proprio setor      | Sim   | Nao    | Proprio setor      | Nao    |
| **Liderado**          | Apenas atribuidas  | Nao   | Nao    | Nao                | Nao    |

### Categorias de Permissao

- **pages** — Acesso a paginas (dashboard, kanban, cronograma, mindmap, lista, templates, log de atividades, configuracoes)
- **tasks** — Operacoes em tarefas (criar, editar, visualizar por escopo, atribuir, gerenciar pausas)
- **settings** — Administracao (usuarios, cargos, localizacoes, tipos de tarefa, times, vinculos multi-setor)

---

## Funcionalidades

### Visualizacoes

| Pagina         | Descricao                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------- |
| **Kanban**     | Quadro com colunas por status. Drag-and-drop para mover tarefas.                             |
| **Dashboard**  | Graficos: tarefas por status, setor, prioridade. Taxa de conclusao. Ranking de responsaveis. |
| **Cronograma** | Timeline de tarefas por data de prazo com filtros por setor/responsavel/contrato.            |
| **Mind Map**   | Arvore hierarquica de tarefas pai/filho.                                                     |
| **Lista**      | Tabela completa com filtros avancados e exportacao Excel/PDF.                                |

### Filtros Avancados

- Busca textual (titulo, descricao, codigo da tarefa)
- Status, prioridade, setor (multi-select)
- Contrato > Cidade > Bairro (selecao em cascata)
- Tipo de tarefa, responsavel (agrupados por setor)
- Time/Polo
- Estado do prazo (Dentro do Prazo, Proximo, Em Atraso, Entregue no Prazo, Atraso na Entrega)
- Data de criacao e prazo (range picker)
- "Criadas por mim" (checkbox)
- Ordenacao customizada (titulo, data de entrega)

### Recursos Adicionais

- **Templates** — Modelos reutilizaveis com tarefas e subtarefas pre-definidas
- **Mencoes** — @usuario e @setor em comentarios, com notificacao automatica
- **Anexos** — Upload de imagens (PNG, JPG, GIF, WebP) e PDFs (max 10MB)
- **Pausas** — Registro de pausas com data/hora, recalculo automatico de tempo gasto
- **Exportacao** — Excel (planilha com todos os campos) e PDF (relatorio formatado)
- **Importacao** — Importacao em massa de usuarios via planilha Excel

---

## Testes

```bash
# Executar todos os testes
npm test

# Modo watch
npm run test:watch
```

Testes em `src/lib/__tests__/`:

| Arquivo               | Cobertura                      |
| --------------------- | ------------------------------ |
| `authService.test.ts` | Autenticacao e hashing         |
| `task.test.ts`        | Validacao de tarefas (Zod)     |
| `user.test.ts`        | Validacao de usuarios (Zod)    |
| `comment.test.ts`     | Validacao de comentarios (Zod) |
| `helpers.test.ts`     | Funcoes utilitarias            |

---

## Deploy

### Variaveis de ambiente obrigatorias

```
DATABASE_URL
DIRECT_URL
JWT_SECRET
CRON_SECRET
```

### Opcao 1 — Vercel + Neon

1. Conecte o repositorio ao Vercel
2. Configure variaveis de ambiente no dashboard
3. Build command: `prisma generate && prisma migrate deploy && next build`

### Opcao 2 — Docker (AWS/VPS)

```bash
docker build -t geotask-pro .
docker run -p 3000:3000 --env-file .env.local geotask-pro
```

### Docker Compose (desenvolvimento local)

```bash
docker compose up -d    # Sobe PostgreSQL na porta 5433
npm run dev             # Inicia o Next.js
```

---

## Contribuicao

### Fluxo de trabalho (Git Flow)

1. Branch `master` — Producao estavel
2. Branch `v2.0` — Desenvolvimento da proxima versao
3. Branches `feature/*` — Funcionalidades novas (criadas a partir de `v2.0`)
4. Branches `fix/*` — Correcoes de bugs
5. Branches `hotfix/*` — Correcoes urgentes em producao

### Workflow

```bash
# Criar feature branch
git checkout v2.0
git pull origin v2.0
git checkout -b feature/nome-da-feature

# Trabalhar e commitar
git add <arquivos>
git commit -m "feat: descricao da mudanca"

# Push e abrir Pull Request para v2.0
git push origin feature/nome-da-feature
```

### Convencao de commits

| Prefixo     | Uso                                      |
| ----------- | ---------------------------------------- |
| `feat:`     | Nova funcionalidade                      |
| `fix:`      | Correcao de bug                          |
| `refactor:` | Refatoracao sem mudanca de comportamento |
| `docs:`     | Documentacao                             |
| `test:`     | Testes                                   |
| `chore:`    | Tarefas de manutencao                    |
| `style:`    | Formatacao, sem mudanca de logica        |
| `perf:`     | Melhoria de performance                  |

### Regras

- Nunca commite direto na `master` ou `v2.0`
- Sempre crie Pull Request para review
- Testes devem passar antes do merge
- Nunca commite arquivos `.env` ou credenciais
- Siga os padroes de codigo existentes

---

## Licenca

Projeto proprietario. Todos os direitos reservados.
