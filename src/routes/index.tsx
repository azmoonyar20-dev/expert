import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  FolderTree,
  Gift,
  ListChecks,
  NotebookPen,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CardsLoading, ErrorState } from "@/components/data-states";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { SectionHeading } from "@/components/section-heading";
import { ExamCard } from "@/components/exam-card";
import { formatNumber, formatPrice } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import type { CatalogTree, Plan, PublicExam } from "@/lib/types";

const PAGE_TITLE = "همراه استخدام — سطح آمادگی‌ات را برای آزمون استخدامی بسنج";
const PAGE_DESCRIPTION =
  "با آزمون شبیه‌سازی‌شده، تحلیل درس‌به‌درس و دفتر اشتباهات بفهم دقیقاً کجا ضعف داری. ۷ روز رایگان، بدون پرداخت اولیه.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const CTA_LABEL = "شروع رایگان ۷ روزه";
const MICROCOPY = "🎁 ۷ روز رایگان • بدون پرداخت اولیه • شروع فوری";

const HOOK_STEPS = [
  { icon: ListChecks, title: "آزمون بده" },
  { icon: Target, title: "ضعف‌هایت را پیدا کن" },
  { icon: TrendingUp, title: "هدفمند تمرین کن" },
];

const FEATURES = [
  {
    icon: Timer,
    emoji: "🎯",
    title: "آزمون شبیه روز واقعی",
    text: "با شرایطی نزدیک به آزمون واقعی تمرین کن و قبل از روز اصلی، آمادگی‌ات را بسنج.",
  },
  {
    icon: Bot,
    emoji: "🤖",
    title: "توضیح هوش مصنوعی",
    text: "برای سؤال‌های دشوار، توضیح فارسی و قابل فهم دریافت کن.",
  },
  {
    icon: BarChart3,
    emoji: "📈",
    title: "تحلیل عملکرد",
    text: "دقیقاً بفهم در کدام درس‌ها و مباحث نیاز به تمرین بیشتری داری.",
  },
  {
    icon: NotebookPen,
    emoji: "🔁",
    title: "دفتر اشتباهات",
    text: "سؤال‌هایی را که اشتباه زده‌ای دوباره مرور کن تا اشتباهاتت تکرار نشوند.",
  },
];

const BEFORE = [
  "تست‌های پراکنده",
  "مشخص نبودن نقاط ضعف",
  "فراموش شدن اشتباهات",
  "نداشتن تصویر واقعی از میزان آمادگی",
];

const AFTER = [
  "آزمون شبیه‌سازی‌شده",
  "تحلیل درس‌به‌درس",
  "دفتر اشتباهات",
  "مسیر تمرین مشخص",
];

const FAQ = [
  {
    q: "آیا واقعاً ۷ روز رایگان است؟",
    a: "بله. فقط با ثبت‌نام فعال می‌شود و پرداخت اولیه‌ای لازم نیست.",
  },
  {
    q: "بعد از ۷ روز چه اتفاقی می‌افتد؟",
    a: "اگر ادامه ندهی، هیچ هزینه‌ای کسر نمی‌شود. برای ادامه، یکی از پلن‌ها را انتخاب می‌کنی.",
  },
  {
    q: "آیا همه آزمون‌های استخدامی را پوشش می‌دهید؟",
    a: "آزمون‌ها و سازمان‌های موجود مرتب به‌روز می‌شوند. اگر آزمون هدفت هنوز اضافه نشده، به ما اطلاع بده.",
  },
  {
    q: "آیا توضیح AI برای سؤال‌ها وجود دارد؟",
    a: "بله. برای سؤال‌های دشوار، توضیح فارسی و کوتاه دریافت می‌کنی.",
  },
  {
    q: "آیا روی موبایل هم قابل استفاده است؟",
    a: "بله. تمام بخش‌ها روی موبایل و تبلت کامل کار می‌کنند.",
  },
  {
    q: "آیا می‌توانم فقط آزمون یک سازمان خاص را تمرین کنم؟",
    a: "بله. می‌توانی بر اساس سازمان، دسته و درس فیلتر کنی و فقط همان‌ها را تمرین کنی.",
  },
  {
    q: "قیمت اشتراک چقدر است؟",
    a: "قیمت پلن‌های ماهانه، سه‌ماهه و سالانه در بخش تعرفه‌ها همین صفحه نمایش داده می‌شود.",
  },
];

