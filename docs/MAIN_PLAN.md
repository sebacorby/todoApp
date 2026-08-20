# TodoApp — SSOT

Repo `sebacorby/todoApp` · rama `feature/todo-app-implementation` · base `main@20b178b` · 2026-08-19.

**Regla:** único seguimiento. Retomar = verificar HEAD, leer este archivo, ejecutar primera `PENDING`, actualizar SSOT en mismo commit y verificar SHA. Sin force-push ni merge sin instrucción.

## Producto
App local dark-only, sin login/backend. IndexedDB + HTML/CSS/JS ES modules. Tarea: `id,title,description,startsAt,endsAt,status,criticality,recurrence,recurrenceEnd,completedAt,createdAt,updatedAt`.
Estados `not_started|started|paused|blocked|completed`; reactivar -> `not_started`. Criticidad `low|medium|high|urgent`; colores globales persistidos en settings, no copiados a tareas.
Calendario mes/semana/día, navegación libre, alta por slot, edición, drag/drop. Dashboard con resumen, búsqueda, filtros, histórico y estado rápido.
Recurrencia `none|daily|weekly|monthly`, fin opcional; ocurrencias derivadas exclusivamente para el rango visible, sin materializar futuro infinito.

## Decisiones
D-001 IndexedDB local. D-002 colores globales en settings. D-003 recurrencia derivada por rango. D-004 modal único. D-005 stack nativo. D-006 feature branch; no tocar main.

## Etapas
0 `COMPLETED` SSOT `310e711`, reparado `5ec8b6f`.
1 `COMPLETED` Foundation `20b178b`.
2 `COMPLETED` CRUD+modal `4916032`.
3 `COMPLETED` Calendar`+ `529acd9`.
4 `COMPLETED` Dashboard `eb0a700`.
5 `COMPLETED` Recurrencia + colores: daily/weekly/monthly, fin opcional, expansión por rango visible y editor global persistente.
6 `PENDING` Polish + README + auditoría final.

## Reanudación
Verificar HEAD -> leer SSOT -> etapa 6 -> actualizar SSOT -> verificar SHA.
