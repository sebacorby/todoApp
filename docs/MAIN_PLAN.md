# TodoApp — SSOT

Repo `sebacorby/todoApp` · rama `feature/todo-app-implementation` · base `main@20b178b` · actualizado 2026-08-19.

**Regla:** este archivo es el único seguimiento. Para retomar: verificar HEAD, leer este archivo y continuar cualquier punto abierto. Una etapa funcional = un commit que también actualiza este SSOT. Sin force-push ni merge sin instrucción.

## Producto
App local dark-only, sin login/backend. IndexedDB + HTML/CSS/JavaScript ES modules.

Tarea: `id,title,description,startsAt,endsAt,status,criticality,recurrence,recurrenceEnd,completedAt,createdAt,updatedAt`.

Estados: `not_started` Sin iniciar; `started` Iniciada; `paused` Pausada; `blocked` Bloqueada; `completed` Completa. Nueva -> `not_started`; reactivar -> `not_started`.

Criticidad: `low|medium|high|urgent`. Los colores se resuelven desde settings globales y nunca se copian en tareas, por lo que cambio afecta histórico, presente, futuro y recurrencias.

Calendario: mes/semana/día, navegación temporal sin límite artificial, alta por slot con fecha/hora editables, edición por click y drag/drop persistente conservando duración.

Dashboard: resumen, búsqueda, filtros por estado/criticidad, listado, histórico de completadas y cambio rápido de estado.

Recurrencia: `none|daily|weekly|monthly`, fin opcional. Las ocurrencias se derivan para el rango visible; no se materializa futuro infinito. Editar o mover una ocurrencia recurrente modifica la serie fuente completa en este MVP.

## Decisiones
- D-001 IndexedDB local.
- D-002 colores globales en settings.
- D-003 recurrencia derivada por rango.
- D-004 modal único para alta/edición.
- D-005 stack nativo para evitar overkill.
- D-006 desarrollo en `feature/todo-app-implementation`; `main` no se modifica.
- D-007 una ocurrencia recurrente representa su serie fuente; no hay excepciones por ocurrencia en el MVP.

## Etapas
- 0 `COMPLETED` — SSOT inicial `310e711`, reparado `5ec8b6f`.
- 1 `COMPLETED` — Foundation `20b178b`.
- 2 `COMPLETED` — CRUD + modal `4916032`.
- 3 `COMPLETED` — Calendar `129acd9`.
- 4 `COMPLETED` — Dashboard `eb0a700`.
- 5 `COMPLETED` — Recurrencia + colores globales `ddb242e`.
- 6 `COMPLETEED` — Polish + README + auditoría final `38e2168`.
- 7 `COMPLETED` — Hardening de recurrencia mensual: clamp de día al último día válido del mes destino + prueba regresión en `tests/recurrence.test.mjs`.

## Criterios finales cubiertos
- Persistencia local sin login/backend.
- Cinco estados y cuatro criticidades.
- Colores globales y persistentes.
- CRUD, completar/reactivar, histórico.
- Calendario mes/semana/día, navegación, alta por slot y drag/drop.
- Recurrencia daily/weekly/monthly con fin opcional y expansión derivada.
- Dashboard con búsqueda/filtros/resumen.
- Dark-only y responsive base.
- README operativo y prueba de rápida de lógica.

## Reanudación
Lo planificado está completo en la feature branch. Para nuevos cambios: verificar HEAD, agregar una nueva etapa/decisión aquí y validar antes de mergear. No mergear a `main` sin instrucción explícita.
