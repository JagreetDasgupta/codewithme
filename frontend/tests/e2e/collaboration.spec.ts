import { test, expect } from '@playwright/test';

test('multi-user presence and locked range contention', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  await pageA.goto('/');
  await pageB.goto('/');
  // Assumes an existing session route and auth; in CI, seed user/token or mock
  await pageA.goto('/session/test-session');
  await pageB.goto('/session/test-session');
  await pageA.locator('.monaco-editor').first().waitFor({ state: 'visible' });
  await pageB.locator('.monaco-editor').first().waitFor({ state: 'visible' });

  // Type in editor A and expect update visible on editor B
  await pageA.keyboard.type('function f(){return 1}');
  // Allow short propagation time
  await pageB.waitForTimeout(300);
  const contentB = await pageB.locator('.monaco-editor').innerText();
  expect(contentB).toContain('function f');

  // Lock a selection in A
  await pageA.keyboard.press('Control+L');
  // Try to type in B and expect blocked (activity log updates)
  await pageB.keyboard.type('blocked');
  await pageB.waitForTimeout(200);
  const activity = await pageB.locator('text=Edit blocked').count();
  expect(activity).toBeGreaterThan(0);

  await ctxA.close();
  await ctxB.close();
});
