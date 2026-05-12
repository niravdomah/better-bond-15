/**
 * Server-Side Authentication Helpers — MortgageMax Commission Payments POC
 *
 * Single-role POC: only requireAuth() and getSession() are needed.
 * Multi-role guards (requireMinimumRole, requireExactRole, etc.) have been
 * removed per AC-11 and FRS NFR3.
 *
 * These functions should ONLY be used in Server Components and Server Actions.
 * For Client Components, use hooks from auth-client.ts instead.
 */

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { JWTSessionError } from '@auth/core/errors';

import { auth } from '@/lib/auth/auth';

import type { Session } from 'next-auth';

/**
 * Cookie names used by Auth.js v5 for the session token.
 * The __Secure- prefix variant is used in production (HTTPS), the plain
 * variant is used in development (HTTP). We clear both defensively.
 */
const SESSION_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

/**
 * Attempts to clear stale/invalid session cookies.
 *
 * NOTE: In Next.js 16 Server Components, `cookies().delete()` is supported
 * but only works within a Server Action or Route Handler context where
 * response headers can be modified. In a Server Component render (like a
 * layout), cookie deletion via `cookies()` may be silently ignored by the
 * runtime. If the stale cookie persists after this call, the user should
 * manually clear cookies for localhost:3000 in DevTools (Application →
 * Cookies → Clear All).
 */
async function clearStaleCookies(): Promise<void> {
  try {
    const cookieStore = await cookies();
    for (const name of SESSION_COOKIE_NAMES) {
      cookieStore.delete(name);
    }
  } catch {
    // Cookie deletion is best-effort in Server Component context; ignore failures.
  }
}

/**
 * Gets the current session without requiring authentication.
 * Returns null if not authenticated.
 *
 * This is the CANONICAL defensive wrapper around auth(). All other server-side
 * auth helpers call this function rather than calling auth() directly, so that
 * defensive error handling lives in one place.
 *
 * If auth() throws a JWTSessionError (e.g., stale cookie encrypted with a
 * different secret), the error is logged as a warning and the user is treated
 * as unauthenticated. The stale cookie is cleared so subsequent requests
 * succeed immediately.
 *
 * Usage in Server Components:
 * ```tsx
 * export default async function OptionalAuthPage() {
 *   const session = await getSession();
 *   if (session) {
 *     return <div>Welcome {session.user.name}</div>;
 *   }
 *   return <div>Welcome Guest</div>;
 * }
 * ```
 *
 * @returns Session object if authenticated, null otherwise
 */
export async function getSession(): Promise<Session | null> {
  try {
    return await auth();
  } catch (error) {
    // JWTSessionError is thrown when Auth.js cannot decrypt the session cookie.
    // The most common cause is a stale cookie encrypted with a different secret
    // (e.g., after rotating NEXTAUTH_SECRET or after a fresh dev-server start).
    // This is NOT a security breach — the cookie simply can't be read, which is
    // the correct security behaviour. We treat it as "no session" and clear the
    // stale cookie so the next request starts clean.
    if (
      error instanceof JWTSessionError ||
      (error instanceof Error && error.name === 'JWTSessionError') ||
      (error instanceof Error &&
        error.cause instanceof Error &&
        error.cause.message.includes('no matching decryption secret'))
    ) {
      console.warn(
        'Stale session cookie rejected; treating user as unauthenticated.',
      );
      await clearStaleCookies();
      return null;
    }

    // For any other error, re-throw so it surfaces normally and isn't silently
    // swallowed. We do not suppress real auth bugs.
    throw error;
  }
}

/**
 * Requires authentication for the current page.
 * Redirects to sign-in if not authenticated.
 *
 * Usage in Server Components:
 * ```tsx
 * export default async function DashboardPage() {
 *   const session = await requireAuth();
 *   // User is guaranteed to be authenticated here
 *   return <div>Welcome {session.user.name}</div>;
 * }
 * ```
 *
 * @param callbackUrl - Optional URL to redirect back to after sign-in
 * @returns Session object if authenticated
 */
export async function requireAuth(callbackUrl?: string): Promise<Session> {
  // Use getSession() (not auth() directly) so JWTSessionError is handled
  // defensively — a stale cookie redirects to sign-in rather than 500ing.
  const session = await getSession();

  if (!session) {
    // Auto-detect current path if callbackUrl not provided
    let redirectUrl = callbackUrl;
    if (!redirectUrl) {
      const headersList = await headers();
      const pathname =
        headersList.get('x-pathname') || headersList.get('x-invoke-path');
      if (pathname) {
        redirectUrl = pathname;
      }
    }

    const signInUrl = redirectUrl
      ? `/auth/signin?callbackUrl=${encodeURIComponent(redirectUrl)}`
      : '/auth/signin';
    redirect(signInUrl);
  }

  return session;
}
