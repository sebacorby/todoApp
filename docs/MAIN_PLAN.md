# TodoApp — SSOT

Repo `sebacorby/todoApp`.

## Estado

El MVP base y la persistencia SQLite fueron mergeados a `main`. La corrección actual vive en `feature/physical-local-db`.

## Requisito vigente

La persistencia debe ser una SQLite física local y no depender del navegador, URL, puerto ni servidor que sirve la UI.

Un navegador puro no puede abrir arbitrariamente un archivo SQLite del sistema. La arquitectura por lo tanto separa:

1. UI: puede correr en Electron o ser servida por cualquier HTTP local.
2. DB owner: proceso local loopback en `127.0.0.1:43127`.
3. SQLite física: ruta estable por usuario.

Electron usa IPC directo. Browser usa HTTP loopback. Ambos apuntan al mismo archivo.

## Ruta canónica

- Windows: `%LOCALAPPDATA%/TodoApp/data/todoapp.sqlite3`
- macOS: `~/Library/Application Support/TodoApp/data/todoapp.sqlite3`
- Linux: `${XDG_DATA_HOME:-~/.local/share}/TodoApp/data/todoapp.sqlite3`

## Decisiones

- D-001 IndexedDB: SUPERSEDED.
- D-009 SQLite física reemplaza IndexedDB.
- D-017 gate E2E renderer→preload→IPC→SQLite.
- D-019 browser usa adaptador HTTP loopback cuando `window.todoDb` no existe.
- D-020 servicio DB escucha solo en `127.0.0.1:43127` y restringe CORS a localhost/127.0.0.1.
- D-021 Electron y servicio web comparten la misma ruta canónica de SQLite.
- D-022 CI debe probar explícitamente UI servida por HTTP sin preload.

## Feature HTTP + SQLite

Status: IMPLEMENTING.

Entregables:
- `service/local-db-service.js`
- `service/web.js`
- fallback HTTP en `src/db.js`
- ruta canónica compartida
- tests unitarios del servicio
- smoke HTTP real con calendario renderizado y CRUD
- README actualizado

Criterio de cierre: `npm test`, smoke Electron IPC y smoke HTTP browser-style en `success` dentro de GitHub Actions.
