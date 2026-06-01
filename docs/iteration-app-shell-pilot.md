# Iteration App-Shell Pilot — Modeler als Erst-Konsument von `@sovaia/app-shell-*`

**Status:** Live (Iteration 0 + Pilot-Wrap)
**Datum:** 2026-06-01
**ADR-Bezug:** ADR-087 Phase 3c — Drop-In-Vertrag für L3-Apps

---

## Warum der Modeler der Pilot ist

Der architecture-modeler ist die jüngste L3-App im Stack — Iteration 0 läuft live,
es gibt noch keine Legacy-Sidebar, keine Legacy-Theme-Schicht, keine Legacy-Auth.
Damit ist er Greenfield-Konsument für die neue Library `sovaia-app-shell-core`.

Ziel: den AppShell-Drop-In-Vertrag (Header/Sidebar/Profile/License/Mode/Theme)
unter realen Bedingungen prüfen, bevor ERP + BLM migriert werden.

## Was eingebaut wurde

### 1. Workspace-Linking via `file:`-Pfad

In `frontend/package.json`:

```json
"@sovaia/app-shell-react": "file:../../sovaia-app-shell-core/packages/app-shell-react",
"@sovaia/app-shell-theming": "file:../../sovaia-app-shell-core/packages/app-shell-theming",
"@sovaia/license-client": "file:../../sovaia-app-shell-core/packages/license-client",
```

Die Library-Packages bauen `tsc`-Output nach `dist/`. Daher ist ein
`pnpm --filter "@sovaia/*" build` im `sovaia-app-shell-core`-Repo **Voraussetzung**
für `pnpm install` im Modeler-Frontend.

Migrationspfad (Phase-2): GHCR-NPM-Registry-Publish + Versions-Bumps statt
`file:`-Pfaden, sobald die Library stabil ist.

### 2. `ThemeProvider` + `AppShell` in `src/App.tsx`

```tsx
<ThemeProvider theme={SOVAIA_THEME}>
  <HashRouter>
    <ModelerShell>
      <Routes>…</Routes>
    </ModelerShell>
  </HashRouter>
</ThemeProvider>
```

`ThemeProvider` injiziert Brand-CSS-Variablen (sovaia-Default). `AppShell`
liefert Header (BrandLogo + AppLabel + LicenseBadge + UserMenu) und Sidebar
(Navigator + Canvas + Footer mit Version).

### 3. `src/shell/ModelerShell.tsx` — App-spezifische Verkabelung

- Lädt `getMe()` + `getLicense()` aus `src/api-client/index.ts` parallel.
- Mapped beides auf `UserInfo` + `LicenseInfo` via Adapter (s.u.).
- Sidebar-Routes: Navigator, Canvas.
- Profile-Switcher + ModeToggle bleiben leer (Phase-2).

### 4. `src/shell/adapters.ts` — License- + User-Mapping

Modeler-License (mode = `open|strict|preview`, allowed-layers/paths) wird auf
AppShell-`LicenseInfo` (mode = `open|strict|preview`, leaseStatus, tier, groups)
gemapped:

- `mode` → 1:1 übernommen (kompatible Enum-Werte).
- `leaseStatus` → konstant `"ACTIVE"`, solange eine License vorhanden ist
  (Modeler kennt keinen Lease-Lifecycle).
- `tier` → konstant `"Modeler"` als sichtbarer App-Identifier im Badge.
- `groups` → leer (Modeler nutzt allowed-paths statt License-Groups).

User-Mapping ist trivial: tenant-Slug aus `/v1/me` → `UserInfo.id` + `name`.
Echte Identity (Email, Avatar) folgt mit Auth-Layer in Iteration 1d-2.

## Was offen / Phase-2 ist

| Feature | Status | Begründung |
|---|---|---|
| Profile-Switcher | leer | Modeler-Backend hat noch keine Profile-API (`/v1/profiles`) |
| ModeToggle (BASIC/USER/EXPERT/ADMIN) | leer | Modeler hat noch kein Mode-Konzept |
| Logout-Endpoint | Reload | Modeler hat noch kein `/api/auth/logout` |
| BrandLogo asset | nicht gesetzt | `SOVAIA_THEME.tokens.brandLogoUrl = null` — folgt mit branding-core |
| UpdateButton/Banner | nicht eingebaut | Modeler hat noch keinen Update-Channel |
| License-Aktivierung via `@sovaia/license-client` | nicht eingebaut | Modeler hat `PUT /v1/edit/license` für direkten License-Upload — `activateWithCode` folgt wenn Modeler-License-Server existiert |

## Build-Status

- `pnpm build` (vite) → grün, 442 kB bundle.
- `pnpm lint` → skip, ESLint ist im Modeler-Frontend nicht installiert
  (pre-existing, unabhängig vom Pilot).

## Migration-Reference für ERP / BLM

Wenn ERP und BLM auf `@sovaia/app-shell-*` migrieren, ist der Modeler die
Referenz-Implementierung:

1. **Library-Build sicherstellen.** Im `sovaia-app-shell-core` muss
   `pnpm --filter "@sovaia/*" build` einmal gelaufen sein (oder per CI).
   `dist/`-Outputs werden via `file:`-Pfad konsumiert.
2. **Adapter-Layer schreiben.** Jede App hat eigene Auth-/License-/Profile-Typen.
   Adapter sind dünn, ehrlich, und kommentieren Lücken (z.B. fehlender
   Lease-Lifecycle).
3. **Profile + Mode-Switcher nicht erzwingen.** AppShell respektiert leere Props
   (kein Render). Apps können stufenweise verkabeln.
4. **Theme via Preset.** `SOVAIA_THEME` ist Default; pro Tenant kann später
   `KUNDE_THEME_TEMPLATE` oder eine `theme-resolver`-Ableitung verwendet werden.
5. **HashRouter + AppShell sind kompatibel.** Sidebar-Routes können sowohl
   `#/path` als auch `/path` führen — AppShell rendert sie als plain `<a href>`
   in V0.

Bei Fragen oder Verträgen siehe ADR-087 Phase 3c im `sovaia-contracts`-Repo
sowie die Library-Quellen unter `.repos/sovaia-app-shell-core/packages/`.
