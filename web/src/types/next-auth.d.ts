/**
 * NextAuth Type Extensions — MortgageMax Commission Payments POC
 *
 * Single-role POC: the session carries { user: { id, email, name } }.
 * No role field is required (AC-11, FRS NFR3).
 */

import { DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

/**
 * Extend the Session user object to include id.
 * No role field — single-role POC (AC-11).
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
  }
}

/**
 * Extend the JWT token to include id.
 * No role field — single-role POC.
 */
declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string;
  }
}
