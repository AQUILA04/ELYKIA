import { test as base } from '@playwright/test';

// Extend base test with custom fixtures if needed
export const test = base.extend({
  // Add custom fixtures here (e.g., authenticated context)
});

export { expect } from '@playwright/test';
