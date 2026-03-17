interface AppPermissions {
pages: { dashboard, kanban, cronograma, mindmap, list, templates, activity_log, settings };
tasks: {
create, edit_all, edit_retroactive_dates, view_all_sectors,
view_own_team, // ver tarefas do proprio time/polo
view_own_sector, // ver tarefas do proprio setor
view_created_by_me, // sempre ver tarefas criadas por mim
assign_any, // atribuir a qualquer pessoa
assign_own_team, // atribuir dentro do time
assign_own_sector, // atribuir dentro do setor
manage_pauses, // gerenciar pausas retroativas
};
settings: {
manage_users, manage_roles, manage_locations, manage_task_types,
manage_teams, // gerenciar times
manage_user_sectors, // gerenciar vinculos multi-setor
};
}

```

### 2.2 Atualizar fallback `getPermissions()` para novos cargos

Mapeamento por cargo:
| Cargo | view_all | create | edit_all | assign | manage_pauses |
|-------|----------|--------|----------|--------|---------------|
| Admin | all | sim | sim | any | sim |
| Socio | all | nao | nao | nao | nao |
| Diretor | all | sim | nao | any | nao |
| Gerente | all | sim | sim | any | sim |
| Coord. Polo | team | sim | nao | team | nao |
| Coord. Setores | sectors | sim | sim | sectors | nao |
| Gestor | sector | sim | nao | sector | nao |
| Liderado | assigned | nao | nao | nao | nao |

### 2.3 Criar `getTaskVisibilityFilter()` — funcao que retorna Prisma `where`

Baseado no cargo do usuario, retorna o filtro correto para a query de tasks.

---

## Fase 3 — APIs Backend

### 3.1 Teams API (NOVO: `src/app/api/teams/route.ts`)
- GET: listar times com contagem de usuarios
- POST: criar time
- PATCH: editar nome
- DELETE: remover (se sem usuarios vinculados)

### 3.2 User-Sectors API (NOVO: `src/app/api/user-sectors/route.ts`)
- GET `?user_id=X`: setores vinculados ao usuario
- POST: vincular usuario a setor
- DELETE: remover vinculo

### 3.3 Task Attachments API (NOVO: `src/app/api/tasks/[id]/attachments/route.ts`)
- **Storage: Supabase/Neon Storage** (persistente entre deploys)
- POST: upload multipart → salvar no storage → criar registro TaskAttachment
- GET: listar anexos da tarefa com URLs assinadas
- DELETE: remover do storage + registro no banco

### 3.4 Atualizar Tasks API (`src/app/api/tasks/route.ts`)
- GET: adicionar filtros `team_id`, `created_by_me=true`
- GET: aplicar `getTaskVisibilityFilter()` baseado no cargo do usuario logado
- GET: **FIX BUG prazo** — retornar `deadline` como ISO string em vez de `toLocaleDateString("pt-BR")`

### 3.5 Gerenciamento de Pausas (`src/app/api/tasks/route.ts` PATCH)
- Nova acao `action: "manage_pauses"` que recebe array de pausas `[{started_at, ended_at}]`
- Permite adicionar pausas retroativas com data+hora especificas
- Recalcula `time_spent` descontando pausas

### 3.6 Atualizar Users API (`src/app/api/users/route.ts`)
- Incluir `Team` no include do GET
- Aceitar `team_id` no POST/PATCH
- Incluir `user_sectors` no response

---

## Fase 4 — Frontend

### 4.1 FIX BUG: Status de prazo incorreto
**Arquivos:** `src/lib/helpers.ts`, `src/app/api/tasks/route.ts`

O problema: A API retorna `deadline` formatado como `"16/03/2026"` (DD/MM/YYYY). O `parseDateStr()` tenta `new Date("16/03/2026")` que retorna Invalid Date em muitos engines. O fallback `parseDate()` funciona mas pode ter problemas de timezone.

**Correcao:** Retornar deadline como ISO string da API (`t.deadline.toISOString()`). Ajustar frontend para formatar na exibicao.

### 4.2 Tipos TypeScript (`src/types/index.ts`)
- Adicionar interfaces: `Team`, `UserSector`, `TaskAttachment`
- Atualizar `User`: adicionar `team_id?`, `team?`, `user_sectors?`
- Atualizar `Task`: adicionar `team_id?`, `team?`, `attachments?`

### 4.3 Hook `useTeams` (NOVO: `src/hooks/useTeams.ts`)
- SWR pattern igual aos hooks existentes

### 4.4 Filtro "Criadas por mim" (`src/components/shared/TaskFilters.tsx`)
- Checkbox que filtra `tasks.filter(t => t.created_by_id === user.id)`
- Visivel para: Diretor, Gerente, Coord. Polo, Coord. Setores, Gestor

### 4.5 Filtro de Time/Polo (`src/components/shared/TaskFilters.tsx`)
- Dropdown de selecao de time no header de filtros
- Visivel para: Admin, Socio, Gerente, Gestor

### 4.6 Aba Anexos no TaskDetailModal (`src/components/tasks/TaskDetailModal.tsx`)
- Nova tab "Anexos" com:
  - Lista de anexos com download/preview/delete
  - Botao upload (aceita imagem + PDF)
  - Preview inline para imagens

### 4.7 Dialogo de Pausas (`src/components/tasks/TaskDetailModal.tsx`)
- Substituir inputs simples de data por dialogo completo
- Campos: Data+Hora inicio, Data+Hora fim
- Botao "Adicionar Pausa" para incluir periodos
- Botao "Remover" por pausa
- Visivel para usuarios com permissao `manage_pauses` (Admin/Gerente)

### 4.8 Settings 2.0 (`src/app/components/SettingsPage.tsx`)
- **Nova aba Times**: CRUD de times, listar membros
- **Painel de Permissoes reformulado**: Matriz visual cargo x permissao por pagina
  - Linhas: cada cargo
  - Colunas: cada pagina/acao
  - Toggles por celula
  - Botao "Salvar" com dialogo de confirmacao
- **Multi-setor no UserModal**: Quando cargo = "Coordenador de Setores", exibir multi-select de setores adicionais
- **Time no UserModal**: Dropdown de time ao criar/editar usuario
- **Confirmacao ao salvar**: Dialog de confirmacao antes de salvar permissoes

### 4.9 Atualizar constants (`src/lib/constants.ts`)
- Renomear "Atendimento Social" → "Assistencia Social"

### 4.10 Visibilidade de tarefas (`src/app/page.tsx`)
- Atualizar logica de filtragem para novos cargos
- Passar parametros de visibilidade para API (server-side filtering)
- Atualizar `useTasks()` para enviar `user_id` e `team_id`

---

## Fase 5 — Verificacao

1. **Seguranca de migration**: `--create-only` → revisar SQL → confirmar apenas ADD/CREATE
2. **Testar cada cargo**: Login com cada tipo → verificar visibilidade correta
3. **Testar uploads**: Imagens e PDFs → download → delete
4. **Testar prazo**: Tarefas com deadline passado → deve mostrar "Em Atraso"
5. **Testar filtros**: "Criadas por mim", filtro de time, filtro de setor
6. **Testar pausas**: Criar pausas retroativas → verificar calculo de tempo
7. **Build**: `npm run build` sem erros

---

## Arquivos Criticos

| Arquivo | Acao |
|---------|------|
| `prisma/schema.prisma` | ADD Team, UserSector, TaskAttachment + FKs |
| `src/lib/permissions.ts` | Overhaul completo: novos cargos + visibilidade |
| `src/lib/helpers.ts` | Fix getTaskState (parsing de data) |
| `src/lib/constants.ts` | Renomear setor |
| `src/app/api/tasks/route.ts` | Filtros, visibilidade, pausas, fix deadline |
| `src/app/api/teams/route.ts` | NOVO - CRUD times |
| `src/app/api/user-sectors/route.ts` | NOVO - multi-setor |
| `src/app/api/tasks/[id]/attachments/route.ts` | NOVO - upload files |
| `src/app/api/users/route.ts` | Adicionar team_id |
| `src/types/index.ts` | Novos tipos |
| `src/hooks/useTeams.ts` | NOVO - hook SWR |
| `src/components/shared/TaskFilters.tsx` | Filtros: criadas por mim + time |
| `src/components/tasks/TaskDetailModal.tsx` | Aba Anexos + Dialogo Pausas |
| `src/app/components/SettingsPage.tsx` | Settings 2.0: times, permissoes, multi-setor |
| `src/app/page.tsx` | Visibilidade por cargo |
| `src/stores/authStore.ts` | Incluir team no user |

---

## Decisoes Confirmadas

- **Storage de anexos:** Supabase/Neon Storage
- **Cargo Coordenador:** Renomear para "Coordenador de Setores" (UPDATE)
- **Admin na UI:** Exibido como "Gestor" (mapeamento no frontend)
- **Execucao:** Tudo de uma vez (todas as 5 fases)

## Ordem de Execucao

Todas as fases serao implementadas de uma vez:
```

