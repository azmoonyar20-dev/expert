import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/data-states";
import { humanizeError } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "پروفایل | همراه استخدام" },
      { name: "description", content: "مشاهده و ویرایش اطلاعات حساب کاربری" },
      { property: "og:title", content: "پروفایل | همراه استخدام" },
      { property: "og:description", content: "مشاهده و ویرایش اطلاعات حساب کاربری" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, mobile")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error(error);
        setFullName(data?.full_name ?? "");
        setMobile(data?.mobile ?? "");
        setLoading(false);
      });
  }, [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, mobile: mobile || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(humanizeError(error));
      return;
    }
    toast.success("پروفایل به‌روزرسانی شد.");
  };

  const handleSignOut = async () => {

    await signOut();
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <div>
      <PageHeader title="پروفایل" description="مشاهده و ویرایش اطلاعات حساب کاربری" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>اطلاعات حساب</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginPhone">شماره موبایل ورود</Label>
                  <Input id="loginPhone" dir="ltr" value={mobile || "—"} disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">نام و نام خانوادگی</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "در حال ذخیره…" : "ذخیره تغییرات"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void handleSignOut()}>
                    خروج از حساب
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>امنیت حساب</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-muted-foreground">
              ورود به حساب شما تنها با شماره موبایل و کد یک‌بارمصرف پیامکی انجام می‌شود؛ رمز عبوری
              وجود ندارد که نیاز به تغییر داشته باشد.
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
