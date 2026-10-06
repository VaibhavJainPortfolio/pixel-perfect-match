import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const formatINR = (paise: number) =>
  "₹" + Math.round(paise / 100).toLocaleString("en-IN");

export const pricingQuery = queryOptions({
  queryKey: ["pricing"],
  queryFn: async () => {
    try {
      const { data, error } = await supabase
        .from("pricing")
        .select("id, product, name, tagline, amount_paise, gst_rate, features, highlighted")
        .eq("active", true)
        .order("sort_order");
      if (error) {
        console.warn("[pricingQuery] Query error:", error.message);
        return [];
      }
      return data ?? [];
    } catch (e: any) {
      console.warn("[pricingQuery] Fetch failed:", e?.message || e);
      return [];
    }
  },
});

export const reviewsQuery = queryOptions({
  queryKey: ["reviews", "approved"],
  queryFn: async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, display_name, city, rating, body")
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(9);
      if (error) {
        console.warn("[reviewsQuery] Query error:", error.message);
        return [];
      }
      return data ?? [];
    } catch (e: any) {
      console.warn("[reviewsQuery] Fetch failed:", e?.message || e);
      return [];
    }
  },
});

export type BeforeAfter = { before_url?: string; after_url?: string; before_label?: string; after_label?: string };

export const beforeAfterQuery = queryOptions({
  queryKey: ["site_content", "before_after"],
  queryFn: async () => {
    try {
      const { data } = await supabase.from("site_content").select("value").eq("key", "before_after").maybeSingle();
      return (data?.value ?? {}) as BeforeAfter;
    } catch (e: any) {
      console.warn("[beforeAfterQuery] Fetch failed:", e?.message || e);
      return {};
    }
  },
});

export const hairTipsQuery = (shape: string) =>
  queryOptions({
    queryKey: ["hair-tips", shape],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("style_rules")
          .select("id, rule_text")
          .eq("category", "hair")
          .eq("condition_key", `face:${shape}`)
          .eq("active", true)
          .order("priority")
          .limit(3);
        if (error) {
          console.warn("[hairTipsQuery] Query error:", error.message);
          return [];
        }
        return data ?? [];
      } catch (e: any) {
        console.warn("[hairTipsQuery] Fetch failed:", e?.message || e);
        return [];
      }
    },
  });
