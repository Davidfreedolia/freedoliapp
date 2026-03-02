# Seat enforcement RPC (FASE 2 CBA)

**Versió:** 1.0  
**Àmbit:** Funció RPC `org_add_member` i regles d’enforcement de places.

---

## 1. Context

El límit de places (`orgs.seat_limit`) no es comprova a RLS; no es pot implementar de forma neta amb policies perquè cal comparar un COUNT amb un valor d’una altra taula. Per tant, l’enforcement es fa en afegir un nou membre: una funció RPC comprova que el caller és owner/admin, que l’usuari encara no és membre i que `seats_used < seat_limit` abans de fer l’INSERT a `org_memberships`.

---

## 2. Decisions tancades

| # | Decisió | Detall |
|---|---------|--------|
| 1 | **Únic punt d’enforcement** | Afegir membre a una org ha de passar per `org_add_member` (o equivalent controlat) per garantir el límit. |
| 2 | **Càlcul seats_used** | `COUNT(*) FROM org_memberships WHERE org_id = p_org_id`. Tots els rols compten com 1 plaça. |
| 3 | **Rols permesos** | `p_role IN ('owner', 'admin', 'member')`. Validació a la funció. |
| 4 | **Idempotència** | Si (org_id, user_id) ja existeix a org_memberships → retornar `'already_member'` sense error. |
| 5 | **Permís** | Només owner o admin de l’org poden cridar la funció; en cas contrari es retorna error. |

---

## 3. Contractes de dades

### 3.1 Signatura

```
org_add_member(p_org_id uuid, p_user_id uuid, p_role text DEFAULT 'member') RETURNS text
```

### 3.2 Valors de retorn

| Retorn | Significat |
|--------|------------|
| `'ok'` | Member afegit correctament. |
| `'already_member'` | Ja existia la filera (org_id, user_id); no es modifica. |

### 3.3 Excepcions (RAISE EXCEPTION)

| Condició | Missatge |
|----------|----------|
| p_org_id o p_user_id NULL | `'org_id and user_id are required'` |
| p_role NULL o no vàlid | `'role must be one of: owner, admin, member'` |
| Caller no és owner ni admin | `'only owner or admin of the org can add members'` |
| seats_used >= seat_limit | `'seat_limit_reached'` |

### 3.4 Seguretat

- **SECURITY DEFINER** amb **SET search_path = public**.
- **GRANT EXECUTE** a `authenticated`.
- La funció comprova `is_org_owner_or_admin(p_org_id)` amb `auth.uid()` implícit.

---

## 4. Fluxos

### 4.1 Flux d’add member

```
1. Client crida supabase.rpc('org_add_member', { p_org_id, p_user_id, p_role })
2. Funció: comprova p_org_id, p_user_id, p_role no NULL / vàlids
3. Funció: is_org_owner_or_admin(p_org_id) → si no, RAISE 'only owner or admin...'
4. Compta seats_used (COUNT org_memberships per p_org_id)
5. Llegeix seat_limit de orgs
6. Si existeix (p_org_id, p_user_id) a org_memberships → RETURN 'already_member'
7. Si v_seats_used >= v_seat_limit → RAISE 'seat_limit_reached'
8. INSERT org_memberships (org_id, user_id, role)
9. RETURN 'ok'
```

### 4.2 Diagrama

```
    [Client]
       │
       │  RPC org_add_member(org_id, user_id, role)
       ▼
    ┌──────────────────────────────────┐
    │  Caller owner/admin?              │── NO ──► Exception
    └──────────────────────────────────┘
       │ YES
       ▼
    ┌──────────────────────────────────┐
    │  Ja és membre?                   │── YES ──► 'already_member'
    └──────────────────────────────────┘
       │ NO
       ▼
    ┌──────────────────────────────────┐
    │  seats_used >= seat_limit?       │── YES ──► Exception seat_limit_reached
    └──────────────────────────────────┘
       │ NO
       ▼
    INSERT org_memberships → RETURN 'ok'
```

---

## 5. Edge cases

| Cas | Comportament |
|-----|--------------|
| seat_limit = 1, ja hi ha 1 membre | Cridar org_add_member per un segon usuari → error `seat_limit_reached`. |
| Crida per afegir el mateix usuari dues vegades | Segona crida retorna `'already_member'`; no es duplica la filera. |
| Usuari sense ser owner/admin | Exception `'only owner or admin of the org can add members'`. |
| org_id o user_id NULL | Exception de paràmetres requerits. |
| role 'owner' | La funció accepta el rol; la lògica de “un sol owner” ha d’estar a nivell de negoci si cal (no descrit en aquest doc). |

---

## 6. Definition of Done

- [x] Funció `org_add_member` creada amb SECURITY DEFINER i search_path.
- [x] Comprovació owner/admin, validació paràmetres, càlcul seats_used i seat_limit.
- [x] Idempotència: retorn `already_member` si (org_id, user_id) existeix.
- [x] RAISE EXCEPTION per seat_limit_reached i per permís.
- [x] GRANT EXECUTE TO authenticated.
- [x] Smoke test documentat (comentaris a la migració).

---

## 7. Relació amb altres documents

- **BILLING_MODEL** (D2): definició de `seat_limit` i `seats_used`.
- **FASE2_CBA_ARCHITECTURE_FINAL** (D0): decisió que over-seat no es resol a RLS.
- **BILLING_GATING_UI** (D3): pantalla over-seat i CTA a portal / configuració de membres; la UI no afegeix membres directament sense passar per l’RPC (o equivalent).
