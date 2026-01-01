# Production Smoke Test Checklist

**Objetivo**: Validar rápidamente (1 minuto) que la aplicación funciona correctamente después de un deploy a producción.

**Cuándo ejecutar**: Después de cada deploy a producción, antes de anunciar la actualización.

---

## ✅ Checklist Rápido (1 minuto)

### 1. Autenticación
- [ ] **Login**: Acceder con credenciales válidas
  - [ ] El formulario de login se muestra correctamente
  - [ ] Login exitoso redirige al dashboard
  - [ ] No hay errores en consola

- [ ] **Logout**: Cerrar sesión
  - [ ] Botón de logout funciona
  - [ ] Redirige a `/login`
  - [ ] No se puede acceder a rutas protegidas sin login

---

### 2. Dashboard
- [ ] **Carga inicial**
  - [ ] Dashboard carga sin pantalla blanca
  - [ ] No hay errores críticos en consola
  - [ ] Los widgets principales se renderizan

- [ ] **Widgets visibles** (al menos 3 deben estar visibles)
  - [ ] Orders In Progress
  - [ ] Financial Chart
  - [ ] POs Not Ready (si hay datos)
  - [ ] Sticky Notes (si está habilitado)

---

### 3. Projects
- [ ] **Lista de proyectos**
  - [ ] La página `/projects` carga correctamente
  - [ ] Se muestran proyectos (o mensaje "No projects")
  - [ ] No hay errores en consola

- [ ] **Detalle de proyecto**
  - [ ] Click en un proyecto abre `/projects/:id`
  - [ ] Se muestran las pestañas (Research, Production, etc.)
  - [ ] Profitability Calculator se renderiza
  - [ ] No hay errores al cambiar de pestaña

---

### 4. Orders
- [ ] **Lista de órdenes**
  - [ ] La página `/orders` carga correctamente
  - [ ] Se muestran POs (o mensaje "No orders")
  - [ ] Filtros funcionan (status, supplier, etc.)

- [ ] **Detalle de PO**
  - [ ] Click en un PO abre el detalle
  - [ ] Se muestran todos los campos principales
  - [ ] Amazon Ready Section se renderiza (si aplica)
  - [ ] No hay errores al guardar cambios

---

### 5. Finances
- [ ] **Lista de transacciones**
  - [ ] La página `/finances` carga correctamente
  - [ ] Se muestran expenses e incomes (o mensajes vacíos)
  - [ ] Filtros por categoría funcionan

- [ ] **Agregar expense de prueba**
  - [ ] Botón "Add Expense" abre modal
  - [ ] Formulario se completa correctamente
  - [ ] Guardar crea el expense
  - [ ] El expense aparece en la lista
  - [ ] **IMPORTANTE**: Eliminar el expense de prueba después

---

### 6. Settings
- [ ] **Página de configuración**
  - [ ] La página `/settings` carga correctamente
  - [ ] Se muestran las secciones principales:
    - [ ] Company Settings
    - [ ] User Signature
    - [ ] Google Drive Status
  - [ ] No hay errores en consola

---

### 7. Google Drive Integration
- [ ] **Estado de Drive**
  - [ ] Drive Status se muestra en Settings
  - [ ] Si está desconectado: muestra "Disconnected" (no error)
  - [ ] Si está conectado: muestra nombre de usuario
  - [ ] Botón "Connect" funciona (si está desconectado)
  - [ ] Botón "Disconnect" funciona (si está conectado)

---

## 🚨 Errores Críticos a Verificar

### Consola del Navegador (F12)
- [ ] **No hay errores rojos** en la consola
- [ ] **No hay 404** para recursos estáticos (JS, CSS, imágenes)
- [ ] **No hay errores de autenticación** (401, 403)
- [ ] **No hay errores de red** (500, 502, 503)

### Rendimiento
- [ ] **Carga inicial** < 3 segundos
- [ ] **Navegación entre páginas** < 1 segundo
- [ ] **No hay memory leaks** (verificar con DevTools > Performance)

---

## 📝 Notas Post-Deploy

**Fecha del deploy**: _______________

**Versión/Commit**: _______________

**Ejecutado por**: _______________

**Resultado**: 
- [ ] ✅ Todo OK - Producción estable
- [ ] ⚠️ Problemas menores (especificar abajo)
- [ ] ❌ Problemas críticos (rollback necesario)

**Problemas encontrados**:
```
[Describir cualquier problema encontrado]
```

**Acciones tomadas**:
```
[Describir acciones correctivas]
```

---

## 🔄 Rollback Checklist (si es necesario)

Si se encuentran problemas críticos:

1. [ ] Identificar el commit problemático
2. [ ] Revertir al commit anterior estable
3. [ ] Ejecutar `npm run build` localmente para verificar
4. [ ] Desplegar versión anterior
5. [ ] Ejecutar smoke test de nuevo
6. [ ] Documentar el problema en el issue tracker

---

## 💡 Tips

- **Usar modo incógnito** para evitar cache del navegador
- **Limpiar localStorage** si hay problemas de autenticación
- **Verificar en múltiples navegadores** (Chrome, Firefox, Safari)
- **Probar en mobile** si es relevante para tu audiencia
- **Monitorear logs de Supabase** durante el test

---

**Última actualización**: 2026-01-01

