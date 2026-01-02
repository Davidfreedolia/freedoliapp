# Guia de Proves: Integració Robusta Google Drive

Aquesta guia explica com provar que la integració amb Google Drive funciona correctament i és robusta.

---

## 📋 Prerequisits

- ✅ Aplicació en execució (`npm run dev`)
- ✅ Usuari autenticat a Supabase
- ✅ Google Drive connectat (botó "Connectar a Drive")
- ✅ Almenys un projecte creat

---

## 🧪 Proves Manuals

### 1. Token Caducat

**Objectiu**: Verificar que el sistema detecta tokens expirats i mostra errors clars.

**Pas a pas**:
1. Connecta't a Google Drive (botó a la barra superior)
2. Obre DevTools (F12) > Console
3. Al localStorage, modifica `gdrive_token_time` a un valor molt antic:
   ```javascript
   localStorage.setItem('gdrive_token_time', '0') // Força expiració
   ```
4. Tanca i torna a obrir la consola (per netejar cache)
5. Intenta crear un nou projecte o pujar un fitxer

**Resultat esperat**:
- ✅ Apareix alert: "Reconnecta Google Drive. La sessió ha expirat."
- ✅ No es crea el projecte/fitxer si falla autenticació
- ✅ A la consola, veus log estructurat: `[Drive Error] { context: 'verifyToken', error: '...', ... }`

**Com provar reconnexió**:
- Clica de nou "Connectar a Drive"
- Accepta permisos
- Torna a intentar l'operació
- ✅ Hauria de funcionar correctament

---

### 2. Reconnectar Google Drive

**Objectiu**: Verificar que el botó de reconnexió funciona correctament.

**Pas a pas**:
1. Si no estàs connectat, clica "Connectar a Drive"
2. Si ja estàs connectat, primer desconnecta't:
   - Obre DevTools > Console
   - Executa: `localStorage.removeItem('gdrive_token')`
   - Refresca la pàgina
3. Clica "Connectar a Drive" de nou
4. Accepta els permisos a la finestra de Google

**Resultat esperat**:
- ✅ El botó canvia a "Connectat"
- ✅ Al localStorage apareixen `gdrive_token` i `gdrive_token_time`
- ✅ Pots crear projectes i pujar fitxers

---

### 3. Crear Projecte amb Carpetes (Idempotència)

**Objectiu**: Verificar que NO es creen carpetes duplicades.

**Pas a pas**:

**3a. Crear projecte nou**:
1. Crea un nou projecte amb nom "Test Project"
2. Connecta't a Drive abans si no ho estàs
3. Observa a la consola (opcional): hauria de mostrar logs de creació de carpetes
4. Anota el `project_code` del projecte creat (ex: `PR-FRDL250001`)

**Resultat esperat**:
- ✅ Es crea el projecte a Supabase
- ✅ Es creen carpetes a Drive: `FRDL250001_Test Project/` dins `Projects/`
- ✅ Es creen subcarpetes (01_Research, 02_Quotations, etc.)
- ✅ El projecte té `drive_folder_id` guardat a Supabase

**3b. Verificar idempotència - NO recrear carpetes**:
1. Obre el mateix projecte creat anteriorment (clica sobre ell)
2. Observa la consola (F12)
3. Verifica que NO apareixen errors ni intents de crear noves carpetes

**Resultat esperat**:
- ✅ NO es creen noves carpetes a Drive
- ✅ Es reutilitza la carpeta existent
- ✅ No apareixen errors a la consola
- ✅ Les subcarpetes es carreguen correctament

**3c. Verificar reutilització de carpeta existent**:
1. Anota el `drive_folder_id` del projecte creat
2. Elimina aquest `drive_folder_id` manualment a Supabase (o mitjançant SQL):
   ```sql
   UPDATE projects SET drive_folder_id = NULL WHERE id = '<project-id>';
   ```
3. Torna a obrir el projecte a l'aplicació
4. Observa la consola

**Resultat esperat**:
- ✅ Busca la carpeta existent per nom a Drive
- ✅ Si la troba, la reutilitza i actualitza `drive_folder_id`
- ✅ Si NO la troba, crea noves carpetes
- ✅ NO es creen duplicats

