import bcrypt from 'bcryptjs';

import type { NextAuthConfig } from 'next-auth';

/**
 * Authentication Configuration — MortgageMax Commission Payments POC
 *
 * Single demo credential for the POC (FRS NFR3, NFR5):
 *   Email:    admin@example.com
 *   Password: Admin123!
 *
 * No role field in the session (single-role POC — all authenticated users
 * share identical permissions per FRS NFR3).
 *
 * PRODUCTION NOTE:
 * Demo credentials are ONLY active in development (NODE_ENV !== 'production').
 * For production, configure a real authentication provider.
 */

// NEXTAUTH_SECRET validation
if (!process.env.NEXTAUTH_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SECURITY ERROR: NEXTAUTH_SECRET is not set!\n\n' +
        'You MUST set NEXTAUTH_SECRET environment variable in production.\n' +
        'Generate one with: openssl rand -base64 32',
    );
  } else {
    console.warn(
      'WARNING: NEXTAUTH_SECRET is not set. Using a default for development only.',
    );
  }
}

if (
  process.env.NODE_ENV === 'production' &&
  process.env.NEXTAUTH_SECRET &&
  process.env.NEXTAUTH_SECRET.length < 32
) {
  throw new Error(
    'SECURITY ERROR: NEXTAUTH_SECRET is too short!\n\n' +
      'NEXTAUTH_SECRET must be at least 32 characters in production.\n' +
      'Generate one with: openssl rand -base64 32',
  );
}

/**
 * Single demo user — POC only, development and test mode only.
 * Password is bcrypt-hashed (Admin123!).
 */
const demoUsers = [
  {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    password: '$2b$10$KeIrQDTJvrTbGsnJhVCNA.AUDy1wuVINdO1ZfVSo31ptnAfPMfbO2', // Admin123!
  },
];

/**
 * The credentials authorize function — exposed directly for testability.
 * Tests import auth.config and call providers[0].authorize() directly.
 */
async function authorize(credentials: Record<string, unknown>): Promise<{
  id: string;
  email: string;
  name: string;
} | null> {
  // Demo users are ONLY available in development and test mode
  if (process.env.NODE_ENV === 'production') {
    console.error(
      'Demo credentials are disabled in production. ' +
        'Please configure a real authentication provider.',
    );
    return null;
  }

  const email = credentials?.email;
  const password = credentials?.password;

  if (!email || !password) {
    return null;
  }

  // Find user by email (development/test only)
  const user = demoUsers.find((u) => u.email === email);

  if (!user) {
    return null;
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password as string, user.password);

  if (!passwordMatch) {
    return null;
  }

  // Return user object without role (single-role POC — AC-11)
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

export const authConfig: NextAuthConfig = {
  providers: [
    {
      id: 'credentials',
      name: 'Credentials',
      type: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize,
    },
  ],

  pages: {
    signIn: '/auth/signin',
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.callback-url'
          : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Host-next-auth.csrf-token'
          : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
