import "server-only";

/*
 * Signed cookie session utilities for user and admin authentication state.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

const SESSION_COOKIE_NAME = "ecy_session";
const ADMIN_COOKIE_NAME = "ecy_admin";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

// Encodes plain text payload data into URL-safe base64.
function toBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

// Decodes URL-safe base64 data back into plain text.
function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

// Produces HMAC signature for tamper detection of cookie payloads.
function sign(payload: string) {
  const { sessionSecret } = getEnv();
  return createHmac("sha256", sessionSecret).update(payload).digest("base64url");
}

// Creates signed token string from an object payload.
function buildToken(payloadObj: Record<string, string | number>) {
  const payload = toBase64Url(JSON.stringify(payloadObj));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

// Validates token signature and expiration before returning parsed payload.
function verifyToken(token?: string | null) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [payload, signature] = token.split(".");
  const expected = sign(payload);

  const sigBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");

  if (sigBuf.length !== expectedBuf.length) {
    return null;
  }

  if (!timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const json = JSON.parse(fromBase64Url(payload)) as {
      userId?: string;
      username?: string;
      exp?: number;
      role?: string;
    };

    if (!json.exp || Date.now() >= json.exp) {
      return null;
    }

    return json;
  } catch {
    return null;
  }
}

// Issues user session cookie after login.
export async function createUserSession(userId: string, username: string) {
  const cookieStore = await cookies();
  const exp = Date.now() + SESSION_DURATION_SECONDS * 1000;

  cookieStore.set(
    SESSION_COOKIE_NAME,
    buildToken({ userId, username, exp, role: "user" }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: getEnv().nodeEnv === "production",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    },
  );
}

// Clears all auth cookies on logout.
export async function clearUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

// Reads and verifies current user session cookie.
export async function getUserSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const parsed = verifyToken(token);

  if (!parsed?.userId || !parsed.username) {
    return null;
  }

  return {
    userId: parsed.userId,
    username: parsed.username,
  };
}

// Issues separate admin session cookie after password verification.
export async function createAdminSession() {
  const cookieStore = await cookies();
  const exp = Date.now() + SESSION_DURATION_SECONDS * 1000;

  cookieStore.set(ADMIN_COOKIE_NAME, buildToken({ exp, role: "admin" }), {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().nodeEnv === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

// Returns whether a valid admin session cookie exists.
export async function hasAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const parsed = verifyToken(token);
  return parsed?.role === "admin";
}
