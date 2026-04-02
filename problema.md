Ao criar uma task, o servidor faz muitas queries sequenciais:

resolveSectorId → query
resolveResponsibleId → query
Para cada subtask: resolveSectorId + resolveResponsibleId → N*2 queries
prisma.task.create → query
prisma.user.findUnique (creator name) → query
notifyUser (responsible) → query
Para cada coworker: notifyUser → N queries
Para cada subtask: notifyUser OU prisma.user.findMany (gestores) + loop → N*M queries
logActivity → query
broadcast
Tudo isso é sequencial e bloqueante — a resposta só volta após tudo completar. Com Neon (serverless PostgreSQL), cada query tem ~50-100ms de latência de rede. 12 queries \* 100ms = 1.2s no mínimo, mas com subtasks pode ir a 5-15s.

Para um update_status (iniciar tarefa), são ~8-12 queries sequenciais:

findUnique (buscar task)
findMany (buscar pauses)
logHistory
task.update
user.findUnique (nome do user)
logActivity
taskPause.create/update
Se tem parent: findUnique + até 3 task.update
Se completou: notifyUser _ N
Com Supabase free (que fica nos EUA), cada query tem 100-200ms de latência desde o Vercel. 12 queries _ 150ms = 1.8s só de DB. Mas se houver subtasks/parent, pode chegar a 3-5s de DB.

A solução: paralelizar queries independentes e mover notificações para background (não bloquear a resposta).

Mais um new PrismaClient() no activityLog.ts! E o logActivity é chamado com await em vários lugares mas deveria ser fire-and-forget.

Raiz do problema: DB no Supabase free (não podemos resolver) + queries sequenciais. Cada query ~100-200ms de round-trip. Um update_status faz ~10-15 queries sequenciais = 2-3s de DB. Mas se tiver subtasks/parent/notificações, chega a 5-12s.

otimização principal sugerida: responder imediatamente após o update da task, e mover tudo que é secundário (notificações, logs, parent sync) para background.
