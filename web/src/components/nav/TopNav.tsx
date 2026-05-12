'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { signOut } from '@/lib/auth/auth-client';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/' },
  { label: 'Payment Management', href: '/payment-management' },
  { label: 'Payments Made', href: '/payments-made' },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href;
}

function NavLink({
  label,
  href,
  active,
  onClick,
}: {
  label: string;
  href: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={[
        'text-white text-sm font-medium px-3 py-2 transition-colors',
        active
          ? 'border-b-2 border-secondary text-secondary'
          : 'hover:text-secondary',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
  };

  return (
    <nav className="bg-[#1A3A6E] w-full" aria-label="Main navigation">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <Image
              src="/morgagemaxlogo.png"
              alt="MortgageMax logo"
              width={160}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </div>

          {/* Desktop nav links — hidden on mobile */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.href}
                label={link.label}
                href={link.href}
                active={isActive(pathname, link.href)}
              />
            ))}
          </div>

          {/* Desktop Sign Out — hidden on mobile */}
          <div className="hidden md:flex md:items-center">
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="text-white hover:text-secondary hover:bg-transparent"
            >
              Sign Out
            </Button>
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open menu"
                  className="text-white hover:bg-transparent hover:text-secondary"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-[#1A3A6E]">
                <SheetHeader>
                  <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 mt-6">
                  {NAV_LINKS.map((link) => (
                    <NavLink
                      key={link.href}
                      label={link.label}
                      href={link.href}
                      active={isActive(pathname, link.href)}
                      onClick={() => setMobileOpen(false)}
                    />
                  ))}
                  <Button
                    variant="ghost"
                    onClick={handleSignOut}
                    className="text-white hover:text-secondary hover:bg-transparent justify-start px-3"
                  >
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
