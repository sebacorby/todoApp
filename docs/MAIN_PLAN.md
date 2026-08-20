# TodoApp — SSOT

Repo `sebacorby/todoApp`. Base: `main@01660392e6cf0056e38cd876ec9b5424322dba16`. Rama: `feature/physical-local-db`. Actualizado 2026-08-19.

**Regla:** única fuente de seguimiento. Verificar HEAD antes de modificar. Sin force-push ni merge sin instrucción.

## Scope vigente

Se conserva el MVP completo: calendario, dashboard, CRUD, cinco estados, cuatro criticidades, colores globales, recurrencia e histórico.

### Mejora solicitada: persistencia física

La persistencia no puede depender de navegador, origen, URL, puerto ni servidor.

Arquitectura:
- Electron 43.
- SQLite física con `node:sqlite`.
- Archivo `<userData>/data/todoapp.sqlite3`.
- Electron main es dueño exclusivo de SQLite.
- Renderer aislado: `contextIsolation:true`, `nodeIntegration:false`, `sandbox:true`.
- Preload expone API mínima por IPC.
- Sin login, backend remoto ni cloud.

## Modelo

Task: `id,title,description,startsAt,endsAt,status,criticality,recurrence,recurrenceEnd,completedAt,createdAt,updatedAt`.

Estados: `not_started|started|paused|blocked|completed`.
Criticidades: `low|medium|high|urgent`.
Colores en settings globales, nunca duplicados en tareas.

## Decisiones

- D-001 IndexedDB: SUPERSEDED.
- D-009 SQLite física reemplaza IndexedDB.
- D-010 ruta DB bajo `app.getPath("userData")/data/todoapp.sqlite3`.
- D-011 main process es dueño de DB.
- D-012 renderer usa IPC vía preload aislado.
- D-013 `PRAGMA user_version` gobierna migraciones y schemas futuros fallan seguro.
- D-014 Node 24 para tests, alineado con Electron 43 y `node:sqlite`.

## Historial

Etapas 0–8 del MVP: COMPLETED y mergeadas a main por PR #1.

## Feature persistencia física

### Etapa 9 — Desktop runtime + SQLite
Status: COMPLETED.
Incluye runtime Electron, store SQLite/schema v1, IPC/preload, reemplazo de `src/db.js`, README y eliminación de dependencia funcional de IndexedDB.

### Etapa 10 — Tests persistencia
Status: COMPLETED.
Cobertura: archivo físico, firma SQLite, schema/user_version, CRUD, close/reopen, settings, reapertura no destructiva, schema futuro, constraints, suite previa de recurrencia y sintaxis.

## Definition of Done

- App de escritorio.
- Sin IndexedDB para datos de negocio.
- Todas las tareas/settings en SQLite.
- Persistencia tras cerrar/reabrir.
- Ruta independiente de URL/puerto/browser/CWD.
- Schema versionado.
- Suite completa verde local y CI antes de PR.
