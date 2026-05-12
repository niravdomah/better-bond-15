import { test } from '@playwright/test';

// Story 1.3 is infrastructure only (API client + utilities); Vitest covers all ACs.
// E2E coverage for the endpoint functions comes from Epic 2-4 stories that exercise
// them against the running backend.
test.fixme('Epic 1, Story 3: API Client Configuration and Shared Utilities (infrastructure-only)', () => {});
