import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable dev indicators (incl. "Open Next.js Dev Tools" button) so that
  // Playwright locators like getByRole('button', { name: /next/i }) resolve
  // unambiguously to application buttons during E2E tests.
  devIndicators: false,
};

export default nextConfig;
