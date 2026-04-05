"use server";

/*
 * Server actions for username login, logout, and admin-password session unlock.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase";
import { clearUserSession, createAdminSession, createUserSession } from "@/lib/session";
import { getEnv } from "@/lib/env";

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
    return { ok: true, message: "Welcome back!" };
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

  return {
    ok: true,
    message: "Welcome to the game. You got 1,000 ECY Bucks.",
  };
}

// Clears auth cookies and redirects back to the login page.
export async function logoutAction() {
  await clearUserSession();
  redirect("/login");
}

// Verifies the admin password and issues a separate admin session cookie.
export async function adminLoginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  if (password !== getEnv().adminPassword) {
    return {
      ok: false,
      message: "Incorrect admin password.",
    };
  }

  await createAdminSession();
  revalidatePath("/admin");

  return {
    ok: true,
    message: "Admin mode enabled.",
  };
}
