# TodoApp

Gestor de tareas de escritorio, dark-only y sin login. Los datos se guardan en una base **SQLite física en disco**: no dependen de navegador, URL, puerto ni servidor local.

## Ejecutar

Requiere Node.js 24+:

```bash
npm install
npm start
```

## Base de datos

TodoApp usa SQLite mediante `node:sqlite`. El archivo vive en:

```text
<Electron userData>/data/todoapp.sqlite3
```

Cerrar la app, reiniciar la PC o cambiar el directorio desde el que se inicia no cambia la base. La UI no accede al filesystem directamente: un preload aislado expone únicamente operaciones de tareas/settings por IPC.

## Tests

```bash
npm test
```

La batería cubre sintaxis, recurrencias y persistencia física: archivo SQLite real, firma, schema/versionado, CRUD, cierre/reapertura, settings, constraints y validaciones.

CI agrega un smoke test del runtime real:

```bash
npm run smoke
```

Ese smoke inicia Electron, abre la misma capa `node:sqlite`, valida schema y cierra sin crear la UI.

## Desarrollo

SSOT: `docs/MAIN_PLAN.md`. Feature: `feature/physical-local-db`, basada en `main`.
