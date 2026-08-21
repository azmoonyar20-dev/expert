import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/payment-result")({
  validateSearch: (s: Record<string, unknown>) => ({
    status: typeof s["status"] === "string" ? s["status"] : "unknown",
    ref: typeof s["ref"] === "string" ? s["ref"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "نتیجه پرداخت | همراه استخدام" },
      { name: "description", content: "نتیجه پرداخت اشتراک" },
    ],
  }),
  component: PaymentResultPage,
});

function PaymentResultPage() {
  const { status, ref } = Route.useSearch();
  const success = status === "success";

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-muted/30 px-4"
      dir="rtl"
    >
      <div className="absolute end-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          {success ? (
            <CheckCircle2 className="size-12 text-emerald-600" />
          ) : (
            <XCircle className="size-12 text-destructive" />
          )}
          <h1 className="text-xl font-bold">
            {success ? "پرداخت با موفقیت انجام شد" : "پرداخت ناموفق بود"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {success
              ? "اشتراک شما فعال شد. از آزمون‌های سامانه استفاده کنید."
              : "در روند پرداخت خطایی رخ داد یا آن را لغو کردید. در صورت کسر وجه، مبلغ به‌زودی بازگشت داده می‌شود."}
          </p>
          {success && ref && (
            <p className="rounded-lg bg-muted/40 px-3 py-1 text-xs text-muted-foreground" dir="ltr">
              شماره پیگیری: {ref}
            </p>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link to="/dashboard">ورود به داشبورد</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/subscription">مشاهده اشتراک</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
