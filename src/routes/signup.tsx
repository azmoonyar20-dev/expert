import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { AuthLayout } from "@/components/auth-layout";
import { PhoneOtpForm } from "@/components/phone-auth/phone-otp-form";
import { useAuth } from "@/hooks/use-auth";

function safeInternalPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export const Route = createFileRoute("/signup")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { returnTo?: string | undefined; intent?: "trial" | undefined } => ({
    returnTo: safeInternalPath(s["returnTo"]),
    intent: s["intent"] === "trial" ? "trial" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "ثبت‌نام رایگان با شماره موبایل | همراه استخدام" },
      {
        name: "description",
        content:
          "ساخت حساب کاربری رایگان در همراه استخدام با نام و شماره موبایل؛ تأیید با کد یک‌بارمصرف پیامکی و بدون رمز عبور.",
      },
      { property: "og:title", content: "ثبت‌نام رایگان با شماره موبایل | همراه استخدام" },
      {
        property: "og:description",
        content: "حساب رایگان بسازید و آزمون‌های آزمایشی استخدامی را شروع کنید.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const { returnTo } = Route.useSearch();
  const destination = returnTo ?? "/dashboard";

  useEffect(() => {
    if (!loading && session) {
      void navigate({ to: destination, replace: true });
    }
  }, [loading, session, destination, navigate]);

  if (loading || session) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-muted/40 text-muted-foreground"
        dir="rtl"
        aria-live="polite"
      >
        <Loader2 className="me-2 size-5 animate-spin" aria-hidden="true" />
        در حال بررسی وضعیت حساب…
      </div>
    );
  }

  return (
    <AuthLayout
      title="ثبت‌نام رایگان"
      description="نام و نام خانوادگی و شماره موبایل خود را وارد کنید تا کد تأیید پیامک شود و حسابتان ساخته شود."
    >
      <PhoneOtpForm mode="signup" destination={destination} />
      <p className="mt-6 text-center text-xs leading-6 text-muted-foreground">
        قبلاً حساب ساخته‌اید؟{" "}
        <Link
          to="/auth"
          {...(returnTo ? { search: { returnTo } } : {})}
          className="font-medium text-primary hover:underline"
        >
          ورود به حساب
        </Link>
      </p>
    </AuthLayout>
  );
}
