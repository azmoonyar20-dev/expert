import { createFileRoute } from "@tanstack/react-router";

const ZARINPAL_SANDBOX_MERCHANT = "1344b5d4-004b-4e48-bc24-5b6c79c2416b";

export const Route = createFileRoute("/payment/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const authority = url.searchParams.get("Authority");
        const status = url.searchParams.get("Status");
        const origin = url.origin;

        if (!authority) {
          return Response.redirect(`${origin}/payment/result?status=missing`, 302);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: pay } = await supabaseAdmin
          .from("payments")
          .select("id, amount, currency, gateway")
          .eq("authority", authority)
          .single();

        if (!pay) {
          return Response.redirect(`${origin}/payment/result?status=not_found`, 302);
        }

        if (status !== "OK") {
          await supabaseAdmin.rpc("mark_gateway_payment_failed", {
            p_payment_id: pay.id,
            p_status: "cancelled",
            p_reason: "User cancelled at gateway",
          });
          return Response.redirect(`${origin}/payment/result?status=cancelled`, 302);
        }

        const { data: settings } = await supabaseAdmin
          .from("payment_gateway_settings")
          .select("merchant_id, sandbox, currency")
          .single();

        const merchantId =
          settings?.merchant_id || (settings?.sandbox ? ZARINPAL_SANDBOX_MERCHANT : "");
        const endpoint = settings?.sandbox
          ? "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"
          : "https://payment.zarinpal.com/pg/v4/payment/verify.json";

        const verifyResp = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            merchant_id: merchantId,
            amount: pay.amount,
            authority,
            currency: pay.currency === "IRT" ? "IRT" : "IRR",
          }),
        });
        const verifyBody = (await verifyResp.json()) as {
          data?: { code: number; ref_id: string; card_pan?: string; message?: string };
          errors?: { code?: number; message?: string };
        };

        // ZarinPal success codes: 100 (paid) / 101 (already verified).
        const code = verifyBody.data?.code;
        if (verifyResp.ok && (code === 100 || code === 101)) {
          await supabaseAdmin.rpc("finalize_gateway_payment", {
            p_payment_id: pay.id,
            p_ref_id: verifyBody.data?.ref_id ?? "",
            p_amount: pay.amount,
            p_card_pan: verifyBody.data?.card_pan ?? "",
          });
          return Response.redirect(
            `${origin}/payment/result?status=success&ref=${verifyBody.data?.ref_id ?? ""}`,
            302,
          );
        }

        await supabaseAdmin.rpc("mark_gateway_payment_failed", {
          p_payment_id: pay.id,
          p_status: "failed",
          p_reason:
            verifyBody.data?.message ??
            verifyBody.errors?.message ??
            `code ${code ?? verifyResp.status}`,
        });
        return Response.redirect(`${origin}/payment/result?status=failed`, 302);
      },
    },
  },
});
