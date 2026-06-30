import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

const payloadSchema = z.object({
  to: z.string().email(),
  from: z.string().optional(),
  subject: z.string().optional(),
  text: z.string().min(1),
});

export const Route = createFileRoute("/api/public/inbound-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.INBOUND_EMAIL_SECRET;
        if (!secret) {
          return new Response("Not configured", { status: 503 });
        }
        const provided = request.headers.get("x-inbound-secret") ?? "";
        const a = Buffer.from(provided);
        const b = Buffer.from(secret);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Unauthorized", { status: 401 });
        }

        let parsed;
        try {
          parsed = payloadSchema.parse(await request.json());
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const local = parsed.to.split("@")[0]?.toLowerCase();
        if (!local) return new Response("Invalid recipient", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: profile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email_inbox_token", local)
          .maybeSingle();
        if (profileError || !profile) {
          return new Response("Unknown inbox", { status: 404 });
        }

        const { extractReceiptFromText } = await import("@/lib/ai-gateway.server");
        let extracted;
        try {
          extracted = await extractReceiptFromText(parsed.text);
        } catch (err) {
          console.error("[inbound-email] extraction failed", err);
          return new Response("Extraction failed", { status: 502 });
        }

        // Documents table is provisioned in a later phase; log for now.
        console.log("[inbound-email] extracted for", profile.id, extracted);
        return Response.json({ ok: true, extracted });
      },
    },
  },
});
