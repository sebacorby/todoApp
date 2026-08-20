# TodoApp — SSOT

Repo `sebacorby/todoApp` · rama `feature/todo-app-implementation` · base `main@20b178b` · 2026-08-19.

**Regla:** único seguimiento. Al retomar: verificar HEAD, leer este archivo y continuar la primera etapa `PENDING`. Una etapa funcional = un commit que actualiza este archivo. Sin force-push ni merge sin instrucción.

## Producto
App local sin login/backend, dark-only, minimalista, profesional, responsive. IndexedDB nativa; HTML/CSS/JS ES modules.

Tarea: `id,title,description,startsAt,endsAt,status,criticality,recurrence,recurrenceEnd,completedAt,createdAt,updatedAt`.
Estados: `not_started|started|paused|blocked|completed`. Nueva -> `not_started`; reactivar completa -> `not_started`.
Criticidad: `low|medium|high|urgent`; color global en settings, nunca copiado a la tarea.
Calendario: mes/semana/día, navegación libre, alta por slot, edición, drag/drop persistente conservando duración.
Dashboard: resumen, búsqueda, filtros estado/criticidad, listado, histórico y acciones rápidas.
Recurrencia: `none|daily|weekly|monthly`, fin opcional; ocurrencias derivadas por rango visible, nunca futuro infinito.

## Decisiones
D-001 IndexedDB local. D-002 colores globales en settings. D-003 recurrencia derivada. D-004 modal único alta/edición. D-005 stack nativo. D-006 feature branch; no tocar main.

## Etapas
0 `COMPLETED` SSOT `310e711`, reparado `5ec8b6f`.
1 `COMPLETED` Foundation `20b178b`.
2 `COMPLETED` CRUD+modal `4916032`.
3 `COMPLETED` Calendario `129acd9`: mes/semana/día, navegación, alta por slot, edición, drag/drop.
4 `COMPLETED` Dashboard: resumen, búsqueda, filtros, histórico y cambio rápido de estado.
5 `PENDING` Recurrencia + colores globales.
6 `PENDING` Polish + README + auditoría final.

## Reanudación
Verificar HEAD -> leer SSOT -> ejecutar primera `PENDING` -> actualizar SSOT en mismo commit -> verificar SHA.
