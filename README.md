# TodoApp

Gestor local de tareas con calendario y dashboard. La fuente de datos es una **SQLite física en disco** y no IndexedDB.

## Modos de uso

### Escritorio (Electron)

Requiere Node.js 24+:

```bash
npm install
npm start
```

### Navegador con un solo comando

```bash
npm run web
```

Abrir `http://127.0.0.1:8080`.

Este comando levanta la UI y el servicio local SQLite. Los datos siguen en el mismo archivo físico usado por Electron.

### Navegador servido con Python, VS Code Live Server u otro servidor

La UI puede servirse como quieras, pero un navegador no puede abrir directamente un archivo SQLite del sistema. Por eso debe existir un proceso local que sea dueño de la DB:

Terminal 1:

```bash
npm run db-service
```

Terminal 2, por ejemplo:

```bash
python3 -m http.server 8080
```

Luego abrir `http://localhost:8080`.

El origen/puerto del frontend puede cambiar; todos los modos usan el mismo servicio en `127.0.0.1:43127` y la misma SQLite física.

## Ubicación de la DB

La ruta es estable por usuario y no depende de URL, puerto, navegador ni directorio de trabajo:

- Windows: `%LOCALAPPDATA%/TodoApp/data/todoapp.sqlite3`
- macOS: `~/Library/Application Support/TodoApp/data/todoapp.sqlite3`
- Linux: `${XDG_DATA_HOME:-~/.local/share}/TodoApp/data/todoapp.sqlite3`

## Seguridad

El servicio de DB:
- escucha solo en `127.0.0.1`;
- acepta CORS únicamente desde `localhost` o `127.0.0.1`;
- no expone la DB a la red;
- mantiene schema versionado y constraints SQLite.

Electron conserva `contextIsolation: true`, `nodeIntegration: false` y `sandbox: true`.

## Tests

```bash
npm test
```

CI además ejecuta:
- Electron main + SQLite;
- renderer + preload + IPC + SQLite;
- **UI servida por HTTP sin preload** + servicio loopback + SQLite + CRUD + calendario renderizado.

El último test reproduce el caso de servir la app con `python -m http.server`.
