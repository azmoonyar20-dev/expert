import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, EmptyState, ErrorState, PageHeader } from "@/components/data-states";
import {
  BulkGenerateAiAnswers,
  QuestionAiAnswerButton,
  useExplanationStatus,
} from "@/components/admin/question-ai-answer";
import { formatDate, humanizeError } from "@/lib/format";
import { rpc } from "@/lib/supabase-rpc";
import type { AdminExamsPage } from "@/lib/admin/queries";


export const Route = createFileRoute("/admin/questions")({
  head: () => ({
    meta: [
      { title: "بانک سوال | همراه استخدام" },
      { name: "description", content: "مدیریت بانک سوال آزمون‌ها" },
    ],
  }),
  component: QuestionsPage,
});

type QItem = {
  id: string;
  question_text: string;
  difficulty: string;
  status: string;
  category_id: string | null;
  default_score: number;
  category_name: string | null;
  option_count: number;
  created_at: string;
};
type Cat = { id: string; name: string };
type Option = { text: string; is_correct: boolean; order: number };

const PAGE_SIZE = 20;

function QuestionsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [examFilter, setExamFilter] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QItem | null>(null);

  const catsQ = useQuery({
    queryKey: ["admin-cats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Cat[];
    },
  });

  const examsQ = useQuery({
    queryKey: ["admin-exams-select"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await rpc<AdminExamsPage>("admin_list_exams", {
        p_search: null,
        p_status: null,
        p_access_type: null,
        p_category_id: null,
        p_page: 1,
        p_page_size: 200,
      });
      return res.items;
    },
  });

  /** سوال‌های آزمون انتخاب‌شده؛ فیلتر متن/دسته و صفحه‌بندی سمت کلاینت انجام می‌شود. */
  const examQuestionsQ = useQuery({
    queryKey: ["admin-exam-questions", examFilter],
    enabled: !!examFilter,
    queryFn: async () => {
      const { data: links, error: linkErr } = await supabase
        .from("exam_questions")
        .select("question_id, display_order")
        .eq("exam_id", examFilter)
        .order("display_order");
      if (linkErr) throw linkErr;
      const ids = (links ?? []).map((l) => l.question_id);
      if (ids.length === 0) return [] as QItem[];

      const { data, error } = await supabase
        .from("questions")
        .select(
          "id, question_text, difficulty, status, category_id, default_score, created_at, categories(name), question_options(count)",
        )
        .in("id", ids);
      if (error) throw error;

      const byId = new Map(
        (data ?? []).map((q) => {
          const row = q as unknown as {
            id: string;
            question_text: string;
            difficulty: string;
            status: string;
            category_id: string | null;
            default_score: number;
            created_at: string;
            categories: { name: string } | null;
            question_options: { count: number }[] | null;
          };
          const item: QItem = {
            id: row.id,
            question_text: row.question_text,
            difficulty: row.difficulty,
            status: row.status,
            category_id: row.category_id,
            default_score: row.default_score,
            created_at: row.created_at,
            category_name: row.categories?.name ?? null,
            option_count: row.question_options?.[0]?.count ?? 0,
          };
          return [row.id, item] as const;
        }),
      );
      return ids.map((id) => byId.get(id)).filter((q): q is QItem => q != null);
    },
  });

  const listQ = useQuery({
    queryKey: ["admin-questions", search, catFilter, page],
    enabled: !examFilter,
    queryFn: async () =>
      rpc<{ items: QItem[]; total: number; page: number; page_size: number }>(
        "list_questions_admin",
        {
          p_search: search || null,
          p_category_id: catFilter || null,
          p_page: page,
          p_page_size: PAGE_SIZE,
        },
      ),
  });


  const saveMut = useMutation({
    mutationFn: (v: {
      id: string | null;
      question_text: string;
      difficulty: string;
      status: string;
      category_id: string;
      score: number;
      options: Option[];
    }) =>
      rpc("save_question", {
        p_id: v.id,
        p_text: v.question_text,
        p_difficulty: v.difficulty,
        p_status: v.status,
        p_category_id: v.category_id || null,
        p_score: v.score,
        p_options: v.options.map((o, i) => ({
          text: o.text,
          is_correct: o.is_correct,
          order: i + 1,
        })),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-questions"] });
      setOpen(false);
    },
  });

  const examMode = !!examFilter;
  const filteredExamItems = (examQuestionsQ.data ?? []).filter((q) => {
    const term = search.trim();
    if (term && !q.question_text.includes(term)) return false;
    if (catFilter && q.category_id !== catFilter) return false;
    return true;
  });

  const total = examMode ? filteredExamItems.length : (listQ.data?.total ?? 0);
  const items = examMode
    ? filteredExamItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : (listQ.data?.items ?? []);
  const activeQuery = examMode ? examQuestionsQ : listQ;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageIds = items.map((q) => q.id);
  const explanations = useExplanationStatus(pageIds);
  const missingIds = pageIds.filter((id) => !explanations.data?.has(id));


  return (
    <div>
      <PageHeader
        title="بانک سوال"
        description="مدیریت سوالات، گزینه‌ها و پاسخ تشریحی هوش مصنوعی"
        actions={
          <div className="flex flex-wrap gap-2">
            <BulkGenerateAiAnswers questionIds={missingIds} />
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="size-4" />
              سوال جدید
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-72 max-w-full">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pr-9"
            placeholder="جستجوی متن سوال…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={catFilter}
          onValueChange={(v) => {
            setCatFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="همه دسته‌ها" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">همه دسته‌ها</SelectItem>
            {(catsQ.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={examFilter}
          onValueChange={(v) => {
            setExamFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="همه آزمون‌ها" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">همه آزمون‌ها</SelectItem>
            {(examsQ.data ?? []).map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.title} ({e.question_count} سوال)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {examMode && (
          <Badge variant="secondary">
            سوال‌های آزمون: {examsQ.data?.find((e) => e.id === examFilter)?.title ?? "—"}
          </Badge>
        )}
      </div>


      {activeQuery.isLoading ? (
        <LoadingState rows={8} />
      ) : activeQuery.isError ? (
        <ErrorState error={activeQuery.error} onRetry={() => void activeQuery.refetch()} />
      ) : items.length === 0 ? (

        <EmptyState title="سوالی یافت نشد" description="متن یا دسته دیگری را جستجو کنید." />
      ) : (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>متن سوال</TableHead>
                  <TableHead className="w-32">دسته</TableHead>
                  <TableHead className="w-28">سختی</TableHead>
                  <TableHead className="w-24">گزینه</TableHead>
                  <TableHead className="w-24">نمره</TableHead>
                  <TableHead className="w-24">وضعیت</TableHead>
                  <TableHead className="w-40">پاسخ هوشمند</TableHead>
                  <TableHead className="w-20">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="max-w-md">
                      <span className="line-clamp-2">{q.question_text}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {q.category_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{q.difficulty}</Badge>
                    </TableCell>
                    <TableCell>{q.option_count}</TableCell>
                    <TableCell>{q.default_score}</TableCell>
                    <TableCell>
                      <Badge variant={q.status === "active" ? "default" : "secondary"}>
                        {q.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant={explanations.data?.has(q.id) ? "default" : "outline"}>
                          {explanations.data?.has(q.id) ? "آماده" : "ندارد"}
                        </Badge>
                        <QuestionAiAnswerButton
                          questionId={q.id}
                          questionText={q.question_text}
                          hasExplanation={explanations.data?.has(q.id) ?? false}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(q);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">مجموع {total} سوال</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                قبلی
              </Button>
              <span className="px-2 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                بعدی
              </Button>
            </div>
          </div>
        </>
      )}

      <QuestionDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        categories={catsQ.data ?? []}
        error={saveMut.isError ? humanizeError(saveMut.error) : null}
        saving={saveMut.isPending}
        onSave={(v) => saveMut.mutate(v)}
      />
    </div>
  );
}

function QuestionDialog(props: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: QItem | null;
  categories: Cat[];
  error: string | null;
  saving: boolean;
  onSave: (v: {
    id: string | null;
    question_text: string;
    difficulty: string;
    status: string;
    category_id: string;
    score: number;
    options: Option[];
  }) => void;
}) {
  const { open, onOpenChange, editing, categories, error, saving, onSave } = props;
  const [text, setText] = useState(editing?.question_text ?? "");
  const [difficulty, setDifficulty] = useState(editing?.difficulty ?? "medium");
  const [status, setStatus] = useState(editing?.status ?? "active");
  const [cat, setCat] = useState(editing?.category_id ?? "");
  const [score, setScore] = useState(editing?.default_score ?? 1);
  const [options, setOptions] = useState<Option[]>([
    { text: "", is_correct: true, order: 1 },
    { text: "", is_correct: false, order: 2 },
    { text: "", is_correct: false, order: 3 },
    { text: "", is_correct: false, order: 4 },
  ]);

  const setOpt = (i: number, patch: Partial<Option>) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "ویرایش سوال" : "سوال جدید"}</DialogTitle>
          <DialogDescription>متن سوال، گزینه‌ها و پاسخ صحیح را مشخص کنید.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const validOpts = options.filter((o) => o.text.trim());
            if (!text.trim() || validOpts.length < 2 || !validOpts.some((o) => o.is_correct))
              return;
            onSave({
              id: editing?.id ?? null,
              question_text: text.trim(),
              difficulty,
              status,
              category_id: cat,
              score: Number(score) || 1,
              options: validOpts,
            });
          }}
        >
          <div className="space-y-2">
            <Label>متن سوال</Label>
            <Textarea required rows={2} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>سختی</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">آسان</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="hard">سخت</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>دسته</Label>
              <Select value={cat} onValueChange={setCat}>
                <SelectTrigger>
                  <SelectValue placeholder="بدون دسته" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">بدون دسته</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>نمره</Label>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>وضعیت</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">فعال</SelectItem>
                  <SelectItem value="inactive">غیرفعال</SelectItem>
                  <SelectItem value="draft">پیش‌نویس</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>گزینه‌ها</Label>
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox
                  checked={o.is_correct}
                  onCheckedChange={(v) => setOpt(i, { is_correct: v === true })}
                  aria-label={`گزینه ${i + 1} صحیح`}
                />
                <Input
                  placeholder={`گزینه ${i + 1}`}
                  value={o.text}
                  onChange={(e) => setOpt(i, { text: e.target.value })}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => setOptions((p) => p.filter((_, idx) => idx !== i))}
                >
                  حذف
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setOptions((p) => [...p, { text: "", is_correct: false, order: p.length + 1 }])
              }
            >
              + افزودن گزینه
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : editing ? "ذخیره" : "ایجاد"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
