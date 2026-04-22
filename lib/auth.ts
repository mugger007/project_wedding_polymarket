import "server-only";

/*
 * Server-side authentication helpers for reading and enforcing current user context.
 */

import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseAdmin } from "@/lib/supabase";
import { getUserSession } from "@/lib/session";
import type { User } from "@/types";

// Resolves the authenticated session to a canonical user row from the database.
const getCurrentUserCached = cache(async (): Promise<User | null> => {
  const session = await getUserSession();
  if (!session) {
    return null;
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, balance, created_at")
    .eq("id", session.userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    ...data,
    balance: Number(data.balance),
  } as User;
});

export async function getCurrentUser(): Promise<User | null> {
  return getCurrentUserCached();
}

// Redirects anonymous visitors to login and returns a guaranteed user object otherwise.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
