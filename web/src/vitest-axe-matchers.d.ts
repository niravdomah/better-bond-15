// Global type augmentation for vitest-axe matchers with Vitest 4.x.
// vitest-axe@0.1.0 augments 'Vi.Assertion' (old namespace), but Vitest 4.x
// uses '@vitest/expect' Matchers interface directly.
import type { AxeResults } from 'axe-core';

declare module '@vitest/expect' {
  interface Matchers<T = unknown> {
    toHaveNoViolations(): Promise<void>;
  }
}
