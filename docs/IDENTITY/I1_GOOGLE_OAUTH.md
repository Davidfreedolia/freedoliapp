# IDENTITY PHASE I1 — Google OAuth

## Status
Implemented

## Objective
Afegir login amb Google OAuth a FREEDOLIAPP sense trencar els mecanismes existents d’autenticació.

## Scope
Inclòs:
- Google OAuth login
- Integració amb Supabase Auth
- Botó "Continue with Google"
- Compatibilitat amb email/password
- Compatibilitat amb magic link
- Internacionalització dels textos del botó

Exclòs:
- Apple OAuth
- Provider linking UI
- Account settings
- Lead capture via OAuth
- Canvis de DB

## Implementation

### Frontend
Fitxer principal:

src/pages/Login.jsx


Afegit handler:


supabase.auth.signInWithOAuth({
provider: 'google',
options: {
redirectTo: ${window.location.origin}/
}
})


### OAuth Flow


Login page
↓
Continue with Google
↓
Google consent
↓
Supabase /auth/v1/callback
↓
redirectTo "/"
↓
Supabase client detectSessionInUrl
↓
OnboardingGate
↓
Workspace resolution
↓
/app


### i18n

Claus afegides:


login.continueWithGoogle
login.or


Fitxers:

src/i18n/locales/en.json
src/i18n/locales/ca.json
src/i18n/locales/es.json


## Validation

Validat:

- email/password login continua funcionant
- magic link continua funcionant
- Google OAuth crea o reutilitza sessió
- redirecció final correcta cap a `/app`
- cap canvi de DB
- cap canvi de multi-tenant

## Known Limitations

- no hi ha lead capture per Google OAuth
- provider linking encara no implementat
- Apple OAuth pendent

## Next Phase


IDENTITY PHASE I2 — Apple OAuth

