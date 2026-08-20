# TodoApp — SSOT

Repo `sebacorby/todoApp` · rama `feature/todo-app-implementation` · base `main@20b178b` · 2026-08-19.

**Regla:** este es el único seguimiento. Al retomar: verificar HEAD, leer este archivo y continuar la primera etapa `PENDING`. Una etapa funcional = un commit que también actualiza este archivo. Sin force-push ni merge sin instrucción.

## Producto
App local sin login/backend, dark-only, minimalista, profesional y responsive. Persistencia IndexedDB nativa; HTML/CSS/JS ES modules, sin framework.

Tarea: `id,title,description,startsAt,endsAt,status,criticality,recurrence,recurrenceEnd,completedAt,createdAt,updatedAt`.

Estados exactos: `not_started` Sin iniciar; `started` Iniciada; `paused` Pausada; `blocked` Bloqueada; `completed` Completa. Nueva -> `not_started`; completa -> reactivar a `not_started`.

Criticidad: `low` Baja; `medium` Media; `high` Alta; `urgent` Urgente. El color es configuración global por criticidad, nunca se copia en tareas; cambiarlo afecta histórico/presente/futuro/recurrencias.

Calendario: mes/semana/día, navegación sin límite artificial, click slot -> modal con fecha/hora precargadas editables, click evento -> edición, drag/drop persistente conservando duración.

Dashboard: resumen, búsqueda, filtros estado/criticidad, listado, histórico y acciones rápidas.

Recurrencia: `none|daily|weekly|monthly`, fin opcional; ocurrencias derivadas por rango visible, nunca materializar futuro infinito.

## Decisiones
D-001 IndexedDB local. D-002 colores en settings. D-003 recurrencia derivada. D-004 modal único alta/edición. D-005 stack nativo para evitar overkill. D-006 trabajar en feature branch, no tocar main.

## Etapas
0 `COMPLETED` SSOT inicial `310e711`, reparado `5ec8b6f`.
1 `COMPLETED` Foundation `20b178b`.
2 `COMPLETED` CRUD+modal `4916032`: alta/edición/eliminación, validación, estados, criticidad, completar/reactivar.
3 `COMPLETED` Calendario: mes/semana/día, navegación libre, alta por slot, edición, drag/drop persistente.
4 `PENDING` Dashboard.
5 `PENDING` Recurrencia + colores globales.
6 `PENDING` Polish + README + auditoría final.

## Reanudación
Verificar HEAD -> leer SSOT -> ejecutar primera `PENDING` -> actualizar SSOT en el mismo commit -> verificar SHA.
