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

// ---------- USER MUTATIONS ----------

export const adminListUserRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    if (error) throw error;
    return (rows ?? []).map((r) => r.role as string);
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; email?: string; display_name?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.email) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        email: data.email,
      });
      if (error) throw error;
    }
    if (data.display_name !== undefined) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ display_name: data.display_name })
        .eq("id", data.userId);
      if (error) throw error;
      await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        user_metadata: { full_name: data.display_name },
      });
    }
    await logAction(supabase, userId, "admin.user.update", "user", data.userId, {
      changed: Object.keys(data).filter((k) => k !== "userId"),
    });
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (data.userId === userId) throw new Error("Du kan ikke slette dig selv");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Remove storage objects first
    const { data: docs } = await supabaseAdmin
      .from("receipts")
      .select("pdf_path, original_path")
      .eq("user_id", data.userId);
    const paths = (docs ?? [])
      .flatMap((d) => [d.pdf_path, d.original_path])
      .filter((p): p is string => !!p);
    if (paths.length) {
      await supabaseAdmin.storage.from("receipts").remove(paths);
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw error;

    await logAction(supabase, userId, "admin.user.delete", "user", data.userId);
    return { ok: true };
  });

export const adminVerifyEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      email_confirm: true,
    });
    if (error) throw error;
    await logAction(supabase, userId, "admin.user.verify_email", "user", data.userId);
    return { ok: true };
  });

export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; makeAdmin: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (data.userId === userId && !data.makeAdmin) {
      throw new Error("Du kan ikke fjerne dine egne admin-rettigheder");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.makeAdmin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw error;
    }
    await logAction(supabase, userId, "admin.user.set_role", "user", data.userId, {
      makeAdmin: data.makeAdmin,
    });
    return { ok: true };
  });

async function sendAuthEmailViaSupabase(
  emailType: "recovery" | "magiclink" | "signup",
  email: string,
) {
  // Use publishable-key client so Supabase triggers the send-email hook,
  // which routes through /lovable/email/auth/webhook and the queue.
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const url = process.env.SUPABASE_URL!;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const siteUrl = `https://${process.env.LOVABLE_PUBLISHED_HOST ?? "kvitregn.dk"}`;
  if (emailType === "recovery") {
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });
    if (error) throw error;
  } else if (emailType === "magiclink") {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl}/app`, shouldCreateUser: false },
    });
    if (error) throw error;
  } else if (emailType === "signup") {
    const { error } = await client.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${siteUrl}/app` },
    });
    if (error) throw error;
  }
}

export const adminSendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    await sendAuthEmailViaSupabase("recovery", data.email);
    await logAction(supabase, userId, "admin.user.send_recovery", "user", null, { email: data.email });
    return { ok: true };
  });

export const adminSendMagicLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    await sendAuthEmailViaSupabase("magiclink", data.email);
    await logAction(supabase, userId, "admin.user.send_magiclink", "user", null, { email: data.email });
    return { ok: true };
  });

export const adminResendConfirmation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    await sendAuthEmailViaSupabase("signup", data.email);
    await logAction(supabase, userId, "admin.user.resend_confirmation", "user", null, { email: data.email });
    return { ok: true };
  });

// ---------- DOCUMENT MUTATIONS ----------

export const adminUpdateDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      id: string;
      company?: string;
      amount?: number;
      currency?: string;
      issued_date?: string | null;
      due_date?: string | null;
      document_type?: string;
      category?: string | null;
      status?: string;
      notes?: string | null;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("receipts").update(patch).eq("id", id);
    if (error) throw error;
    await logAction(supabase, userId, "admin.document.update", "document", id, {
      fields: Object.keys(patch),
    });
    return { ok: true };
  });

export const adminDeleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("receipts")
      .select("pdf_path, original_path, user_id")
      .eq("id", data.id)
      .maybeSingle();
    const paths = [row?.pdf_path, row?.original_path].filter(
      (p): p is string => !!p,
    );
    if (paths.length) {
      await supabaseAdmin.storage.from("receipts").remove(paths);
    }
    const { error } = await supabaseAdmin.from("receipts").delete().eq("id", data.id);
    if (error) throw error;
    await logAction(supabase, userId, "admin.document.delete", "document", data.id, {
      owner: row?.user_id ?? null,
    });
    return { ok: true };
  });

export const adminListDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { q?: string; limit?: number }) => ({
    q: (data?.q ?? "").trim(),
    limit: Math.min(Math.max(data?.limit ?? 100, 1), 500),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("receipts")
      .select("id, user_id, company, amount, currency, issued_date, document_type, category, status, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.q) {
      const num = Number(data.q.replace(",", "."));
      if (!isNaN(num)) {
        query = query.or(`company.ilike.%${data.q}%,amount.eq.${num}`);
      } else {
        query = query.ilike("company", `%${data.q}%`);
      }
    }
    const { data: rows, error } = await query;
    if (error) throw error;

    const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    const pMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

    return (rows ?? []).map((r) => ({
      ...r,
      owner_name: pMap.get(r.user_id) ?? null,
    }));
  });
