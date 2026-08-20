# TodoApp

Gestor local de tareas con calendario, dashboard y backlog jerárquico. Los datos viven en una **SQLite física en disco**.

## Ejecutar

Escritorio:

```bash
npm install
npm start
```

Navegador:

```bash
npm run web
```

Abrir `http://127.0.0.1:8080`.

## Backlog con carpetas

A la derecha del calendario está `Backlog / Sin fecha`.

- `+` crea tareas sin fecha.
- El botón de carpeta crea una carpeta raíz.
- Cada carpeta puede contener tantas subcarpetas como necesites.
- Las carpetas pueden quedar vacías para recibir tareas más adelante.
- `＋` dentro de una carpeta crea una subcarpeta.
- `✎` renombra una carpeta.
- `×` elimina una carpeta únicamente cuando está vacía.
- Arrastrá tarjetas entre `Sin categoría`, carpetas y subcarpetas.
- El orden se persiste por carpeta en SQLite.
- El icono de ojo abre la tarea.
- Arrastrar una tarea agrupada al calendario conserva su `id`, toma fecha/hora del destino y la quita del backlog.

En vista mes el drop usa `09:00`; en día/semana usa la hora del slot. Una tarea recién agendada recibe 1 hora de duración.

## SQLite

Schema actual: **v3**. Las bases anteriores migran automáticamente sin perder tareas.

Ubicación:
- Windows: `%APPDATA%/TodoApp/data/todoapp.sqlite3`
- macOS: `~/Library/Application Support/TodoApp/data/todoapp.sqlite3`
- Linux: `${XDG_CONFIG_HOME:-~/.config}/TodoApp/data/todoapp.sqlite3`

## Tests

```bash
npm test
```

CI también valida Electron, IPC, HTTP loopback y un E2E real que crea carpeta/subcarpeta desde la UI, mueve una tarea por drag & drop y luego la agenda en el calendario verificando el resultado directamente en SQLite.
