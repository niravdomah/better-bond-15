'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from '@/lib/auth/auth-client';

/**
 * Validates callback URL to prevent open redirect attacks.
 * Only allows relative URLs (same-origin).
 */
function validateCallbackUrl(url: string | null): string {
  if (!url) return '/';

  try {
    if (url.startsWith('//')) {
      console.warn('Open redirect attempt blocked:', url);
      return '/';
    }

    if (!url.startsWith('/')) {
      console.warn('Open redirect attempt blocked:', url);
      return '/';
    }

    if (url.toLowerCase().match(/^\/*(data|javascript):/i)) {
      console.warn('Potential XSS attempt blocked:', url);
      return '/';
    }

    return url;
  } catch (error) {
    console.error('Error validating callback URL:', error);
    return '/';
  }
}

function SignInForm(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = validateCallbackUrl(searchParams.get('callbackUrl'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn(email, password);

      if (result.ok) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch {
      setError('An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      {/* MortgageMax navy header bar with logo */}
      <div className="w-full bg-primary py-4 px-6 flex items-center justify-center mb-8">
        <Image
          src="/morgagemaxlogo.png"
          alt="MortgageMax"
          height={36}
          width={180}
          priority
          style={{ objectFit: 'contain' }}
        />
      </div>

      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <h1 className="text-xl font-semibold leading-none text-primary">
            MortgageMax Payments
          </h1>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div
                className="rounded-md bg-destructive/15 p-3 text-sm text-destructive"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function SignInPage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div>Loading...</div>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
