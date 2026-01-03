# Auto-run Configuration per Cursor

## Objectiu
Permetre que les comandes repetitives (npm, git, etc.) s'executin automàticament sense prompts a Cursor.

## Configuració (3 passos)

### Pas 1: Obrir Settings de Cursor
- `Ctrl+,` (Windows/Linux) o `Cmd+,` (Mac)
- Cerca: "terminal allowlist" o "auto run"

### Pas 2: Activar Terminal Allowlist
- Cerca la opció: **"Terminal: Allowlist"** o **"Auto-run Commands"**
- Activa el toggle o afegeix a la llista:
  ```
  npm
  pnpm
  yarn
  git
  vercel
  ```

### Pas 3: Verificar
- Tanca i torna a obrir Cursor
- Prova executar `npm run build` - hauria d'executar-se sense prompt

## Alternativa: Configuració Manual

Si no trobes l'opció a Settings, edita manualment el fitxer de configuració:

**Windows**: `%APPDATA%\Cursor\User\settings.json`
**Mac**: `~/Library/Application Support/Cursor/User/settings.json`
**Linux**: `~/.config/Cursor/User/settings.json`

Afegeix:
```json
{
  "terminal.integrated.allowWorkspaceShellCommands": true,
  "cursor.terminal.allowlist": [
    "npm",
    "pnpm",
    "yarn",
    "git",
    "vercel"
  ]
}
```

## Verificació
Després de configurar, les comandes següents s'executaran automàticament:
- ✅ `npm run build`
- ✅ `npm run lint`
- ✅ `git commit`
- ✅ `vercel --prod`



