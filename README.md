# TodoApp

Gestor local de tareas con calendario y dashboard, sin login ni backend.

## Funcionalidad

- Calendario dark-only con vistas mes, semana y día.
- Creación desde `+` o haciendo click en una fecha/hora.
- Edición, eliminación y drag & drop conservando la duración.
- Estados: Sin iniciar, Iniciada, Pausada, Bloqueada y Completa.
- Criticidad Baja, Media, Alta y Urgente con colores globales configurables.
- Dashboard con resumen, búsqueda, filtros, histórico y cambio rápido de estado.
- Recurrencia diaria, semanal y mensual con fecha final opcional.
- Persistencia local mediante IndexedDB.

## Ejecutar

La app usa ES modules y debe servirse por HTTP. No requiere instalar dependencias de runtime.

Con Python:

```bash
python3 -m http.server 8080
```

Luego abrir `http://localhost:8080`.

## Tests

Requiere Node.js 20 o superior:

```bash
npm test
```

La suite verifica:
- sintaxis de todos los módulos JavaScript de `src/`;
- tareas no recurrentes;
- recurrencia diaria;
- recurrencia semanal;
- recurrencia mensual y fin de mes;
- febrero en año bisiesto;
- fecha final de recurrencia;
- conservación de duración.

GitHub Actions ejecuta la misma suite en cada push a la feature branch y en cada pull request hacia `main`.

## Datos

Los datos quedan guardados en IndexedDB del navegador/dispositivo. No existe cuenta, sincronización remota ni backend.

## Desarrollo

El SSOT vive en `docs/MAIN_PLAN.md`. La implementación activa está en `feature/todo-app-implementation`.
