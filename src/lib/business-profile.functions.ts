import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BusinessProfileInput = {
  company_name: string;
  cvr?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
};

function normalize(data: unknown): BusinessProfileInput {
  const d = (data ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const opt = (v: unknown) => {
    const s = str(v);
    return s.length ? s : null;
  };
  const company_name = str(d.company_name);
  if (company_name.length < 1) throw new Error("Firmanavn må ikke være tomt");
  if (company_name.length > 200) throw new Error("Firmanavn er for langt");
  const cvr = opt(d.cvr);
  if (cvr && !/^[0-9]{8}$/.test(cvr)) throw new Error("CVR skal være 8 cifre");
  const email = opt(d.email);
  if (email && email.length > 255) throw new Error("Email er for lang");
  return {
    company_name,
    cvr,
    address: opt(d.address),
    postal_code: opt(d.postal_code),
    city: opt(d.city),
    phone: opt(d.phone),
    email,
  };
}

export const getMyBusinessProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("business_profiles")
      .select("id, company_name, cvr, address, postal_code, city, phone, email")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

export const upsertMyBusinessProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => normalize(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("business_profiles")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
      .select("id, company_name, cvr, address, postal_code, city, phone, email")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteMyBusinessProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("business_profiles")
      .delete()
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });
