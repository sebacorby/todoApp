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
- Cada carpeta puede contener subcarpetas.
- Las carpetas pueden quedar vacías.
- `＋` dentro de una carpeta crea una subcarpeta.
- `✎` renombra y `×` elimina una carpeta vacía.
- Cada carpeta se puede abrir o colapsar.
- En una carga nueva todas arrancan cerradas; la última carpeta creada queda abierta.
- Las tarjetas son compactas, de dos líneas y bordes redondeados.
- Arrastrá tareas libremente entre `Sin categoría`, carpetas y subcarpetas.
- También podés soltar una tarea sobre el encabezado de una carpeta cerrada.
- El movimiento conserva el mismo `id` y persiste el nuevo grupo/orden en SQLite.
- El icono de ojo abre la tarea.
- Arrastrar una tarea al calendario conserva su `id`, toma fecha/hora del destino y la quita del backlog.

En vista mes el drop usa `09:00`; en día/semana usa la hora del slot. Una tarea recién agendada recibe 1 hora de duración.

## SQLite

Schema actual: **v3**.

- Windows: `%APPDATA%/TodoApp/data/todoapp.sqlite3`
- macOS: `~/Library/Application Support/TodoApp/data/todoapp.sqlite3`
- Linux: `${XDG_CONFIG_HOME:-~/.config}/TodoApp/data/todoapp.sqlite3`

## Tests

```bash
npm test
```

La feature `feature/backlog-ux-improvements` agrega un E2E que valida colapso/apertura, última carpeta creada abierta, tarjetas compactas y drag entre carpetas incluso cuando el destino está cerrado.
