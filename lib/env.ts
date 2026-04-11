/*
 * Centralized environment variable validation and typed config access.
 */
const requiredServerEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SESSION_SECRET",
] as const;

// Validates required env vars once and returns normalized app configuration.
export function getEnv() {
  for (const key of requiredServerEnv) {
    if (!process.env[key] || process.env[key]?.trim() === "") {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    supabaseAnonKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    sessionSecret: process.env.SESSION_SECRET as string,
    adminAllowedUsernames: (process.env.ADMIN_ALLOWED_USERNAMES || "")
      .split(",")
      .map((username) => username.trim().toLowerCase())
      .filter(Boolean),
    nodeEnv: process.env.NODE_ENV || "development",
  };
}

export function canAccessAdmin(username: string) {
  const { adminAllowedUsernames } = getEnv();
  return adminAllowedUsernames.includes(username.trim().toLowerCase());
}
