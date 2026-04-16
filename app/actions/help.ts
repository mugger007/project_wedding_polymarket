"use server";

/*
 * Server actions for FAQ question submission and admin answers.
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { requireUser } from "@/lib/auth";
import { faqTag } from "@/lib/cache-tags";
import { createSupabaseAdmin } from "@/lib/supabase";

export type FaqActionState = {
  ok: boolean;
  message: string;
};

function normalizeQuestion(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function normalizeAnswer(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

export async function submitFaqQuestionAction(
  _prevState: FaqActionState,
  formData: FormData,
): Promise<FaqActionState> {
  const user = await requireUser();
  const rawQuestion = String(formData.get("question") ?? "");
  const question = normalizeQuestion(rawQuestion);

  if (question.length < 10 || question.length > 500) {
    return {
      ok: false,
      message: "Please write a question between 10 and 500 characters.",
    };
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("how_to_play_faqs").insert({
    question,
    status: "open",
    asked_by_user_id: user.id,
    asked_by_username: user.username,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateTag(faqTag);
  revalidatePath("/how-to-play");
  revalidatePath("/admin");

  return {
    ok: true,
    message: "Thanks. Your question has been sent for review.",
  };
}

export async function answerFaqQuestionAction(
  _prevState: FaqActionState,
  formData: FormData,
): Promise<FaqActionState> {
  await requireUser();

  const faqId = String(formData.get("faqId") ?? "").trim();
  const rawAnswer = String(formData.get("answer") ?? "");
  const answer = normalizeAnswer(rawAnswer);

  if (!faqId) {
    return {
      ok: false,
      message: "Missing FAQ id.",
    };
  }

  if (answer.length < 5 || answer.length > 1000) {
    return {
      ok: false,
      message: "Please write an answer between 5 and 1000 characters.",
    };
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("how_to_play_faqs")
    .update({
      answer,
      status: "answered",
      answered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", faqId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  revalidateTag(faqTag);
  revalidatePath("/how-to-play");
  revalidatePath("/admin");

  return {
    ok: true,
    message: "FAQ answer published.",
  };
}
