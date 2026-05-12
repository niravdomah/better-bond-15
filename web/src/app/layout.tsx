import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { SessionProvider } from '@/components/auth/session-provider';
import { getSession } from '@/lib/auth/auth-server';

export const metadata: Metadata = {
  title: 'MortgageMax Payments',
  description: 'BetterBond Commission Payments — MortgageMax',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Use getSession() rather than auth() directly so that JWTSessionError
  // (stale cookie encrypted with a different secret) is handled gracefully —
  // the user is treated as unauthenticated instead of receiving a 500.
  const session = await getSession();

  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider session={session}>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">{children}</main>
          </div>
          <Toaster duration={5000} />
        </SessionProvider>
      </body>
    </html>
  );
}
