# TodoApp — SSOT

Repo `sebacorby/todoApp`.

## Estado actual

- Base: `main` @ `ace383cb6628e48137c463826f9a2a5e88b2c018`.
- Feature activa: `feature/backlog-ux-improvements`.
- Alcance: mejoras de UX del backlog jerárquico.
- HEAD funcional validado: `9fab5c42f8f332f6b35470ed7c3848352ce914c2`.
- CI funcional: run `32366587839` → `completed / success`.
- No abrir ni mergear PR sin instrucción explícita.

## Reanudación

1. Leer este archivo.
2. Verificar el HEAD real de `feature/backlog-ux-improvements`.
3. Verificar el último run de `Backlog UX`.
4. Si se solicita integración, abrir PR hacia `main`; no mergear por inferencia.

## Persistencia

SQLite física local, schema **v3**. Esta feature no cambia el schema.

- Windows: `%APPDATA%/TodoApp/data/todoapp.sqlite3`
- macOS: `~/Library/Application Support/TodoApp/data/todoapp.sqlite3`
- Linux: `${XDG_CONFIG_HOME:-~/.config}/TodoApp/data/todoapp.sqlite3`

Electron usa IPC; navegador usa servicio loopback en `127.0.0.1:43127`.

## Backlog UX

Status: **COMPLETED / CI GREEN**.

### Tarjetas

- Tarjeta compacta de hasta `270px` en escritorio.
- Dos líneas de contenido: título y descripción.
- Bordes curvos (`15px`).
- Conserva grip de drag, color de criticidad e icono de ojo.

### Carpetas colapsables

- Toda carpeta tiene control abrir/cerrar.
- En una carga nueva todas las carpetas aparecen cerradas.
- Al crear una carpeta, se cierra el resto y queda abierta la recién creada.
- Si la nueva carpeta es una subcarpeta, también se abren sus ancestros para que quede visible.
- El estado abierto/cerrado es de sesión/UI; al recargar vuelve al default cerrado.

### Movimiento libre

- Una tarea puede moverse entre cualquier carpeta/subcarpeta.
- Puede volver a `Sin categoría`.
- Una carpeta cerrada sigue siendo un destino válido: se puede soltar la tarjeta sobre su encabezado.
- El movimiento conserva el mismo `id`.
- `backlogGroupId` y `backlogOrder` se actualizan y persisten en SQLite.
- El drag al calendario continúa limpiando pertenencia al backlog como antes.

## Validación

Run `32366587839`: **success**.

El E2E `electron/backlog-ux-smoke.js` valida:
- primera carpeta recién creada abierta;
- después de recargar, carpeta cerrada por defecto;
- al crear una segunda carpeta, la anterior queda cerrada y la nueva abierta;
- cerrar y reabrir manualmente;
- tarjeta ≤270px, dos líneas y radio ≥12px;
- mover una tarea desde una carpeta abierta hacia otra carpeta cerrada;
- verificar el nuevo `backlogGroupId` en SQLite;
- abrir destino y mover la misma tarea a `Sin categoría`;
- verificar `backlogGroupId=null` y mismo `id`.

## Commits clave

- `ddc9698867968e73403ed8e9ba9a96db61f4e2f1` — carpetas colapsables y drop sobre carpetas cerradas.
- `aaa7c8550f4b7f7435a9098d03ff6b3cf449ac53` — tarjetas compactas de dos líneas.
- `642dfcb363062a912b9961a837d201fc50631129` — E2E de UX.
- `9fab5c42f8f332f6b35470ed7c3848352ce914c2` — workflow de validación de la feature.
