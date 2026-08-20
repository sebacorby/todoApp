# TodoApp

Gestor local de tareas con calendario y dashboard, sin login ni backend.

## Funcionalidad

- Calendario oscuro con vistas mes, semana y día.
- Creación por `+` o haciendo click en una fecha/hora.
- Edición, eliminación y drag & drop conservando la duración.
- Estados: Sin iniciar, Iniciada, Pausada, Bloqueada y Completa.
- Criticidad Baja, Media, Alta y Urgente con colores globales configurables.
- Dashboard con resumen, búsqueda, filtros, histórico y cambio rápido de estado.
- Recurrencia diaria, semanal y mensual con fecha final opcional.
- Persistencia local mediante IndexedDB.

## Ejecutar

La app usa ES modules y debe servirse por HTTP. No requiere instalar dependencias.

Con Python:

```bash
python3 -m http.server 8080
```

Abrir `http://localhost:8080`.

También puede usarse cualquier servidor estático equivalente.

## Datos

Los datos quedan guardados en IndexedDB del navegador/dispositivo donde se ejecuta la app. No existe cuenta, sincronización remota ni backend.

## Desarrollo

El seguimiento único del proyecto está en `docs/MAIN_PLAN.md`.

La implementación activa está en `feature/todo-app-implementation`. No fusionar a `main` sin validación explícita.
