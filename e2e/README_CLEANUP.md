# E2E Test Cleanup via Supabase Admin API

## Setup

Para que la limpieza automática funcione, necesitas configurar las siguientes variables de entorno:

### Windows PowerShell

```powershell
# Configurar variables de entorno (solo para esta sesión)
$env:SUPABASE_URL="https://tu-proyecto.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key-aqui"
$env:E2E_BASE_URL="https://freedoliapp.vercel.app"

# Ejecutar tests
npx playwright test e2e/receipts.spec.ts --reporter=line
```

### Configuración permanente (opcional)

Crea un archivo `.env.e2e` en la raíz del proyecto (no se commitea):

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
E2E_BASE_URL=https://freedoliapp.vercel.app
```

Luego carga las variables antes de ejecutar:

```powershell
# Cargar variables desde .env.e2e (requiere módulo adicional o configuración manual)
Get-Content .env.e2e | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}
```

## Seguridad

- **Solo se eliminan gastos con referencia que empieza con "QA-E2E-"**
- El helper valida esto antes de eliminar
- Si intentas eliminar un gasto sin esta referencia, se lanzará un error

## Cómo obtener las credenciales

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Settings** > **API**
3. Copia:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (secret) → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **IMPORTANTE**: Nunca commitees el `SUPABASE_SERVICE_ROLE_KEY`. Tiene permisos de administrador.
