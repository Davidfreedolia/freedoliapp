# FREEDOLIAPP — LANGUAGE SYSTEM

## Supported languages

FREEDOLIAPP supports three official UI languages:

- EN — English  
- ES — Spanish  
- CAT — Catalan

---

## Language source of truth

Language is a **user-level preference**.  
It is NOT a workspace setting.

Each user can choose their own language regardless of the workspace they belong to.

---

## Initial language detection (before login)

When a user visits the application for the first time, the language is detected from the browser:

`navigator.language`

Mapping example:

- `ca-ES` → `ca`  
- `es-ES` → `es`  
- `en-US` / `en-GB` → `en`

If the browser language is not supported:

- fallback → **EN**

---

## Language priority order

The application determines the language using this order:

1. `user.language` (stored preference)  
2. browser language  
3. EN (default fallback)

---

## Language persistence

If the user manually changes the language inside the app:

- the value is stored as **`user.language`**
- from that moment the browser language is ignored
- the UI always uses the stored user preference

---

## Scope of the language system

The selected language controls:

- UI translations  
- empty states  
- onboarding text  
- notifications  
- helper / assistant responses  
- system messages

---

## UI location of language selector

The language selector should be accessible from the user menu:

- Top bar → Avatar menu

Example:

- Profile  
- Language  
- Logout

---

## Important rule

The application must never mix languages in the same screen.

All visible UI text must follow the selected language.

