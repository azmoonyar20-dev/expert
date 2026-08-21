import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { AnalyticsPayload, CoachResult, LearningResource } from "./ai-coach.schema";

const inputSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export const getCoachAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<CoachResult> => {
    const { supabase } = context;

    const analyticsRes = await supabase.rpc("candidate_analytics_self", {
      ...(data.from ? { p_from: data.from } : {}),
      ...(data.to ? { p_to: data.to } : {}),
    });
    if (analyticsRes.error) throw new Error(analyticsRes.error.message);
    const analytics = analyticsRes.data as unknown as AnalyticsPayload;

    const subjectIds = Array.from(
      new Set(
        [...analytics.weak_topics, ...analytics.subjects]
          .map((t) => ("subject_id" in t ? t.subject_id : null))
          .filter((v): v is string => !!v),
      ),
    );
    const categoryIds = analytics.weak_topics.map((t) => t.category_id).filter(Boolean);

    const resourcesRes = await supabase.rpc("resources_for_topics", {
      ...(subjectIds.length ? { p_subject_ids: subjectIds } : {}),
      ...(categoryIds.length ? { p_category_ids: categoryIds } : {}),
      p_limit: 12,
    });
    if (resourcesRes.error) throw new Error(resourcesRes.error.message);
    const resources = (resourcesRes.data ?? []) as unknown as LearningResource[];

    const { generateCoachAnalysis } = await import("./ai-coach.server");
    const analysis = await generateCoachAnalysis(analytics, resources);

    return { analytics, resources, analysis, generated_at: new Date().toISOString() };
  });
