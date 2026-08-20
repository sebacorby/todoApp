# TodoApp — SSOT

Repo `sebacorby/todoApp`.

## Estado actual

- Base: `main` @ `fdb06ae30a31c547a82c83458a21da7777522e22`.
- Feature activa: `feature/backlog-categories`.
- Alcance: carpetas y subcarpetas jerárquicas dentro del backlog.
- HEAD funcional validado: `e8fea02fbfbb4f09f40a7afb8c632efd6b580665`.
- CI funcional: run `32362347423` → `completed / success`.
- No abrir ni mergear PR sin instrucción explícita.

## Reanudación

1. Leer este archivo.
2. Verificar el HEAD real de `feature/backlog-categories`.
3. Verificar el último CI del HEAD.
4. Continuar solo si existe trabajo explícitamente pedido.
5. Si se solicita integración, abrir PR hacia `main`; no mergear por inferencia.

## Arquitectura de persistencia

SQLite física local. Schema actual: **v3**.

Rutas:
- Windows: `%APPDATA%/TodoApp/data/todoapp.sqlite3`
- macOS: `~/Library/Application Support/TodoApp/data/todoapp.sqlite3`
- Linux: `${XDG_CONFIG_HOME:-~/.config}/TodoApp/data/todoapp.sqlite3`

Electron usa IPC; navegador usa servicio loopback en `127.0.0.1:43127`.

## Backlog jerárquico

Status: **COMPLETED / CI GREEN**.

### Modelo

Nueva tabla `backlog_groups`:
- `id`
- `name`
- `parent_id` nullable
- `group_order`
- `created_at`
- `updated_at`

`tasks` agrega `backlog_group_id` nullable.

Invariantes:
- una carpeta puede existir vacía;
- `parent_id` permite subcarpetas recursivas sin un límite funcional fijo;
- se impiden ciclos;
- no se elimina una carpeta con tareas o subcarpetas;
- una tarea agendada no puede conservar `backlog_group_id`;
- migración v2→v3 preserva todas las tareas existentes y las deja sin categoría.

### UI

- Sección raíz `Sin categoría`.
- Botón de carpeta para crear agrupadores raíz.
- Cada carpeta permite crear subcarpeta, renombrar y eliminar si está vacía.
- Carpetas vacías siguen visibles como destinos de drop.
- Las tareas pueden arrastrarse entre raíz, carpetas y subcarpetas.
- El orden de tareas se mantiene por grupo mediante `backlogOrder`.
- El mismo `id` de tarea se conserva al moverla.
- El icono de ojo sigue abriendo la tarea.
- Al arrastrar una tarea agrupada al calendario se limpian `backlogGroupId` y `backlogOrder`, y se asignan fecha/hora/duración como antes.

## Decisiones

- D-028: los agrupadores son entidad propia (`backlog_groups`), no copias de tareas.
- D-029: jerarquía mediante `parent_id`; carpetas vacías son válidas.
- D-030: pertenencia de tarea mediante `backlog_group_id` nullable.
- D-031: borrar grupos no vacíos está prohibido para evitar pérdida accidental.
- D-032: scheduling al calendario elimina pertenencia al backlog/grupo manteniendo identidad.

## Validación

Run `32362347423`: **success**.

El gate final valida:
- unitarios de grupos, ciclos y persistencia;
- migraciones SQLite hasta v3;
- HTTP loopback;
- Electron main;
- renderer + preload + IPC;
- creación de carpeta desde UI;
- creación de subcarpeta desde UI;
- carpeta vacía visible;
- drag real de una tarea desde raíz a subcarpeta;
- mismo `id` y `backlogGroupId` persistido en SQLite;
- drag posterior al calendario;
- `backlogGroupId=null`, `backlogOrder=null`, fecha/hora y duración 1h verificadas en SQLite.

## Commits clave

- `bff026cb89becf5f927da1a9d811fe4844b36b9f` — schema SQLite v3 y modelo jerárquico.
- `624719ff10251cee64949a2701015b863a9962ca` — tests iniciales de grupos.
- `6ec73d0dd3911f16757be4aaac22e5ffe5a20a73` — API web/loopback.
- `3adcbb7bce7be87afcc483a09e0a25ec709a68d2` — API Electron IPC.
- `69a52706c947eec3ee3ad8b5e5bcefdf4832ef2f` — orden de backlog consciente de grupo.
- `3f820291e55f0fce95ec3d0e89dd659276cf6fed` — UI jerárquica.
- `c0fa95b12585fb477a1f29d93e1930385d69244c` — estilos y tests de orden/scheduling.
- `e8fea02fbfbb4f09f40a7afb8c632efd6b580665` — E2E jerárquico completo.
