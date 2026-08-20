# TodoApp — SSOT

Repo `sebacorby/todoApp`.

## Estado actual

- Base estable: `main`.
- Feature activa: `feature/calendar-backlog`.
- Feature backlog: **COMPLETED / CI GREEN**.
- Último HEAD funcional validado antes del cierre documental: `a28308a8e318a2c82f817a5bee8831c621a8287f`.
- GitHub Actions run de validación funcional: `32360035629` → `completed / success`.

## Reanudación

1. Leer este archivo primero.
2. Verificar el HEAD real de `feature/calendar-backlog`.
3. Verificar que el último CI del HEAD esté verde.
4. Si se integra, abrir PR hacia `main` y esperar los checks del PR.
5. No mergear sin instrucción explícita.

## Arquitectura vigente

La persistencia es una SQLite física local y no depende del navegador, URL, puerto ni servidor que sirve la UI.

1. UI: Electron o HTTP local.
2. DB owner web: proceso loopback en `127.0.0.1:43127`.
3. SQLite física: ruta estable por usuario.
4. Electron usa IPC directo; navegador usa HTTP loopback.

Ruta canónica:

- Windows: `%APPDATA%/TodoApp/data/todoapp.sqlite3`
- macOS: `~/Library/Application Support/TodoApp/data/todoapp.sqlite3`
- Linux: `${XDG_CONFIG_HOME:-~/.config}/TodoApp/data/todoapp.sqlite3`

## Backlog lateral del calendario

Status: **COMPLETED**.

### Comportamiento

- El calendario muestra a la derecha un panel `Backlog / Sin fecha`.
- Una tarea de backlog no tiene `startsAt` ni `endsAt`.
- El orden manual se persiste en `backlogOrder`.
- Cada tarea se muestra como tarjeta arrastrable.
- Cada tarjeta tiene un icono de ojo para abrir/editar la tarea.
- El botón `+` del panel crea una tarea sin fecha usando el mismo modal.
- Las tarjetas se pueden reordenar con drag & drop dentro del backlog.
- Una tarea sin fecha no puede ser recurrente hasta ser agendada.
- Arrastrar una tarjeta al calendario conserva el mismo `id`.
- Al soltar en vista día/semana toma fecha y hora exactas del slot.
- Al soltar en vista mes toma el día y usa `09:00`.
- Una tarea de backlog recibe inicialmente una duración de 1 hora.
- Al quedar agendada, `backlogOrder` pasa a `null` y la tarjeta sale del backlog.
- Dashboard representa estas tareas como `Sin fecha · Backlog` y no las cuenta como vencidas.

### Datos

SQLite schema actual: **v2**.

Campos relevantes:
- `starts_at TEXT NULL`
- `ends_at TEXT NULL`
- `backlog_order INTEGER NULL`

Invariantes:
- `starts_at` y `ends_at` son ambos null o ambos no-null.
- una tarea sin fecha debe tener `recurrence = 'none'`.
- las bases schema v1 migran a v2 sin perder tareas existentes.

## Decisiones

- D-009 SQLite física reemplaza IndexedDB.
- D-017 gate E2E renderer→preload→IPC→SQLite.
- D-019 navegador usa adaptador HTTP loopback cuando `window.todoDb` no existe.
- D-020 servicio DB escucha solo en `127.0.0.1:43127`.
- D-021 Electron y web comparten la misma ruta canónica de SQLite.
- D-022 CI prueba UI servida por HTTP sin preload.
- D-024 backlog se modela como tareas con fechas nulas y `backlogOrder`, no como una entidad duplicada.
- D-025 scheduling backlog→calendario conserva identidad y asigna 1 hora por defecto.
- D-026 recurrencia queda deshabilitada mientras una tarea no tenga fecha.
- D-027 el E2E de backlog usa una SQLite temporal y un renderer HTTP real para no tocar datos del usuario.

## Validación

Run `32360035629`: `completed / success`.

Gates verificados:
- unit + recurrencia + modelo backlog + SQLite + migración v1→v2: success;
- servicio loopback HTTP + tareas agendadas y backlog: success;
- chequeo sintáctico de módulos JS: success;
- Electron main + SQLite: success;
- Electron renderer + preload + IPC + SQLite: success;
- HTTP renderer sin preload + loopback SQLite: success;
- E2E backlog: tarjeta + icono ojo + drag/drop real a slot `14:00` + lectura posterior desde SQLite + `backlogOrder=null` + duración 1h: success.

## Commits clave de la feature

- `a124a3a4a75450dd251121b2702a1a839476dcb9` — modelo de orden/scheduling y tests.
- `71f96821bea6c169b4d7163cfd3620da2c7b7ba1` — panel backlog.
- `2185de4b7bc8e072c37c37709d1fe1e5ddffd8d6` — integración con modal.
- `6acfbf66ca9d15a965eb6c17e53838b875383814` — drop al calendario.
- `0c0e863db42048826bd72ac6d94b3f80b674d12b` — persistencia/migración/tests estabilizados.
- `3b502ca11fddc7294895f2197820e6243269a2b6` — primer gate E2E.
- `a28308a8e318a2c82f817a5bee8831c621a8287f` — runner E2E aislado y verde.

No abrir ni mergear PR automáticamente sin instrucción explícita.
