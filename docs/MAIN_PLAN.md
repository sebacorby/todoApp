# TodoApp — SSOT

Repo `sebacorby/todoApp`. Base: `main@01660392e6cf0056e38cd876ec9b5424322dba16`. Rama: `feature/physical-local-db`. Actualizado 2026-08-19.

**Regla:** única fuente de seguimiento. Verificar HEAD antes de modificar. Sin force-push ni merge sin instrucción.

## Scope vigente

Se conserva el MVP completo: calendario, dashboard, CRUD, cinco estados, cuatro criticidades, colores globales, recurrencia e histórico.

### Mejora solicitada: persistencia física

La persistencia no depende de navegador, origen, URL, puerto ni servidor.

Arquitectura:
- Electron 43.4.1 (Node 24).
- SQLite física con `node:sqlite`.
- Archivo `<userData>/data/todoapp.sqlite3`.
- Electron main es dueño exclusivo de SQLite.
- Renderer: `contextIsolation:true`, `nodeIntegration:false`, `sandbox:true`.
- Preload expone API mínima por IPC.
- Sin login, backend remoto ni cloud.

## Modelo

Task: `id,title,description,startsAt,endsAt,status,criticality,recurrence,recurrenceEnd,completedAt,createdAt,updatedAt`.
Estados: `not_started|started|paused|blocked|completed`.
Criticidades: `low|medium|high|urgent`.
Colores en settings globales.

## Decisiones

- D-001 IndexedDB: SUPERSEDED.
- D-009 SQLite física reemplaza IndexedDB.
- D-010 DB bajo `app.getPath("userData")/data/todoapp.sqlite3`.
- D-011 main process es dueño de DB.
- D-012 renderer usa IPC vía preload aislado.
- D-013 `PRAGMA user_version` gobierna migraciones; schema futuro falla seguro.
- D-014 Node 24, alineado con Electron 43 y `node:sqlite`.
- D-015 CI ejecuta tests Node puros y smoke real de Electron bajo Xvfb.
- D-016 `--no-sandbox` se usa únicamente en el smoke del runner Linux alojado, por limitación del helper SUID; la ventana normal conserva `sandbox:true`.

## Historial

Etapas 0–8 del MVP: COMPLETED y mergeadas a main por PR #1.

## Feature persistencia física

### Etapa 9 — Desktop runtime + SQLite
Status: COMPLETED.
Commit inicial: `8823051ecac7649e37ef6a2d76db9e4f592e3780`.
Incluye Electron, store SQLite/schema v1, IPC/preload, reemplazo de `src/db.js` y README.

### Etapa 10 — Tests persistencia y runtime
Status: COMPLETED.
Commits:
- `d350e561e4ecacfb1e3f3ea127f969cea8b8bfe3` — fixture de schema futuro corregido, constraints/required-fields ampliados, syntax check de `electron/` y smoke Electron.
- `fcd698a2834a48f4c3de1997bdbd9a7499c13815` — adaptación del smoke al runner Linux alojado.

Validación final GitHub Actions, run `32325570659`:
- status: `completed`
- conclusion: `success`
- 15/15 tests Node en verde.
- Smoke Electron + SQLite real en verde.

Cobertura de la batería:
- ruta de DB estable e independiente de origen/browser;
- archivo SQLite físico y firma real;
- schema v1 y `PRAGMA user_version`;
- CRUD;
- persistencia después de close/reopen;
- settings después de close/reopen;
- reapertura sin pérdida;
- rechazo seguro de schema futuro;
- constraints de estado y criticidad;
- validación de campos obligatorios;
- recurrencias existentes;
- chequeo sintáctico de `src/` y `electron/`;
- arranque real de Electron usando la capa SQLite.

## Definition of Done

- App de escritorio.
- Sin IndexedDB para datos de negocio.
- Todas las tareas/settings en SQLite.
- Persistencia tras cerrar/reabrir.
- Ruta independiente de URL/puerto/browser/CWD.
- Schema versionado y constraints.
- Tests de persistencia física.
- Smoke de Electron real.
- CI verde antes de PR.

## Reanudación

El scope de `feature/physical-local-db` está cerrado y validado. Siguiente paso opcional: revisión y PR hacia `main`. No crear ni mergear PR sin instrucción explícita.
