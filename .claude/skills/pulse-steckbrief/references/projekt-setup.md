# Projekt-Setup (Phase 1, Schritt 1)

Startwerte für Repo, Pakete und TypeScript. Beim Anlegen einmal prüfen und danach hier die tatsächlich installierten Versionen nachtragen.

## Vorher (Auswahlrunde mit dem Nutzer)

Repo öffentlich anlegen und pushen? Lizenz? `.claude/` und `docs/recherche/` mit veröffentlichen? → `entscheidungen.md`, Offene Punkte. Git-Identität: `git config user.name "SkodeX"`, `user.email "<id>+SkodeX@users.noreply.github.com"` (`<id>` = `gh api user --jq .id`).

## Pakete

**Lieferkette:** nur Versionen, die mindestens 14 Tage alt sind – installieren mit `npm install --before <heute minus 14 Tage>` (z. B. `--before 2026-10-10`), danach Lockfile committen. Majors fest, Rest per Lockfile:

```jsonc
// package.json (Pipeline-Teil; Dashboard-Pakete kommen in Phase 3, Skill dashboard-entwickeln)
{
  "name": "ai-pulse",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24.12" },            // Type-Stripping „stable" ab 24.12
  "scripts": {
    "collect": "node pipeline/run.ts --stage collect",
    "smoke": "node pipeline/smoke.ts",
    "pipeline": "node pipeline/run.ts",
    "test": "node --test \"pipeline/test/**/*.test.ts\"",   // doppelte Anführungszeichen: läuft auch unter cmd.exe
    "typecheck": "tsc --noEmit -p tsconfig.pipeline.json"   // wächst je Phase (src/, worker/)
  },
  "dependencies": {
    "@extractus/feed-extractor": "^8",
    "@mozilla/readability": "^0.6",
    "linkedom": "^0.18",
    "normalize-url": "^10",
    "tldts": "^7",
    "p-limit": "^7",
    "zod": "^4"                                  // Major 4 nötig für z.toJSONSchema()
  },
  "devDependencies": {
    "typescript": "^7",
    "@types/node": "^24"
  }
}
```

Später dazu: `diff` ^9 und `html-to-text` ^10 (Phase 4, AGB), `hyparquet` **1.31.2** fest (Phase 4, Arena), `@anthropic-ai/sdk` (Phase 2, Notfall-Backend – Version mit Skill `claude-api` wählen).

## `tsconfig.pipeline.json`

```jsonc
{
  "compilerOptions": {
    "target": "es2023",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": false,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,                  // verbietet enum, Parameter-Properties, Namespaces mit Code
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["pipeline/**/*.ts", "shared/**/*.ts"]
}
```

## `.gitignore`

```
node_modules/
.cache/
dist/
*.tmp-*
.env*
!.env.example
worker/.wrangler/
worker/.dev.vars
```

`.gitattributes`: `* text=auto eol=lf`.

## Lokal ohne GitHub-Token

Lokal fehlt `AIPULSE_GITHUB_TOKEN` → GitHub-Quellen laufen über Atom (10 Einträge, Prerelease nur per Tag-Regex). **Nie** `gh auth token` als `AIPULSE_GITHUB_TOKEN` nehmen (Konto mit Repo-Rechten); wer lokal REST braucht, legt einen eigenen PAT ohne Rechte an.
