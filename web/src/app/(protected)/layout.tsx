import { requireAuth } from '@/lib/auth/auth-server';
import { TopNav } from '@/components/nav/TopNav';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default async function ProtectedLayout({
  children,
}: ProtectedLayoutProps): Promise<React.ReactElement> {
  // Redirects to /auth/signin if not authenticated
  await requireAuth();

  return (
    <>
      <TopNav />
      {children}
    </>
  );
}