function LandingPage() {
  const { session } = useAuth();
  const isAuthed = Boolean(session);

  const examsQuery = useQuery({
    queryKey: ["landing-exams"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_exams_public", {
        p_page: 1,
        p_page_size: 6,
      });
      if (error) throw error;
      return data as unknown as { items: PublicExam[]; total: number };
    },
  });

  const catalogQuery = useQuery({
    queryKey: ["landing-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("exam_catalog_tree");
      if (error) throw error;
      return data as unknown as CatalogTree;
    },
  });

  const plansQuery = useQuery({
    queryKey: ["landing-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, title, price, duration_months, is_active, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Plan[];
    },
  });

  const exams = examsQuery.data?.items ?? [];
  const catalog = catalogQuery.data;
  const plans = plansQuery.data ?? [];
  const rootCategories = (catalog?.categories ?? []).filter((c) => !c.parent_id);
  const categories = rootCategories.length > 0 ? rootCategories : (catalog?.categories ?? []);

  const ctaTo = isAuthed ? "/exams" : "/signup";
  const ctaSearch = {};
  const ctaText = isAuthed ? "شروع آزمون آزمایشی" : CTA_LABEL;

  const stats = [
    { label: "آزمون منتشرشده", value: examsQuery.data?.total ?? 0 },
    { label: "سازمان برگزارکننده", value: catalog?.organizations.length ?? 0 },
    { label: "درس تخصصی", value: catalog?.subjects.length ?? 0 },
  ].filter((s) => s.value > 0);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PublicHeader />

      <main className="pb-20 sm:pb-0">
        {/* Hero */}
        <section className="relative overflow-hidden border-b bg-gradient-to-bl from-primary/10 via-background to-background">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge variant="secondary" className="mb-4 gap-1">
                <Gift className="size-3.5" aria-hidden="true" />
                ۷ روز رایگان — بدون پرداخت اولیه
              </Badge>
              <h1 className="text-3xl font-extrabold leading-tight text-foreground sm:text-5xl">
                قبولی استخدامی‌ات، از همین امروز شروع می‌شود.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                اگر فردا آزمون استخدامی برگزار شود، چند درصد می‌زنی؟ با همراه استخدام سطح آمادگی‌ات
                را بسنج، نقاط ضعفت را پیدا کن و هدفمند تمرین کن.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="min-h-12">
                  <Link to={ctaTo} {...ctaSearch}>
                    {ctaText}
                    <ArrowLeft className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="min-h-12">
                  <a href="#features">دیدن امکانات</a>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{MICROCOPY}</p>
            </div>

            {/* Hero visual — product preview */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Target className="size-4 shrink-0" aria-hidden="true" />
                چقدر برای آزمون استخدامی آماده‌ای؟
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                با یک آزمون کوتاه سطح آمادگی‌ات را بسنج و دقیقاً بفهم روی کدام مباحث باید بیشتر
                تمرین کنی.
              </p>

              <div className="mt-5 rounded-xl border bg-muted/30 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">درصد آمادگی</span>
                  <span className="num-fa font-extrabold text-primary">۷۲٪</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full w-[72%] rounded-full bg-primary" />
                </div>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-card p-3">
                    <dt className="text-xs text-muted-foreground">نقطه قوت</dt>
                    <dd className="mt-1 text-sm font-semibold text-success">اطلاعات عمومی</dd>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <dt className="text-xs text-muted-foreground">نیاز به تمرین</dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">هوش و استعداد</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">نمونه‌ای از کارنامه‌ی تحلیلی</p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="border-b bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-10">
            {stats.length > 0 ? (
              <dl className="grid gap-4 sm:grid-cols-3">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-2xl border bg-card p-6 text-center">
                    <dd className="num-fa text-3xl font-extrabold text-primary">
                      {formatNumber(s.value)}
                    </dd>
                    <dt className="mt-1 text-sm text-muted-foreground">{s.label}</dt>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-center text-base font-semibold text-foreground sm:text-lg">
                همه ابزارهای لازم برای آمادگی آزمون استخدامی، در یکجا
              </p>
            )}
          </div>
        </section>

        {/* Problem / Hook */}
        <section className="mx-auto max-w-4xl px-4 py-14 text-center">
          <h2 className="text-2xl font-bold leading-relaxed text-foreground sm:text-3xl">
            اگر امروز آزمون برگزار شود، واقعاً می‌دانی چقدر آماده‌ای؟
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
            خیلی‌ها ساعت‌ها تست می‌زنند، اما نمی‌دانند دقیقاً کجا ضعف دارند. همراه استخدام به تو
            نشان می‌دهد کدام مباحث را بلد نیستی و برای بهتر شدن باید روی چه چیزهایی تمرکز کنی.
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {HOOK_STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border bg-card p-5 text-start">
                <div className="flex items-center gap-3">
                  <span className="num-fa grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {formatNumber(i + 1)}
                  </span>
                  <step.icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{step.title}</h3>
              </li>
            ))}
          </ol>
        </section>

        {/* Demo */}
        <section id="demo" className="scroll-mt-20 border-y bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              🎯 چقدر برای آزمون استخدامی آماده‌ای؟
            </h2>
            <p className="mt-3 text-base leading-8 text-muted-foreground">
              حدس نزن؛ همین حالا سطح آمادگی‌ات را محک بزن.
            </p>
            <div className="mt-8 rounded-2xl border bg-card p-6 text-start shadow-sm sm:p-8">
              <Badge variant="secondary" className="mb-3">آزمون کوتاه آمادگی</Badge>
              <p className="num-fa text-sm text-muted-foreground">
                ۱۰ سؤال • تحلیل فوری • نتیجه در چند دقیقه
              </p>
              <Button asChild size="lg" className="mt-6 min-h-12 w-full sm:w-auto">
                <Link to={ctaTo} {...ctaSearch}>
                  همین حالا خودم را محک می‌زنم
                  <ArrowLeft className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
          <SectionHeading
            title="چه چیزی به دست می‌آوری"
            description="هر قابلیت، یک قدم نزدیک‌تر به قبولی"
            align="center"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <article key={f.title} className="rounded-2xl border bg-card p-5">
                <f.icon className="mb-3 size-6 text-primary" aria-hidden="true" />
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Before / After */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <SectionHeading title="از تست پراکنده تا تمرین هدفمند" align="center" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="font-semibold text-muted-foreground">قبل از همراه استخدام</h3>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {BEFORE.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-primary/40 bg-card p-6 shadow-sm">
                <h3 className="font-semibold text-foreground">با همراه استخدام</h3>
                <ul className="mt-4 space-y-3 text-sm text-foreground">
                  {AFTER.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2
                        className="mt-0.5 size-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Exams */}
        {exams.length > 0 && (
          <section id="exams" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
            <SectionHeading
              title="جدیدترین آزمون‌ها"
              description="آزمون‌های منتشرشده، آماده شرکت و تمرین"
              actions={
                <Button asChild variant="ghost" className="min-h-11">
                  <Link to="/exams">
                    همه آزمون‌ها
                    <ArrowLeft className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {exams.map((exam) => (
                <ExamCard key={exam.id} exam={exam} isAuthed={isAuthed} />
              ))}
            </div>
          </section>
        )}

        {/* Organizations */}
        {(catalog?.organizations.length ?? 0) > 0 && (
          <section id="organizations" className="scroll-mt-20 border-y bg-muted/30">
            <div className="mx-auto max-w-6xl px-4 py-14">
              <SectionHeading
                title="سازمان‌ها و بانک‌ها"
                description="سازمان‌هایی که آزمون‌های استخدامی آن‌ها در سامانه موجود است"
              />
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {catalog!.organizations.map((org) => (
                  <li
                    key={org.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border bg-card p-4"
                  >
                    {org.logo_url ? (
                      <img
                        src={org.logo_url}
                        alt={`نشان ${org.name}`}
                        loading="lazy"
                        className="size-8 shrink-0 rounded object-contain"
                      />
                    ) : (
                      <Building2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
                    )}
                    <span className="truncate text-sm font-medium">{org.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <section id="categories" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
            <SectionHeading
              title="دسته‌بندی آزمون‌ها"
              description="بر اساس نوع و حوزه آزمون، مسیر تمرین خود را انتخاب کنید"
            />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to="/exams"
                    className="block rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                      <FolderTree className="size-5 shrink-0 text-primary" aria-hidden="true" />
                      <p className="truncate font-medium text-foreground">{cat.name}</p>
                    </div>
                    <p className="num-fa mt-2 text-xs text-muted-foreground">
                      {formatNumber(cat.exam_count)} آزمون
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Offer + Pricing */}
        <section id="pricing" className="scroll-mt-20 border-t">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <div className="mb-10 rounded-2xl border border-primary/40 bg-primary/5 p-6 text-center sm:p-8">
              <Sparkles className="mx-auto size-6 text-primary" aria-hidden="true" />
              <h2 className="mt-3 text-xl font-bold text-foreground sm:text-2xl">
                🎁 اول امتحان کن، بعد تصمیم بگیر
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                ۷ روز رایگان شروع کن، سطح آمادگی‌ات را بسنج و بعد تصمیم بگیر.
              </p>
              <Button asChild size="lg" className="mt-6 min-h-12">
                <Link to={ctaTo} {...ctaSearch}>
                  {ctaText}
                  <ArrowLeft className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            <SectionHeading title="تعرفه‌ها" description="ماهانه، سه‌ماهه یا سالانه" align="center" />

            {plansQuery.isLoading ? (
              <CardsLoading count={3} />
            ) : plansQuery.isError ? (
              <ErrorState error={plansQuery.error} onRetry={() => void plansQuery.refetch()} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(plans.length > 0
                  ? plans.map((p) => ({
                      id: p.id,
                      title: p.title,
                      price: formatPrice(p.price),
                      months: p.duration_months,
                    }))
                  : [
                      { id: "m", title: "ماهانه", price: null, months: 1 },
                      { id: "q", title: "سه‌ماهه", price: null, months: 3 },
                      { id: "y", title: "سالانه", price: null, months: 12 },
                    ]
                ).map((plan, i) => (
                  <article
                    key={plan.id}
                    className={`flex flex-col rounded-2xl border bg-card p-6 ${
                      i === 1 ? "border-primary shadow-sm" : ""
                    }`}
                  >
                    {i === 1 && <Badge className="mb-3 w-fit">محبوب‌ترین انتخاب</Badge>}
                    <h3 className="text-base font-bold text-foreground">{plan.title}</h3>
                    <p className="num-fa mt-3 text-2xl font-extrabold text-primary">
                      {plan.price ?? "قیمت به‌زودی اعلام می‌شود"}
                    </p>
                    <p className="num-fa mt-1 text-sm text-muted-foreground">
                      {formatNumber(plan.months)} ماه دسترسی
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
                        دسترسی کامل به آزمون‌ها
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
                        تحلیل عملکرد و دفتر اشتباهات
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />
                        توضیح هوش مصنوعی سؤال‌ها
                      </li>
                    </ul>
                    <Button asChild className="mt-6 min-h-11 w-full">
                      <Link to={ctaTo} {...ctaSearch}>
                        {CTA_LABEL}
                      </Link>
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-14">
          <SectionHeading title="پرسش‌های پرتکرار" align="center" />
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={item.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-start text-sm font-semibold">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-7 text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Final CTA */}
        <section className="border-t bg-primary/5">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-16 text-center">
            <h2 className="max-w-2xl text-2xl font-bold leading-relaxed text-foreground sm:text-3xl">
              آمادگی را به روز آزمون موکول نکن.
            </h2>
            <p className="max-w-xl text-base leading-8 text-muted-foreground">
              همین امروز سطح آمادگی‌ات را بسنج و هدفمند تمرین کن.
            </p>
            <Button asChild size="lg" className="min-h-12">
              <Link to={ctaTo} {...ctaSearch}>
                {ctaText}
                <ArrowLeft className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">{MICROCOPY}</p>
          </div>
        </section>
      </main>

      {/* Sticky mobile CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur sm:hidden">
        <Button asChild size="lg" className="min-h-12 w-full">
          <Link to={ctaTo} {...ctaSearch}>
            🎁 {ctaText}
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <PublicFooter />
    </div>
  );
}
