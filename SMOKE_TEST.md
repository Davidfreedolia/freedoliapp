# Production Smoke Test Checklist

**Objetivo**: Detectar "showstoppers" rápidamente después de cada deploy a producción.

**Cuándo ejecutar**: Inmediatamente después de cada deploy, antes de anunciar la actualización.

---

## 🚀 Smoke 60s (Must-Pass)

**Tiempo estimado**: 60-90 segundos  
**Criterio**: Todos los checks deben pasar. Si alguno falla, considerar rollback.

### 1. Consola del Navegador (F12)
- [ ] **No hay errores rojos** en la consola
- [ ] **No hay 404** para recursos estáticos (JS, CSS)
- [ ] **No hay chunk-load errors** (verificar Network tab para assets)
- [ ] **No hay errores de autenticación** (401, 403)

### 2. Autenticación
- [ ] **Login**: Acceder con credenciales válidas
  - [ ] Login exitoso redirige al dashboard
  - [ ] No hay errores en consola durante login

- [ ] **Logout**: Cerrar sesión
  - [ ] Redirige a `/login`
  - [ ] No se puede acceder a rutas protegidas sin login

### 3. Dashboard
- [ ] **Carga inicial**
  - [ ] Dashboard carga sin pantalla blanca (< 3 segundos)
  - [ ] Dashboard renderiza y al menos 1 widget no falla
  - [ ] No hay errores críticos en consola

### 4. Navegación Core
- [ ] **Projects**: `/projects` carga correctamente (lista o "No projects")
- [ ] **Orders**: `/orders` carga correctamente (lista o "No orders")
- [ ] **Finances**: `/finances` carga correctamente
- [ ] **Settings**: `/settings` carga correctamente

### 5. Supabase Reachable
- [ ] **Conexión a Supabase**: 
  - [ ] Si Supabase está caído, se muestra UI de error recuperable (no pantalla blanca)
  - [ ] Si hay error de red, se muestra mensaje claro al usuario
  - [ ] Verificar en Network tab: requests a Supabase no fallan con 500/502/503

---

## ✅ Smoke 2min (Nice-to-Have)

**Tiempo estimado**: 2 minutos  
**Criterio**: Verificaciones adicionales para mayor confianza.

### 1. Funcionalidad Básica
- [ ] **Projects**: Click en un proyecto abre `/projects/:id` y se renderiza
- [ ] **Orders**: Click en un PO muestra el detalle
- [ ] **Finances**: Agregar expense de prueba funciona
  - [ ] **IMPORTANTE**: Eliminar el expense de prueba después

### 2. Google Drive Integration
- [ ] **Drive Status**: Se muestra en Settings (conectado o desconectado)
- [ ] **Estado correcto**: Si desconectado, muestra "Disconnected" (no error)
- [ ] **Botones funcionan**: Connect/Disconnect responden correctamente

### 3. Rendimiento Básico
- [ ] **Carga inicial** < 3 segundos
- [ ] **Navegación entre páginas** < 1 segundo
- [ ] **No hay errores de red** (500, 502, 503) en Network tab

---

## 📊 Resultados del Smoke Test

**Fecha del deploy**: _______________

**Commit SHA**: _______________

**Deploy URL**: _______________

**Ejecutado por**: _______________

**Resultado**: 
- [ ] ✅ **PASS** - Producción estable
- [ ] ❌ **FAIL** - Rollback necesario

**Si FAIL**:
- **Link al log Vercel**: _______________
- **Screenshot del error**: _______________
- **Descripción del problema**: 
```
[Describir el problema encontrado]
```

**Acciones tomadas**:
```
[Describir acciones correctivas o rollback]
```

---

## 🔄 Rollback Checklist

Si el smoke test falla:

1. [ ] Identificar el commit problemático (SHA arriba)
2. [ ] Revertir al commit anterior estable
3. [ ] Ejecutar `npm run build` localmente para verificar
4. [ ] Desplegar versión anterior: `vercel --prod`
5. [ ] Ejecutar smoke test de nuevo
6. [ ] Documentar el problema en el issue tracker

---

## 🔬 Extended QA (Optional)

**Cuándo ejecutar**: Antes de releases importantes, o cuando hay tiempo disponible.

### Performance Profiling
- [ ] **Memory leaks**: Verificar con DevTools > Performance (grabar 2-3 minutos de uso)
- [ ] **Bundle size**: Verificar que no haya aumentado significativamente
- [ ] **Lighthouse score**: Ejecutar Lighthouse y verificar métricas

### Cross-Browser Testing
- [ ] **Chrome**: Funcionalidad completa
- [ ] **Firefox**: Funcionalidad completa
- [ ] **Safari**: Funcionalidad completa (si aplica)
- [ ] **Mobile**: Probar en dispositivo móvil (si aplica)

### Monitoreo
- [ ] **Logs de Supabase**: Revisar logs durante el test
- [ ] **Logs de Vercel**: Revisar logs de runtime en Vercel Dashboard
- [ ] **Error tracking**: Verificar que no hay errores en producción

---

## 💡 Tips Rápidos

- **Usar modo incógnito** para evitar cache del navegador
- **Limpiar localStorage** si hay problemas de autenticación: `localStorage.clear()`
- **Network tab**: Verificar que todos los chunks se cargan (no 404)
- **Console tab**: Filtrar por "Error" para ver solo errores críticos

---

**Última actualización**: 2026-01-01
