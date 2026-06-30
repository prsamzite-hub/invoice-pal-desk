
# Phase 2 Build Plan — Auth, Data Layer, Email Ingest & Document Modal

Four parallel workstreams. Phase 1 design tokens, shell, and atomic components stay untouched.

---

## 1. Auth + Protected Routing

### Route map

```text
src/routes/
  __root.tsx                       (public shell, theme, query, supabase listener)
  index.tsx                        (public landing)
  auth.tsx                         (public — login/signup tabs + OAuth)
  _authenticated/
    route.tsx                      (integration-managed gate, ssr:false → /auth)
    app.tsx                        (moved: sidebar + topbar + <Outlet/>)
    app.index.tsx                  (dashboard)
    app.documents.tsx
    app.upload.tsx
    app.analytics.tsx
    app.settings.tsx
```

`/app/*` lives under `_authenticated/`. The managed layout calls
`supabase.auth.getUser()` client-side and redirects unauthenticated users
to `/auth`. `/` and `/auth` stay top-level and public. Existing
`src/routes/app.*.tsx` files move under `_authenticated/` unchanged.

```text
unauth → /app/documents
   └─► _authenticated/route.tsx beforeLoad
         getUser() == null → redirect /auth
auth   → /app/documents
   └─► gate passes → app.tsx layout → documents page
```

### /auth page

- Tabs: **Log ind / Opret bruger** (Danish primary, English secondary copy).
- Email + password with zod validation (`z.string().email()`, password ≥ 8).
- Two pill buttons: **Continue with Google**, **Continue with Microsoft** (Azure provider — covers Outlook/Hotmail).
- Google goes through `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` per integration rule.
- Microsoft uses `supabase.auth.signInWithOAuth({ provider: "azure", options: { redirectTo: origin, scopes: "email" } })`.
- After successful email login → `navigate({ to: "/app" })`.
- Calls `supabase--configure_social_auth` for `google` and `azure` in the same turn the providers are wired.

---

## 2. Database Foundations (migration)

### `profiles`
```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  currency text not null default 'DKK',
  locale text not null default 'da-DK',
  email_inbox_token text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read"  on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile write" on public.profiles for update to authenticated using (auth.uid() = id);
```

### Trigger — auto profile on signup
```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare token text;
begin
  token := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.profiles (id, display_name, avatar_url, email_inbox_token)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url',
    token
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
```

### `budgets`
```sql
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade, -- null = global
  month date not null,                                                 -- first of month
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);
grant select, insert, update, delete on public.budgets to authenticated;
grant all on public.budgets to service_role;
alter table public.budgets enable row level security;
create policy "own budgets" on public.budgets for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

The `unique` constraint + `upsert(..., onConflict: 'user_id,category_id,month')` gives collision-free tuning.

### Server functions (`src/lib/budgets.functions.ts`)
- `upsertBudget({ category_id, month, amount })` — auth middleware, upsert.
- `listBudgets({ month })` — auth middleware, returns globals + per-category.

---

## 3. Inbound Email Ingestion (scaffold only)

### `InboundEmailCard` (settings + upload empty state)
- Displays `{email_inbox_token}@receipts.kvittr.dk` with copy button.
- Accordion (bilingual): "Set up forwarding in Gmail" / "Outlook" with rule snippets.
- Reads token via authenticated server fn `getMyProfile`.

### Server route — `src/routes/api/public/inbound-email.ts`
```text
POST /api/public/inbound-email
  1. Verify shared secret header (env INBOUND_EMAIL_SECRET) — timingSafeEqual
  2. Parse { to, from, subject, text, attachments[] }
  3. Resolve user via to-address local-part → profiles.email_inbox_token
  4. Call Lovable AI Gateway (google/gemini-2.5-flash) with extraction prompt
     → { company, amount, currency, date, due_date?, document_type }
  5. Insert into documents (status='unpaid'/'paid' heuristic)
  6. Return 200 ok
```

Lovable AI Gateway helper added at `src/lib/ai-gateway.server.ts` per the AI SDK pattern. Secret `INBOUND_EMAIL_SECRET` provisioned. Actual mail provider webhook wiring is out of scope for this phase — handler is testable via curl with the secret header.

---

## 4. Document Detail Modal + PDF Viewer

### UI hierarchy

```text
DocumentsPage / DashboardRecentList
  └─ DocumentCard (click)
        └─ onClick → setSelectedDocId(doc.id)
              └─ <DocumentDetailSheet open={!!selectedDocId} docId={selectedDocId} onOpenChange=…>
                    ├─ SheetHeader
                    │    CompanyAvatar + Company name + StatusBadge
                    ├─ Body grid
                    │    MoneyAmount size="xl"
                    │    Field: Date issued
                    │    Field: Due date (only if type === 'invoice')
                    │    Field: Category chip
                    │    Field: Notes
                    ├─ FilePreviewCard
                    │    thumbnail | filename | size
                    │    click → setPdfOpen(true)
                    └─ Footer
                         [Download]  [Mark as paid] (if unpaid)  [Pay invoice] (mock)

  + <PdfViewerDialog open={pdfOpen} url={signedUrl} onOpenChange=…>
        full-screen DialogContent
        <iframe src={signedUrl#toolbar=1} className="h-[85vh] w-full rounded-xl" />
        fallback "Open in new tab" link for non-PDF mime
```

State lives in the page (`useState<string | null>`). The sheet uses
existing `Sheet` primitive (right side, max-w-lg). The PDF dialog uses
existing `Dialog`. Signed URL fetched via `getDocumentFileUrl({ id })`
server fn (auth middleware, creates Supabase storage signed URL — wired
to storage in a later phase; for now returns the `file_url` column).

### New components
- `src/components/document-detail-sheet.tsx`
- `src/components/pdf-viewer-dialog.tsx`
- `src/components/file-preview-card.tsx`
- `src/components/inbound-email-card.tsx`

Sample data on Documents/Dashboard pages stays; modal works against the in-memory items so the interaction is fully testable before Cloud queries land.

---

## Out of scope (later phases)
- Storage bucket + real file uploads
- Mail provider (Postmark/SendGrid) inbound webhook signing
- Real Stripe "Pay invoice"
- Analytics charts against real data

---

## Execution order
1. Enable Lovable Cloud.
2. Migration: `profiles`, trigger, `budgets`.
3. Move `app.*` routes under `_authenticated/`, add `/auth` page, configure Google + Azure providers.
4. Server fns: `getMyProfile`, `upsertBudget`, `listBudgets`, `getDocumentFileUrl`.
5. Build `DocumentDetailSheet` + `PdfViewerDialog` + `FilePreviewCard`; wire DocumentCard clicks.
6. Build `InboundEmailCard` into Settings + Upload empty state.
7. AI gateway helper + `/api/public/inbound-email` route + `INBOUND_EMAIL_SECRET`.
8. Typecheck + smoke test auth redirect, modal open, PDF iframe.
