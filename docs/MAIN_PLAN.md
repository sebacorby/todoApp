# TodoApp — SSOT

Repo `sebacorby/todoApp`.

## Estado

El MVP base y la persistencia SQLite fueron mergeados a `main`. La corrección HTTP vive en `feature/physical-local-db`.

## Requisito vigente

La persistencia es una SQLite física local y no depende del navegador, URL, puerto ni servidor que sirve la UI.

Un navegador puro no puede abrir arbitrariamente un archivo SQLite del sistema. La arquitectura separa:

1. UI: Electron o cualquier HTTP local.
2. DB owner: proceso local loopback en `127.0.0.1:43127`.
3. SQLite física: ruta estable por usuario.

Electron usa IPC directo. Browser usa HTTP loopback. Ambos apuntan al mismo archivo.

## Ruta canónica

La ruta coincide con el directorio de datos que usa TodoApp/Electron:

- Windows: `%APPDATA%/TodoApp/data/todoapp.sqlite3`
- macOS: `~/Library/Application Support/TodoApp/data/todoapp.sqlite3`
- Linux: `${XDG_CONFIG_HOME:-~/.config}/TodoApp/data/todoapp.sqlite3`

## Decisiones

- D-001 IndexedDB: SUPERSEDED.
- D-009 SQLite física reemplaza IndexedDB.
- D-017 gate E2E renderer→preload→IPC→SQLite.
- D-019 browser usa adaptador HTTP loopback cuando `window.todoDb` no existe.
- D-020 servicio DB escucha solo en `127.0.0.1:43127` y restringe CORS a localhost/127.0.0.1.
- D-021 Electron y servicio web comparten la misma ruta canónica de SQLite.
- D-022 CI prueba explícitamente UI servida por HTTP sin preload.
- D-023 servir la UI con Python/Live Server requiere que `npm run db-service` esté activo; `npm run web` inicia UI + DB service en un solo proceso.

## Feature HTTP + SQLite

Status: COMPLETED.

Commits funcionales:
- `fafb6db82bdd21d2a196334c9c2a46b9b5e6c8c4` — fallback browser + servicio local SQLite.
- `1f7791de642a25ad55a6605b6a67a926f18c6cb8` — smoke HTTP real + CI + documentación.

Validación GitHub Actions run `32327975959`: `completed / success`.

Gate verificado:
- unit/recurrence/SQLite/loopback service: success;
- Electron main + SQLite: success;
- Electron renderer + preload + IPC + SQLite: success;
- HTTP-served UI + loopback service + SQLite + CRUD + calendario renderizado: success.

## Reanudación

El scope de esta corrección está cerrado. Antes de integrar: verificar HEAD de `feature/physical-local-db`, abrir PR hacia `main` y esperar checks del PR. No mergear sin instrucción explícita.
