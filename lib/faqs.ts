import "server-only";

/*
 * Cached FAQ data access for the How to Play page and admin moderation view.
 */

import { unstable_cache } from "next/cache";
import { faqTag } from "@/lib/cache-tags";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { FaqEntry } from "@/types";

function mapFaqRow(row: {
  id: string;
  question: string;
  answer: string | null;
  status: "open" | "answered";
  asked_by_username: string | null;
  created_at: string;
  updated_at: string;
  answered_at: string | null;
}): FaqEntry {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    status: row.status,
    askedByUsername: row.asked_by_username,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    answeredAt: row.answered_at,
  };
}

export async function getPublicFaqs(): Promise<FaqEntry[]> {
  const run = unstable_cache(
    async () => {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase
        .from("how_to_play_faqs")
        .select("id, question, answer, status, asked_by_username, created_at, updated_at, answered_at")
        .eq("status", "answered")
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((row) =>
        mapFaqRow(row as {
          id: string;
          question: string;
          answer: string | null;
          status: "open" | "answered";
          asked_by_username: string | null;
          created_at: string;
          updated_at: string;
          answered_at: string | null;
        }),
      );
    },
    ["faq-entries", "public"],
    {
      tags: [faqTag],
      revalidate: 60,
    },
  );

  return run();
}

export async function getOpenFaqs(): Promise<FaqEntry[]> {
  const run = unstable_cache(
    async () => {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase
        .from("how_to_play_faqs")
        .select("id, question, answer, status, asked_by_username, created_at, updated_at, answered_at")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((row) =>
        mapFaqRow(row as {
          id: string;
          question: string;
          answer: string | null;
          status: "open" | "answered";
          asked_by_username: string | null;
          created_at: string;
          updated_at: string;
          answered_at: string | null;
        }),
      );
    },
    ["faq-entries", "open"],
    {
      tags: [faqTag],
      revalidate: 15,
    },
  );

  return run();
}