Plano em 5 Fases:

Fase 1 (Schema) → Fase 2 (Permissoes) → Fase 3 (APIs) → Fase 4 (Frontend) → Fase 5 (Verificacao)

Schema — Criar models Team, UserSector, TaskAttachment + FKs (tudo aditivo, zero data loss)
Permissoes — Nova hierarquia de 8 cargos com visibilidade granular por cargo/time/setor
APIs — Teams CRUD, multi-setor, anexos (Supabase Storage), fix prazo, pausas retroativas
Frontend — Filtro "Criadas por mim", filtro de time, aba Anexos, dialogo de pausas, Settings 2.0 com painel de permissoes, rename setor
Verificacao — Testar cada cargo, uploads, deadline status, build

Fase 1.1-1.3: Atualizar schema Prisma (Team, UserSector, TaskAttachment) - Concluido
Criando seed de cargos - Concluido
Fase 1.5: Renomear setor Atendimento Social + constants - Concluido
Fase 2: Sistema de permissoes (permissions.ts) - Concluido
Fase 3.1-3.3: Novas APIs (teams, user-sectors, attachments) - Concluido
Fase 3.4-3.6: Atualizar APIs existentes (tasks, users, fix deadline) - Concluido
Fase 4.1-4.3: Fix bug prazo + tipos + hook useTeams
Fase 4.4-4.5: Filtros (criadas por mim + time)
Fase 4.6-4.7: Aba Anexos + Dialogo de Pausas
Fase 4.8: Settings 2.0 (times, permissoes, multi-setor)
Fase 4.9-4.10: Constants + visibilidade page.tsx
Fase 5: Build + verificacao
