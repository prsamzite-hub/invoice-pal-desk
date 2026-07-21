import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw error;
  if (!data) throw new Error("Adgang nægtet");
}

async function logAction(
  supabase: any,
  adminId: string,
  action: string,
  target_type: string | null,
  target_id: string | null,
  metadata: Record<string, unknown> = {},
) {
  try {
    await supabase.from("audit_log").insert({
      admin_id: adminId,
      action,
      target_type,
      target_id,
      metadata,
    });
  } catch (e) {
    console.error("[audit_log] insert failed", e);
  }
}

export const isCurrentUserAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (error) return false;
    return !!data;
  });

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { q?: string }) => ({ q: (data?.q ?? "").trim() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch a batch of auth users (up to 200) and filter by query.
    const { data: page, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) throw error;

    const q = data.q.toLowerCase();
    const authUsers = (page.users ?? []).filter((u) => {
      if (!q) return true;
      const email = (u.email ?? "").toLowerCase();
      const name = (
        (u.user_metadata?.full_name as string | undefined) ??
        (u.user_metadata?.name as string | undefined) ??
        ""
      ).toLowerCase();
      return email.includes(q) || name.includes(q);
    });

    const ids = authUsers.map((u) => u.id);
    const [profilesRes, countsRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, display_name").in("id", ids),
      supabaseAdmin.from("receipts").select("user_id").in("user_id", ids),
    ]);

    const pMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
    const countMap = new Map<string, number>();
    for (const r of countsRes.data ?? []) {
      countMap.set(r.user_id, (countMap.get(r.user_id) ?? 0) + 1);
    }

    await logAction(supabase, userId, "admin.users.search", null, null, { q: data.q });

    return authUsers.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      display_name: pMap.get(u.id)?.display_name ?? null,
      company_name: null as string | null,
      cvr: null as string | null,
      document_count: countMap.get(u.id) ?? 0,
    }));
  });

export const adminGetUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [authRes, profileRes, docsRes] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(data.userId),
      supabaseAdmin.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      supabaseAdmin
        .from("receipts")
        .select("id, company, amount, currency, issued_date, due_date, document_type, category, status, created_at")
        .eq("user_id", data.userId)
        .order("issued_date", { ascending: false, nullsFirst: false }),
    ]);
    if (authRes.error) throw authRes.error;

    await logAction(supabase, userId, "admin.user.view", "user", data.userId);

    const u = authRes.data.user;
    return {
      auth: {
        id: u?.id ?? data.userId,
        email: u?.email ?? "",
        created_at: u?.created_at ?? null,
        last_sign_in_at: u?.last_sign_in_at ?? null,
      },
      profile: profileRes.data ?? null,
      documents: docsRes.data ?? [],
    };
  });

export const adminGetDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("receipts")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("Ikke fundet");

    const { data: items } = await supabaseAdmin
      .from("document_items")
      .select("description, quantity, unit_price, total, position")
      .eq("document_id", data.id)
      .order("position", { ascending: true });

    let pdfUrl: string | null = null;
    let originalUrl: string | null = null;
    if (row.pdf_path) {
      const s = await supabaseAdmin.storage.from("receipts").createSignedUrl(row.pdf_path, 60 * 10);
      pdfUrl = s.data?.signedUrl ?? null;
    }
    if (row.original_path) {
      const s = await supabaseAdmin.storage.from("receipts").createSignedUrl(row.original_path, 60 * 10);
      originalUrl = s.data?.signedUrl ?? null;
    }

    await logAction(supabase, userId, "admin.document.view", "document", data.id, {
      owner: row.user_id,
    });

    return { row, items: items ?? [], pdfUrl, originalUrl };
  });