---

### 4. Reentrar a Projecte i Verificar que NO Recrea Carpetes

**Objectiu**: Verificar que cada vegada que obrim un projecte no es recreen carpetes.

**Pas a pas**:
1. Crea un projecte nou (o usa un existent amb `drive_folder_id`)
2. Tanca la pàgina del projecte (torna al Dashboard)
3. Torna a obrir el projecte (clica sobre ell)
4. Repeteix 2-3 vegades
5. Obre Google Drive manualment i compta les carpetes del projecte

**Resultat esperat**:
- ✅ Només hi ha UNA carpeta principal del projecte a Drive
- ✅ Només hi ha UNA vegada cada subcarpeta (01_Research, 02_Quotations, etc.)
- ✅ A la consola NO apareixen errors de duplicació
- ✅ El `drive_folder_id` es manté constant

**Com verificar a Drive**:
1. Obre https://drive.google.com
2. Vés a la carpeta "Projects"
3. Compta quantes carpetes hi ha amb el nom del projecte (hauria de ser 1)
4. Dins la carpeta del projecte, compta les subcarpetes (hauria de ser 10)

---

### 5. Pujar Document i Verificar Registre Supabase

**Objectiu**: Verificar que els uploads es guarden correctament i no es creen duplicats.

**Pas a pas**:

**5a. Pujar document correctament**:
1. Obre un projecte
2. Connecta't a Drive si no ho estàs
3. Puja un fitxer (drag & drop o clic)
4. Observa que el fitxer apareix a la llista de documents

**Resultat esperat**:
- ✅ El fitxer es puja a Drive correctament
- ✅ Apareix un missatge de "Completat" després de pujar
- ✅ El document apareix a la llista de documents del projecte
- ✅ A Supabase (`documents` table) hi ha un registre amb:
   - `project_id` correcte
   - `name` = nom del fitxer
   - `drive_file_id` = ID del fitxer a Drive
   - `file_url` = URL del fitxer a Drive
   - `user_id` = ID de l'usuari autenticat

**5b. Verificar que NO es creen duplicats**:
1. Puja el MATEIX fitxer una segona vegada (mateix nom)
2. Observa la consola

