"use server";

/*
 * Server actions for username login, logout, and admin-password session unlock.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase";
import { clearUserSession, createUserSession } from "@/lib/session";

export type AuthActionState = {
  ok: boolean;
  message: string;
};

// Normalizes whitespace so username comparisons are more consistent.
function normalizeUsername(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

// Signs a user in (or creates them on first login) and issues the session cookie.
export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const rawUsername = String(formData.get("username") ?? "");
  const username = normalizeUsername(rawUsername);

  if (username.length < 2 || username.length > 32) {
    return {
      ok: false,
      message: "Username must be between 2 and 32 characters.",
    };
  }

  const supabase = createSupabaseAdmin();

  const { data: existing, error: findError } = await supabase
    .from("users")
    .select("id, username")
    .ilike("username", username)
    .maybeSingle();

  if (findError) {
    return {
      ok: false,
      message: findError.message,
    };
  }

  if (existing) {
    await createUserSession(existing.id, existing.username);
    revalidatePath("/");
    redirect("/");
  }

  const { data: created, error: createError } = await supabase
    .from("users")
    .insert({ username, balance: 1000 })
    .select("id, username")
    .single();

  if (createError || !created) {
    return {
      ok: false,
      message: createError?.message ?? "Unable to create account.",
    };
  }

  await createUserSession(created.id, created.username);
  revalidatePath("/");
  redirect("/");
}

// Clears auth cookies and redirects back to the login page.
export async function logoutAction() {
  await clearUserSession();
  redirect("/login");
}
