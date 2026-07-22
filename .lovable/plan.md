Extend the existing read-only admin area (`/app/admin`) into a full admin console with user + document CRUD, role management, and auth actions. Everything gated by the existing `has_role(uid, 'admin')` check and logged to `audit_log`.

## Access model

- Reuse the current `user_roles` table + `has_role` RPC and the `assertAdmin` guard in `src/lib/admin.functions.ts`. No schema change needed.
- All new server functions go in `src/lib/admin.functions.ts`, use `requireSupabaseAuth` + `assertAdmin`, and load `supabaseAdmin` inside the handler. Every mutation writes an `audit_log` row.
- Admins cannot delete themselves or remove their own admin role (server-side guard).

## New server functions

Users:
- `adminUpdateUser` — update `email`, `display_name`, `full_name` metadata (via `supabaseAdmin.auth.admin.updateUserById` + `profiles` upsert).
- `adminDeleteUser` — `supabaseAdmin.auth.admin.deleteUser` (cascades receipts/profiles via existing FKs).
- `adminSendPasswordReset` — `supabaseAdmin.auth.admin.generateLink({ type: 'recovery' })` and enqueue the existing recovery email template via `enqueue_email` so it flows through the queue like normal auth mail.
- `adminSendMagicLink` — same pattern with `type: 'magiclink'`.
- `adminResendConfirmation` — `type: 'signup'` for users whose `email_confirmed_at` is null.
- `adminVerifyEmail` — `updateUserById(id, { email_confirm: true })` to mark verified without an email round-trip.
- `adminSetUserRole` — takes `{ userId, role: 'admin' | 'user' }`. For `admin`, upsert `user_roles`; for `user`, delete the admin row. Blocks self-demotion.
- `adminListUserRoles` — returns the roles for a user so the UI can show current state.

Documents (receipts):
- `adminUpdateDocument` — update editable fields on `receipts` (`company`, `amount`, `currency`, `issued_date`, `due_date`, `document_type`, `category`, `status`, `is_business`-if-still-present, notes). Zod-validated.
- `adminDeleteDocument` — delete the `receipts` row and its storage objects (`pdf_path`, `original_path`).
- `adminListDocuments` — global paginated list with search by company/amount and filter by user, for a new "Alle dokumenter" admin tab.

## UI changes

`src/routes/_authenticated/app.admin.tsx` (users tab):
- Add per-row action menu: "Rediger", "Slet", "Send nulstil-mail", "Send login-link", "Gensend bekræftelse", "Marker verificeret", "Gør til admin" / "Fjern admin".
- Confirmation dialog for destructive actions (delete, role change).
- Show badges: "Admin", "Ikke verificeret".

`src/routes/_authenticated/app.admin.$userId.tsx`:
- Add an "Rediger bruger" section (display_name, email) and the same action buttons as the row menu.
- In the documents table, add row actions "Rediger" (opens the existing review dialog in admin mode) and "Slet".

New route `src/routes/_authenticated/app.admin.documents.tsx`:
- Global documents table using `adminListDocuments` with search/filter, links back to each owner and to `/app/admin/$userId`.

Sidebar: add "Admin" submenu entries "Brugere" and "Dokumenter" (only rendered when `isCurrentUserAdmin` is true — already fetched).

All copy in Danish. No changes to landing, auth, or non-admin flows.

## Technical notes

- Password reset / magic link / confirmation resend go through the existing Lovable auth email queue by calling `supabase.rpc('enqueue_email', { queue_name: 'auth_emails', payload })` with the same payload shape the auth webhook uses (`email_action_type`, `redirect_to`, generated `token_hash`, user metadata). This keeps branding + Danish subjects consistent.
- `adminDeleteUser` runs `supabaseAdmin.storage.from('receipts').remove([...paths])` for that user's receipts before the auth delete so no orphan files remain.
- Self-protection: `if (data.userId === context.userId) throw` on delete and on admin-role removal.
- All new server fns append to the existing file; no new middleware, no schema migration.