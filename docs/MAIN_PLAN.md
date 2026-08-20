# TodoApp — SSOT

Repo: `sebacorby/todoApp`
Rama: `feature/todo-app-implementation`
Base: `main @ 20b178b69179c32e3a85aa0421ea385e2be4958a`
Actualizado: 2026-08-19

Única fuente de verdad. Para retomar: verificar HEAD, leer este archivo y continuar desde la primera etapa `PENDING`.

## Alcance
App local de tareas, sin login/backend, dark-only, minimalista, profesional y responsive.

Calendario estilo Google Calendar:
- vistas mes/semana/día;
- navegación ilimitada pasado/futuro;
- click en slot abre alta con fecha/hora precargadas y editables;
- click en tarea abre edición;
- drag/drop cambia fecha/hora y persiste;
- ajuste de duración cuando aplique.

Alta global: botón `+`, mismo modal, fecha/hora editables.

Dashboard: resumen, búsqueda, filtros por estado/criticidad, listado, histórico y acciones rápidas.

Estados exactos:
`not_started` Sin iniciar; `started` Iniciada; `paused` Pausada; `blocked` Bloqueada; `completed` Completa.
Nueva -> `not_started`. Completa puede reactivarse a `not_started`.

Criticidad:
`low` Baja; `medium` Media; `high` Alta; `urgent` Urgente.
El color es global por criticidad y NO se copia en tareas. Cambiarlo afecta histórico, presente, futuro y recurrencias.

Recurrencia: `none|daily|weekly|monthly`, fin opcional. Ocurrencias derivadas por rango visible; no materializar futuro infinito.

## Arquitectura
HTML + CSS + JavaScript ES modules + IndexedDB nativo.
Sin framework adicional, backend, auth ni runtime desktop.

Modelo Task:
`id,title,description,startsAt,endsAt,status,criticality,recurrence,recurrenceEnd,completedAt,createdAt,updatedAt`.

Decisiones:
- D-001 IndexedDB local.
- D-002 colores en settings globales.
- D-003 recurrencia derivada.
- D-004 un solo modal para alta/edición.
- D-005 stack nativo para evitar overkill.
- D-006 implementar en `feature/todo-app-implementation`; no tocar `main`.

## Protocolo
Una etapa funcional = un commit. Cada commit de etapa actualiza este SSOT. Verificar SHA efectivo. Sin force push ni merge sin instrucción.

## Etapas
0 SSOT — `COMPLETED` — `310e711` (original truncado; reparado en rama).
1 Foundation — `COMPLETED` — `20b178b` — shell dark, navegación e IndexedDB base.
2 CRUD + modal — `PENDING` — CRUD persistente, modal reutilizable, +, validación, estados, criticidad, completar/reactivar.
3 Calendario — `PENDING` — mes/semana/día, navegación, alta por slot, edición, drag/drop, duración.
4 Dashboard — `PENDING` — resumen, búsqueda, filtros, histórico, quick actions.
5 Recurrencia + colores — `PENDING` — daily/weekly/monthly, fin opcional, ocurrencias derivadas, editor global de colores.
6 Polish + handoff — `PENDING` — accesibilidad, responsive, vacíos/errores, README, auditoría SSOT.

## Reanudación
1. Verificar HEAD de la rama.
2. Leer este SSOT.
3. Ubicar primera etapa `PENDING`.
4. Implementar solo esa etapa.
5. Actualizar este SSOT en el mismo commit.
6. Verificar el nuevo SHA.
