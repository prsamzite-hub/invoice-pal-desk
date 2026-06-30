import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const upsertSchema = z.object({
  category_id: z.string().uuid().nullable(),
  month: z.string().regex(/^\d{4}-\d{2}-01$/, "month must be first of month YYYY-MM-01"),
  amount: z.number().nonnegative().max(99_999_999),
});

export const upsertBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => upsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("budgets")
      .upsert(
        { user_id: userId, category_id: data.category_id, month: data.month, amount: data.amount },
        { onConflict: "user_id,category_id,month" },
      )
      .select()
      .single();
    if (error) throw error;
    return row;
  });

const listSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-01$/),
});

export const listBudgets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .eq("month", data.month);
    if (error) throw error;
    return rows ?? [];
  });
