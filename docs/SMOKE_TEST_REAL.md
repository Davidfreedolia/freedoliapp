# Smoke Test Real - Freedoliapp

## Objectiu
Verificar que l'aplicació funciona correctament amb dades reals (demo mode OFF) i que no es barregen dades demo amb reals.

## Pre-requisits
- Demo mode ha d'estar **OFF** per defecte
- Usuari autenticat
- Accés a Supabase

## Test 1: Mode Real (Demo OFF)

### 1.1 Login
- [ ] Obrir aplicació
- [ ] Fer login amb credencials vàlides
- [ ] Verificar que es carrega el Dashboard

**Resultat esperat**: Login exitós, Dashboard carregat

### 1.2 Verificar Absència de Dades Demo
- [ ] Anar a **Projects**
- [ ] Verificar que **NO** apareixen projectes amb prefix "DEMO-" o "Demo"
- [ ] Anar a **Orders**
- [ ] Verificar que **NO** apareixen POs amb prefix "DEMO-" o "Demo"

**Resultat esperat**: Zero projectes/POs demo visibles

### 1.3 Crear Dades Reals
- [ ] Crear un projecte nou amb nom "REAL-TEST"
- [ ] Verificar que apareix a la llista de projectes
- [ ] Anar a **Orders** i crear una PO per aquest projecte
- [ ] Verificar que la PO apareix a la llista

**Resultat esperat**: Dades reals creades i visibles

### 1.4 Notes Global
- [ ] Clicar al botó **"+ Note"** al TopNavbar (esquerra)
- [ ] Crear una nota amb títol "Test Note Real"
- [ ] Tancar el modal
- [ ] Verificar que la nota apareix com post-it flotant
- [ ] Tancar la nota amb X
- [ ] Refresh de la pàgina
- [ ] Verificar que la nota **NO** reapareix (tancada correctament)

**Resultat esperat**: Notes funcionen, persisteixen i es poden tancar

### 1.5 Help Modal
- [ ] Clicar al botó **"Ajuda"** al TopNavbar (esquerra, al costat de Notes)
- [ ] Verificar que s'obre el modal d'ajuda
- [ ] Cercar "project" al camp de cerca
- [ ] Verificar que es filtren les seccions rellevants
- [ ] Tancar el modal

**Resultat esperat**: Help modal funciona, cerca funciona

### 1.6 Canvi d'Idioma
- [ ] Anar a **Settings**
- [ ] Canviar idioma a **English**
- [ ] Verificar que tots els textos canvien (inclòs Help modal si s'obre)
- [ ] Canviar a **Español**
- [ ] Verificar que tots els textos canvien
- [ ] Tornar a **Català**

**Resultat esperat**: Traduccions funcionen a tot arreu

### 1.7 Dark Mode
- [ ] Clicar al botó Dark Mode al TopNavbar (dreta)
- [ ] Verificar que tots els botons són llegibles (no transparents)
- [ ] Verificar que el contrast és adequat
- [ ] Tornar a Light Mode

**Resultat esperat**: Dark mode funciona, botons llegibles

### 1.8 Navbar
- [ ] Verificar que només hi ha **UNA** barra superior (TopNavbar)
- [ ] Verificar que **NO** hi ha línia separadora sota el navbar
- [ ] Verificar que només hi ha **UNA** icona Settings (no duplicats)
- [ ] Verificar layout: Notes i Ajuda a l'esquerra, Settings/Notifications/DarkMode/Logout a la dreta

**Resultat esperat**: Navbar net, sense duplicats, layout coherent

### 1.9 Logout
- [ ] Clicar Logout
- [ ] Verificar que es tanca sessió i es redirigeix a Login

**Resultat esperat**: Logout funciona

## Test 2: Mode Demo (Demo ON)

### 2.1 Activar Demo Mode
- [ ] Anar a **Settings** (o usar toggle al TopNavbar si està disponible)
- [ ] Activar **Demo Mode** (toggle ON)
- [ ] Verificar que apareix missatge de confirmació
- [ ] Refresh de la pàgina

**Resultat esperat**: Demo mode activat, pàgina recarregada

### 2.2 Verificar Dades Demo
- [ ] Anar a **Projects**
- [ ] Verificar que apareixen **NOMÉS** projectes amb prefix "DEMO-" o "Demo"
- [ ] Anar a **Orders**
- [ ] Verificar que apareixen **NOMÉS** POs amb prefix "DEMO-" o "Demo"
- [ ] Verificar que **NO** apareixen projectes/POs reals (ex: "REAL-TEST")

**Resultat esperat**: Només dades demo visibles, zero dades reals

### 2.3 Reset Demo Data
- [ ] Anar a **Settings**
- [ ] Clicar **"Reset Demo Data"** (si existeix)
- [ ] Verificar que es regeneren les dades demo
- [ ] Verificar que apareixen projectes/POs demo nous

**Resultat esperat**: Demo data es pot regenerar

### 2.4 Desactivar Demo Mode
- [ ] Desactivar **Demo Mode** (toggle OFF)
- [ ] Refresh de la pàgina
- [ ] Anar a **Projects**
- [ ] Verificar que **NO** apareixen projectes demo
- [ ] Verificar que apareixen projectes reals (ex: "REAL-TEST")

**Resultat esperat**: Demo mode desactivat, només dades reals visibles

## Test 3: Separació de Dades (Crític)

### 3.1 Crear Dades Reals amb Demo OFF
- [ ] Assegurar que Demo Mode està **OFF**
- [ ] Crear projecte "REAL-SEPARATION-TEST"
- [ ] Anotar l'ID del projecte

### 3.2 Activar Demo Mode
- [ ] Activar Demo Mode
- [ ] Refresh
- [ ] Anar a **Projects**
- [ ] Verificar que **NO** apareix "REAL-SEPARATION-TEST"

### 3.3 Crear Dades Demo
- [ ] Amb Demo Mode **ON**, crear projecte "DEMO-SEPARATION-TEST"
- [ ] Anotar l'ID del projecte demo

### 3.4 Desactivar Demo Mode
- [ ] Desactivar Demo Mode
- [ ] Refresh
- [ ] Anar a **Projects**
- [ ] Verificar que apareix "REAL-SEPARATION-TEST"
- [ ] Verificar que **NO** apareix "DEMO-SEPARATION-TEST"

**Resultat esperat**: Separació completa, zero barreja

## Checklist Final

- [ ] Tots els tests de Mode Real passen
- [ ] Tots els tests de Mode Demo passen
- [ ] Separació de dades verificada (zero barreja)
- [ ] Navbar net (una sola barra, sense duplicats)
- [ ] Notes només al TopNavbar
- [ ] Help modal funciona
- [ ] Traduccions funcionen
- [ ] Dark mode funciona
- [ ] Demo mode toggle funciona

## Notes
- Si algun test falla, documentar el comportament observat
- Verificar consola del navegador per errors
- Verificar que no hi ha warnings crítics




