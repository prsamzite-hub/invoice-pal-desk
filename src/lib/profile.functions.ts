import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, currency, locale, email_inbox_token")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { display_name: string }) => {
    const name = (data?.display_name ?? "").trim();
    if (name.length < 1) throw new Error("Navn må ikke være tomt");
    if (name.length > 80) throw new Error("Navn er for langt");
    return { display_name: name };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("profiles")
      .update({ display_name: data.display_name })
      .eq("id", userId)
      .select("id, display_name, avatar_url, currency, locale, email_inbox_token")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Collect storage paths owned by user
    const { data: rows } = await supabase
      .from("receipts")
      .select("original_path, pdf_path")
      .eq("user_id", userId);
    const paths = (rows ?? [])
      .flatMap((r) => [r.original_path, r.pdf_path])
      .filter((p): p is string => typeof p === "string" && p.length > 0);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (paths.length > 0) {
      // Remove in chunks to be safe
      for (let i = 0; i < paths.length; i += 100) {
        await supabaseAdmin.storage.from("receipts").remove(paths.slice(i, i + 100));
      }
    }

    // Also try to remove the user's storage folder (any orphans)
    try {
      const { data: folder } = await supabaseAdmin.storage.from("receipts").list(userId, {
        limit: 1000,
      });
      if (folder && folder.length > 0) {
        const orphan = folder.map((f) => `${userId}/${f.name}`);
        await supabaseAdmin.storage.from("receipts").remove(orphan);
      }
    } catch {
      // ignore
    }

    await supabaseAdmin.from("receipts").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const del = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (del.error) throw del.error;

    return { ok: true };
  });
