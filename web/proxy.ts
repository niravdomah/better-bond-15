/**
 * Next.js 16 Proxy - Lightweight Request Interception
 *
 * IMPORTANT: This file uses Next.js 16's new proxy convention.
 * - File name: proxy.ts (NOT middleware.ts)
 * - Export name: proxy (NOT middleware)
 * - Runtime: Edge-compatible (do NOT import Node.js native modules here)
 *
 * Following Next.js 16 and Vercel's security best practices:
 * - This proxy is used ONLY for lightweight redirects
 * - Authentication/authorization checks are in Server Components (layouts)
 * - This prevents middleware-based authentication vulnerabilities
 *
 * See:
 * - https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 * - https://nextjs.org/docs/messages/middleware-to-proxy
 */

import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

/**
 * Session token cookie name — must match auth.config.ts cookie configuration.
 * NextAuth v5 defaults to 'authjs.session-token', but this project uses
 * 'next-auth.session-token' (configured in auth.config.ts cookies.sessionToken).
 * The salt used during JWT encryption is set to the cookie name by NextAuth core,
 * so getToken() must use the same cookieName for correct decryption.
 */
const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === 'production'
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';

/**
 * Proxy function - handles lightweight request interception
 *
 * Current responsibilities:
 * - Redirect authenticated users away from auth pages (signin)
 *
 * NOT handled here (moved to layouts):
 * - Authentication checks → See app/(protected)/layout.tsx
 *
 * NOTE: Uses getToken() instead of auth() because this proxy runs in Edge
 * runtime. auth() imports bcrypt (a Node.js native module) which is
 * incompatible with Edge. getToken() reads the JWT from cookies directly
 * using only Web-standard APIs and is therefore Edge-safe.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Redirect authenticated users away from the sign-in page
  const authRoutes = ['/auth/signin'];
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isAuthRoute) {
    // getToken is Edge-compatible — reads the JWT from the session cookie
    // without requiring Node.js native modules like bcrypt.
    // cookieName defaults salt to the same value (NextAuth core convention).
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: SESSION_COOKIE_NAME,
    });

    if (token) {
      // User is already logged in, redirect to home
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Allow request to continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
