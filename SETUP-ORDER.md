# Orden de Ejecución de Scripts SQL

## Sticky Notes + Tasks Integration

Para implementar la integración completa de Sticky Notes con Tasks, ejecuta los scripts en este orden:

### 1. Primero: Crear tabla tasks (si no existe)
**Archivo:** `tasks-setup.sql`

Este script crea la tabla `tasks` con:
- Estructura completa de tasks
- RLS policies (ahora idempotentes ✅)
- Triggers y automatizaciones

**⚠️ IMPORTANTE:** Este script es ahora idempotente (se puede ejecutar múltiples veces sin errores).

### 2. Segundo: Crear tabla sticky_notes
**Archivo:** `sticky-notes-setup.sql`

Este script crea la tabla base `sticky_notes` con los campos iniciales:
- id, user_id, title, content
- status, pinned, color
- created_at, updated_at
- RLS policies e índices

**Ejecutar después de tasks-setup.sql (si tasks no existe) o antes del script de integración.**

### 3. Tercero: Agregar campos de integración
**Archivo:** `sticky-notes-tasks-integration.sql`

Este script agrega los campos adicionales para la integración con tasks:
- linked_task_id (FK a tasks)
- converted_to_task_at
- due_date
- priority
- source (en tabla tasks)

**⚠️ REQUIERE:** Que existan ambas tablas `tasks` y `sticky_notes`.

---

## Scripts Relacionados

Si la tabla `tasks` no existe, también necesitas ejecutar:
- `tasks-setup.sql` - Crea la tabla tasks con todas sus funcionalidades

---

## Resumen del Orden

1. ✅ `tasks-setup.sql` (crear tabla tasks - ahora idempotente ✅)
2. ✅ `sticky-notes-setup.sql` (crear tabla sticky_notes)
3. ✅ `sticky-notes-tasks-integration.sql` (agregar campos de integración)

**Nota:** Si alguna tabla ya existe, los scripts son idempotentes y se pueden ejecutar de nuevo sin problemas (excepto `sticky-notes-tasks-integration.sql` que requiere que ambas tablas existan).

---

## Verificación

Después de ejecutar los scripts, verifica que las tablas existen:

```sql
-- Verificar que sticky_notes existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sticky_notes';

-- Verificar campos de integración
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'sticky_notes' 
AND column_name IN ('linked_task_id', 'converted_to_task_at', 'due_date', 'priority');
```

