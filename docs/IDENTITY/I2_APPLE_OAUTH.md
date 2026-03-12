# IDENTITY PHASE I2 — Apple OAuth

## Status
Implemented

## Objective
Afegir login amb Apple OAuth a FREEDOLIAPP reutilitzant l’arquitectura d’identitat existent basada en Supabase Auth.

## Scope

Inclòs:
- Apple OAuth login
- Botó "Continue with Apple"
- Integració amb Supabase Auth
- Compatibilitat amb:
  - email/password
  - magic link
  - Google OAuth

Exclòs:
- provider linking
- account settings
- lead capture per OAuth
- canvis de DB

## Implementation

### Frontend

Fitxer principal:


src/pages/Login.jsx


Handler implementat:


supabase.auth.signInWithOAuth({
provider: 'apple',
options: {
redirectTo: ${window.location.origin}/
}
})


### OAuth Flow


Login
↓
Continue with Apple
↓
Apple consent
↓
Supabase /auth/v1/callback
↓
redirect "/"
↓
detectSessionInUrl
↓
OnboardingGate
↓
Workspace resolution
↓
/app


## i18n

Clau afegida:


login.continueWithApple


Fitxers:


src/i18n/locales/en.json
src/i18n/locales/ca.json
src/i18n/locales/es.json


## Validation

Validat:

- email/password login funciona
- magic link funciona
- Google OAuth continua funcionant
- Apple OAuth funciona
- sessió es recupera correctament
- redirecció final a `/app`
- cap canvi de DB

## Known Limitations

- no hi ha provider linking
- no hi ha lead capture per OAuth
- linking de comptes depèn de Supabase

## Identity Stack V1


Email + Password
Magic Link
Google OAuth
Apple OAuth

