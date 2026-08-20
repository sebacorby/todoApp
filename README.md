# TodoApp

Gestor local de tareas con calendario, dashboard y backlog. La fuente de datos es una **SQLite física en disco**.

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

### Navegador servido con Python, Live Server u otro servidor

Terminal 1:

```bash
npm run db-service
```

Terminal 2, por ejemplo:

```bash
python3 -m http.server 8080
```

Luego abrir `http://localhost:8080`.

## Backlog

A la derecha del calendario aparece `Backlog / Sin fecha`.

- `+` crea una tarea sin fecha.
- El icono de ojo abre la tarea.
- Las tarjetas se reordenan arrastrándolas.
- El orden queda persistido en SQLite.
- Al arrastrar una tarjeta al calendario, la tarea toma automáticamente la fecha y hora del lugar donde se suelta.
- En vista mes se usa `09:00`; en día/semana se usa la hora del slot.
- Una tarea recién agendada desde backlog recibe 1 hora de duración.
- La tarea conserva su mismo `id` y deja de aparecer en backlog.
- Las tareas sin fecha no son recurrentes hasta ser agendadas.

## Ubicación de la DB

- Windows: `%APPDATA%/TodoApp/data/todoapp.sqlite3`
- macOS: `~/Library/Application Support/TodoApp/data/todoapp.sqlite3`
- Linux: `${XDG_CONFIG_HOME:-~/.config}/TodoApp/data/todoapp.sqlite3`

La ruta no depende de URL, puerto, navegador ni directorio desde el que se sirve la UI.

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

CI ejecuta además:
- Electron main + SQLite;
- renderer + preload + IPC + SQLite;
- UI HTTP sin preload + servicio loopback + SQLite;
- E2E de backlog: crea tarea sin fecha, valida tarjeta/ícono ojo, ejecuta drag & drop a un slot y comprueba fecha, hora, duración y salida del backlog directamente desde SQLite.
