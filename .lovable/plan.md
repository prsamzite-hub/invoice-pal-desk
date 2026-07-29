# Full DA/EN language support

This is a large refactor touching ~30 files and hundreds of strings. Approving this plan will run all steps in one pass.

## 1. i18n foundation (src/lib/i18n.tsx)

Replace the current tiny dictionary with a typed, namespaced dictionary module (no runtime library — keeps bundle small and lets TypeScript catch missing keys):

- Full `da` and `en` dictionaries covering: nav, sidebar, topbar, user menu, landing, auth (login/signup/reset), privacy/terms headings, dashboard, documents (filters, sort, tabs, empty), analytics (chart toggles, legend, budgets), upload flow, review dialog, settings, admin console (users + documents + user detail), toasts, validation, confirmation dialogs, empty states.
- Category label translations (Dagligvarer/Groceries etc.). Stored `category` value in DB stays as-is; translation is display-only via a `tCategory(value)` helper.
- Default language: Danish. First-visit detection: if `navigator.language` starts with `en`, default EN; otherwise DA. Persisted in `localStorage("kvitregn.lang")`.
- New `useFormat()` hook returning `formatDate`, `formatMoney` bound to current locale (`da-DK` / `en-DK`, DKK in both).

## 2. Profile persistence

- Migration: add `locale text` column already exists on `profiles` — reuse it. Values: `da-DK` | `en-DK`.
- On login: `LanguageProvider` reads `profiles.locale` via a small server fn and syncs to state + localStorage.
- On toggle: update localStorage immediately; if authenticated, persist to `profiles.locale` (fire-and-forget, ignore errors).

## 3. Language switcher placement

- Keep existing `LanguageToggle` component (already in app topbar).
- Add it to the public landing header (`src/routes/index.tsx`) and auth page header (`src/routes/auth.tsx`).
- Mobile: the topbar toggle is already visible; landing/auth pages get it in their mobile menu / header.

## 4. Auth error mapping

Rework `src/lib/auth-errors.ts` to return a translation key + params instead of a Danish string. Callers resolve via `t(key)`. Add EN equivalents for every existing DA message.

## 5. PDF language

- `receipt-pdf.server.ts` already accepts `lang`. Wire caller in `receipts.functions.ts` to read `profiles.locale` for the acting user and pass `'da'` or `'en'`. Regeneration path uses the same lookup, so existing docs re-render in current language.
- Add EN label set: Receipt/Invoice, Due date, Sender, Issued, Category, Items, Total, etc.

## 6. Files touched (translations wired in)

Public: `index.tsx`, `auth.tsx`, `privacy.tsx`, `terms.tsx`, `reset-password.tsx`.
App shell: `app-sidebar.tsx`, `app-topbar.tsx`, `user-menu.tsx`, `theme-toggle.tsx`.
App pages: `app.index.tsx`, `app.documents.tsx`, `app.analytics.tsx`, `app.upload.tsx`, `app.settings.tsx`, `app.admin.index.tsx`, `app.admin.documents.tsx`, `app.admin.$userId.tsx`.
Components: `receipt-review-dialog.tsx`, `document-detail-sheet.tsx`, `admin-document-edit-dialog.tsx`, `items-editor.tsx`, `inbound-email-card.tsx`, `file-preview-card.tsx`, `pdf-viewer-dialog.tsx`, `company-combobox.tsx`.
Server: `receipts.functions.ts`, `receipt-pdf.server.ts`, `profile.functions.ts` (add `updateLocale`), `admin.functions.ts` (for locale in user detail).

## 7. Not translated

User-entered `company`, `notes`, item descriptions; CVR data; email addresses; brand name "Kvitregn".

## 8. Verification

- `tsgo` typecheck (dictionary is typed — any missing key errors compile).
- Manual walk of every route in EN mode via Playwright screenshots (landing, auth, dashboard, documents, analytics, upload, settings, admin) then flip back to DA.

## Technical notes

- Dictionary shape: `const dict = { da: {...}, en: {...} } as const; type Key = keyof typeof dict.da;` — `t(k: Key)` is fully typed.
- No `i18next` dependency — keeps bundle unchanged and avoids SSR init dance.
- `LanguageProvider` stays in `__root.tsx`; add auth-driven sync inside it.
- SSR: initial render uses `da` (matches root `<html lang="da">`); after hydration, `useEffect` reads localStorage/profile and swaps if needed. `<html lang>` is updated client-side to reflect current choice.

Scope estimate: ~30 file edits, one small server fn addition, no schema change, no new dependencies.