**Resultat esperat**:
- ✅ NO es crea un segon registre a Supabase
- ✅ Es reutilitza el registre existent (o s'actualitza si cal)
- ✅ A la consola NO apareixen errors de duplicació
- ✅ A Drive només hi ha UNA còpia del fitxer

**5c. Pujar fitxer amb error simulat**:
1. Puja un fitxer més gran de 10MB (si en tens un)
2. O introdueix un error manualment (ex: desconnecta't de Drive just abans)

**Resultat esperat**:
- ✅ Apareix error clar: "Fitxer massa gran" o "Error pujant..."
- ✅ NO es crea registre a Supabase si l'upload falla
- ✅ El fitxer NO apareix a la llista de documents

**5d. Verificar registres a Supabase**:
```sql
-- Consultar documents d'un projecte
SELECT id, name, drive_file_id, file_url, created_at 
FROM documents 
WHERE project_id = '<project-id>'
ORDER BY created_at DESC;
```

**Resultat esperat**:
- ✅ Cada document té `drive_file_id` únic
- ✅ No hi ha duplicats (mateix `drive_file_id` o mateix `name` + `project_id`)
- ✅ Tots els documents tenen `user_id` (gràcies a RLS)

---

## ✅ Checklist de Validació

Després de fer totes les proves, verifica:

### Idempotència de Carpetes
- [ ] Crear projecte nou crea carpetes UNA vegada
- [ ] Obrir projecte existent NO recrea carpetes
- [ ] Projecte sense `drive_folder_id` reutilitza carpeta existent si existeix
- [ ] No hi ha carpetes duplicades a Drive

### Gestió de Tokens
- [ ] Token expirat mostra alert clar: "Reconnecta Google Drive"
- [ ] Token expirat no permet operacions (no falla en silenci)
- [ ] Reconnexió funciona correctament
- [ ] Token es guarda correctament a localStorage (amb timestamp)

### Errors Visibles
- [ ] Tots els errors Drive es mostren a l'usuari (alert o console)
- [ ] Errors a la consola tenen format estructurat: `[Drive Error] { ... }`
- [ ] No hi ha errors silenciosos

### Uploads Robustos
- [ ] Upload fallit NO crea registre a Supabase
- [ ] Upload fallit mostra error clar a l'usuari
- [ ] Uploads duplicats (mateix fitxer) NO creen registres duplicats
- [ ] Fitxers pujats correctament apareixen a Supabase amb `drive_file_id`

### Logs i Debugging
- [ ] Errors a la consola són estructurats i útils
- [ ] Logs inclouen context (què s'estava fent quan va fallar)
- [ ] Timestamps a tots els logs

---

## 🐛 Troubleshooting

### Error: "AUTH_REQUIRED" constantment

**Causa**: Token no es guarda correctament o expira molt ràpid.

**Solució**:
1. Verifica que `gdrive_token` i `gdrive_token_time` existeixen a localStorage
2. Verifica que `gdrive_token_time` és recent (dins de l'última hora)
3. Torna a connectar-se a Drive

### Error: "Carpetes duplicades"

**Causa**: Abans d'aquestes millores, es podien haver creat duplicats.

**Solució**:
1. Neteja manualment les carpetes duplicades a Drive
2. Verifica que cada projecte té només un `drive_folder_id` a Supabase
3. Amb el nou codi, no es crearan més duplicats

### Error: "Document no apareix a Supabase però sí a Drive"

**Causa**: L'upload va funcionar però `createDocument` va fallar.

**Solució**:
1. Comprova la consola per errors de Supabase
2. Verifica que el projecte té `id` vàlid
3. Amb el nou codi, si `createDocument` falla, el fitxer es puja però no es crea registre (comportament correcte)

### Error: "Token expirat però no mostra alert"

**Causa**: El codi de detecció de token expirat no s'executa correctament.

**Solució**:
1. Verifica que `verifyToken()` s'està cridant
2. Comprova que els errors 401 es capturen correctament
3. Amb el nou codi, hauria de mostrar alert automàticament

---

## 📝 Notes Tècniques

### Flux "ensure folders → upload → save doc"

1. **Ensure Folders** (`ensureProjectDriveFolders`):
   - Verifica autenticació (token vàlid)
   - Si `drive_folder_id` existeix → verifica que és vàlid → retorna info
   - Si `drive_folder_id` és null → busca carpeta per nom → reutilitza o crea nova
   - Retorna `{ main: {...}, subfolders: {...} }`

2. **Upload File** (`uploadFile`):
   - Verifica autenticació (token vàlid)
   - Fa upload a Drive
   - Retorna `{ id, name, webViewLink, ... }`
   - Si falla → llança error (NO crea registre)

3. **Save Document** (`createDocument`):
   - Comprova si ja existeix document amb mateix `drive_file_id`
   - Si existeix → retorna existent (no duplica)
   - Si no existeix → crea nou registre a Supabase
   - `user_id` s'assigna automàticament (RLS)

### Seguretat de Tokens

- **Token expira**: ~1 hora (3600 segons)
- **Detecció d'expiració**: Als 55 minuts (3300 segons) o amb error 401
- **Guardat a**: `localStorage` (mínim necessari: `gdrive_token`, `gdrive_token_time`)
- **Refresc automàtic**: NO (OAuth2 no proporciona refresh_token en client-side)
- **Reconnexió**: Manual (usuari ha de clicar "Connectar a Drive" de nou)

---

## ✅ Conclusió

Després de fer totes les proves, hauries de tenir:

1. ✅ **Idempotència**: No es creen carpetes duplicades
2. ✅ **Gestió robusta de tokens**: Errors clars quan expiren
3. ✅ **Errors visibles**: Tots els errors es mostren a l'usuari
4. ✅ **Uploads robustos**: No es creen registres si l'upload falla
5. ✅ **Sense duplicats**: Documents i carpetes no es dupliquen

**Si totes les proves passen, la integració és robusta i llesta per producció!** 🎉














