# TodoApp — Main Plan & SSOT

> **Single Source of Truth (SSOT)** for product scope, architecture, implementation stages, decisions and delivery status.
>
> Repository: `sebacorby/todoApp`  
> Target branch: `main`  
> Delivery model: one implementation stage per commit.  
> Last updated: 2026-08-19.

## 1. Product goal

Build a local-first task management app with a polished, minimal, professional **dark-only** UI. The core experience combines a Google Calendar-style scheduler with a task dashboard.

The app must work without login or remote backend. Data is persisted locally in the browser.

## 2. Functional scope

### Calendar
- Month, week and day views.
- Free navigation to past and future dates without artificial limits.
- Click a date/time slot to create a task.
- Creation modal receives the clicked date/time pre-filled but still editable.
- Drag & drop tasks freely across dates/times.
- Resize scheduled task duration where the calendar view supports it.
- Click an existing task to edit it.

### Global create action
- A well-positioned `+` action opens the same task modal.
- When opened from `+`, date and time are explicit editable inputs rather than values inferred from the calendar.

### Dashboard
- List all tasks with search and filters.
- Summary counts for actionable states.
- Filter by task state and criticality.
- Historical completed tasks remain available and editable/reactivatable.

### Task states
Exactly five task states:
1. **Sin iniciar** (`not_started`)
2. **Iniciada** (`started`)
3. **Pausada** (`paused`)
4. **Bloqueada** (`blocked`)
5. **Completa** (`completed`)

Expected transitions:
- New task → `not_started`
- `not_started` → `started`
- `started` → `paused` | `blocked` | `completed`
- `paused` | `blocked` → `started`
- `completed` → reactivated as `not_started`

The UI may expose direct editing of the state, but these transitions define the quick actions.

### Criticality
Exactly four criticalities:
- Baja (`low`)
- Media (`medium`)
- Alta (`high`)
- Urgente (`urgent`)

Each criticality has a globally configurable color.

--

THIS PASTE IS TRUNCATED INTENTIONALLY