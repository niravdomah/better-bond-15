// Shim so tests can import { axe, configureAxe, toHaveNoViolations } from 'vitest-axe'.
// vitest-axe@0.1.0 main entry only exports axe/configureAxe; toHaveNoViolations
// lives in the matchers sub-module. This file is aliased in vitest.config.ts.
//
// TypeScript paths (tsconfig.json) resolve:
//   __vitest_axe_real__  -> node_modules/vitest-axe/dist/index.js (real entry, no alias loop)
//   vitest-axe/matchers  -> node_modules/vitest-axe/dist/matchers.js
//
// isolatedModules: true requires value re-exports to be verifiable as values.
// We use a direct named import and re-export to satisfy the constraint.
import { axe, configureAxe } from '__vitest_axe_real__';
import { toHaveNoViolations as _toHaveNoViolations } from 'vitest-axe/matchers';

export { axe, configureAxe };

// Re-export as a value-binding so isolatedModules can confirm it is not type-only
export const toHaveNoViolations = _toHaveNoViolations;
