"use server";

/*
 * Server actions for username login, logout, and admin-password session unlock.
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase";
import { clearUserSession, createUserSession } from "@/lib/session";
import { leaderboardTag } from "@/lib/cache-tags";

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

  // Parse and validate table number (optional)
  let tableNumber: number | null = null;
  const rawTableNumber = formData.get("tableNumber");
  if (rawTableNumber) {
    const parsed = parseInt(String(rawTableNumber), 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 20) {
      return {
        ok: false,
        message: "Table number must be between 1 and 20.",
      };
    }
    tableNumber = parsed;
  }

  const supabase = createSupabaseAdmin();

  const { data: existing, error: findError } = await supabase
    .from("users")
    .select("id, username, table_number")
    .ilike("username", username)
    .maybeSingle();

  if (findError) {
    return {
      ok: false,
      message: findError.message,
    };
  }

  if (existing) {
    // Update table_number if provided on returning login
    if (tableNumber !== null && tableNumber !== existing.table_number) {
      const { error: updateError } = await supabase
        .from("users")
        .update({ table_number: tableNumber })
        .eq("id", existing.id);

      if (updateError) {
        return {
          ok: false,
          message: updateError.message,
        };
      }

      revalidateTag(leaderboardTag);
    }

    await createUserSession(existing.id, existing.username);
    revalidatePath("/");
    redirect("/");
  }

  const { data: created, error: createError } = await supabase
    .from("users")
    .insert({ username, balance: 1000, table_number: tableNumber })
    .select("id, username")
    .single();

  if (createError || !created) {
    return {
      ok: false,
      message: createError?.message ?? "Unable to create account.",
    };
  }

  await createUserSession(created.id, created.username);
  revalidateTag(leaderboardTag);
  revalidatePath("/");
  redirect("/");
}

// Clears auth cookies and redirects back to the login page.
export async function logoutAction() {
  await clearUserSession();
  redirect("/login");
}
