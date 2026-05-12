/**
 * Auth Layout — Server Component
 *
 * Intercepts requests to all /auth/* routes. If the user already has a valid
 * session they are redirected to the home page so they never see the sign-in
 * form again. This is the server-side equivalent of what the proxy.ts would do
 * if the Turbopack dev middleware manifest were fully populated.
 *
 * Why here and not in proxy.ts?
 * In Turbopack dev mode the middleware manifest is not populated, meaning the
 * proxy function is never invoked for incoming requests. The layout approach
 * runs in the Node.js runtime (not Edge) so it can safely call auth() which
 * internally uses bcrypt (a Node.js native module).
 *
 * JWTSessionError handling:
 * If the browser holds a stale session cookie encrypted with a different secret
 * (e.g., after rotating NEXTAUTH_SECRET or after a fresh dev-server start),
 * auth() throws a JWTSessionError. We use getSession() which handles this
 * gracefully: it logs a warning, clears the stale cookie, and returns null.
 * The user sees the sign-in form normally — no 500 error.
 */

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth/auth-server';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default async function AuthLayout({
  children,
}: AuthLayoutProps): Promise<React.ReactElement> {
  // getSession() handles JWTSessionError defensively: stale cookie → null
  const session = await getSession();

  if (session) {
    // Already authenticated — send them to the home page
    redirect('/');
  }

  return <>{children}</>;
}
