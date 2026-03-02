# Workspace context (FASE 2 CBA)

**Versió:** 1.0  
**Àmbit:** Frontend — gestió de l’org activa (active_org_id) i bootstrap.

---

## 1. Context

Tota la UI dins `/app` depèn d’una **organització activa**. El WorkspaceContext centralitza quin és l’org seleccionat (`activeOrgId`), la llista de memberships de l’usuari i les accions de canvi d’org. El gate de billing (AppContent) i totes les queries tenant fan servir aquest `activeOrgId`. Sense workspace context estable, no es pot aplicar correctament el billing gating ni assegurar que les dades mostrades pertanyen a l’org correcta.

---

## 2. Decisions tancades

| # | Decisió | Detall |
|---|---------|--------|
| 1 | **Storage key** | `freedoli_active_org_id` (localStorage). Valor: UUID de l’org (string). |
| 2 | **Bootstrap** | Després d’auth, es carreguen els `org_memberships` de l’usuari; es valida el valor emmagatzemat; si no és vàlid o no existeix, fallback: org on role=owner, o primera per created_at. |
| 3 | **Switch d’org** | `setActiveOrgId(orgId)` actualitza state, persisteix a localStorage, sincronitza amb AppContext (`setAppActiveOrgId`) i navega a `/app` (replace). No es requereix full page reload. |
| 4 | **Purge de cache** | En canviar d’org, la navegació a ruta safe (`/app`) i el re-render fan que els components tornin a fer fetch; les queries fan `.eq('org_id', activeOrgId)` i per tant no mostren dades de l’org anterior. |
| 5 | **Demo mode** | En mode demo no es carreguen memberships; activeOrgId es deixa null; isWorkspaceReady = true per no bloquejar la UI. |
| 6 | **Provider order** | WorkspaceProvider ha d’estar dins AppProvider (necessita setAppActiveOrgId) i embolcallant les rutes que fan servir useWorkspace. |

---

## 3. Contractes de dades

### 3.1 Hook `useWorkspace()`

Retorna:

| Prop | Tipus | Descripció |
|------|--------|------------|
| `activeOrgId` | string \| null | UUID de l’org activa. |
| `memberships` | Array<{ org_id, role, created_at, orgs?: { id, name } }> | Llistat de memberships de l’usuari. |
| `setActiveOrgId` | (orgId: string) => void | Canvia l’org activa, persisteix i navega a `/app`. |
| `isWorkspaceReady` | boolean | true quan el bootstrap ha acabat (o demo/no user). |
| `revalidateActiveOrg` | () => Promise<void> | Torna a llegir memberships i reaplica la lògica de fallback sense canviar isWorkspaceReady. |
| `storageKey` | string | `'freedoli_active_org_id'` (per debug). |

### 3.2 Bootstrap: ordre de decisió

1. Si demo mode → memberships = [], activeOrgId = null, isWorkspaceReady = true.
2. Si no hi ha sessió → idem.
3. Query `org_memberships` per `user_id = session.user.id`, ordenat per created_at.
4. Si 0 memberships → activeOrgId = null, persist, isWorkspaceReady = true.
5. Llegir `freedoli_active_org_id` de localStorage.
6. Si el valor emmagatzemat és un UUID vàlid i l’usuari és membre d’aquesta org → chosen = stored.
7. Si no → chosen = org on role='owner' si existeix, sinó primera de la llista.
8. setActiveOrgIdState(chosen), persistActiveOrg(chosen), setAppActiveOrgId(chosen), isWorkspaceReady = true.

---

## 4. Fluxos

### 4.1 Inicialització (bootstrap)

```
App carregat
    |
    v
WorkspaceProvider munta
    |
    v
useEffect bootstrap (depèn de sessió)
    |
    +-- Demo / no user -> isWorkspaceReady=true, activeOrgId=null
    |
    +-- User logat -> fetch org_memberships
              |
              v
         Stored active_org_id vàlid i usuari és membre?
              | YES -> confirmar activeOrgId
              | NO  -> fallback (owner org o primera)
              v
         Persistir; setAppActiveOrgId; isWorkspaceReady=true
```

### 4.2 Canvi d’org (switch)

```
Usuari tria altra org (selector o setActiveOrgId)
    |
    v
setActiveOrgId(newOrgId)
    |
    +-- setState(activeOrgId = newOrgId)
    +-- localStorage.setItem('freedoli_active_org_id', newOrgId)
    +-- setAppActiveOrgId(newOrgId)  [AppContext]
    +-- navigate('/app', { replace: true })
    |
    v
Components que depenen de activeOrgId es re-renderitzen;
queries amb .eq('org_id', activeOrgId) retornen dades de la nova org.
```

### 4.3 Usuari expulsat (desync)

```
Usuari era membre de org A; l’expulsen.
    |
    v
Refresh o revalidateActiveOrg
    |
    v
Bootstrap: stored = A, però A ja no està a memberships
    |
    v
Fallback: chosen = altra org (owner o primera)
    |
    v
Persistir nova activeOrgId; no loop (isWorkspaceReady ja true).
```

---

## 5. Edge cases

| Cas | Comportament |
|-----|--------------|
| localStorage amb UUID invàlid | Regex `^[0-9a-f-]{36}$/i` no fa match; es tracta com a “no stored”; fallback. |
| Usuari amb 0 orgs | memberships = []; activeOrgId = null; isWorkspaceReady = true; la UI ha de tractar “sense org” (onboarding o invitació). |
| setActiveOrgId cridat abans de bootstrap | State s’actualitza; en bootstrap es pot sobreescriure si el valor no és a memberships. |
| revalidateActiveOrg sense canviar isWorkspaceReady | Útil per refrescar activeOrgId després d’un canvi extern (ex. ser afegit a una org) sense tornar a mostrar loading. |

---

## 6. Definition of Done

- [x] WorkspaceProvider amb state activeOrgId, memberships, isWorkspaceReady.
- [x] Bootstrap: fetch org_memberships, validació stored, fallback owner / primera.
- [x] Persistència a `freedoli_active_org_id`.
- [x] setActiveOrgId: state + persist + AppContext + navigate('/app', replace).
- [x] useWorkspace() exposa activeOrgId, memberships, setActiveOrgId, isWorkspaceReady, revalidateActiveOrg, storageKey.
- [x] Integració amb AppContent (billing gate fa servir activeOrgId i isWorkspaceReady).

---

## 7. Relació amb altres documents

- **FASE2_CBA_ARCHITECTURE_FINAL** (D0): decisions de storage i flux.
- **BILLING_GATING_UI** (D3): AppContent espera isWorkspaceReady i fa servir activeOrgId per carregar org i aplicar el gate.
- **FASE2_IMPLEMENTATION_LOCK_CBA** (D0): especificació original del workspace context.
