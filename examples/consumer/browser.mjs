import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', err => errors.push(err.message));

// --- Next.js consumer app: SSR + hydration + Strict Mode ---
await page.goto('http://127.0.0.1:3001/', { waitUntil: 'networkidle' });
assert.match(await page.locator('#server-status').textContent(), /SSR: unsupported/);
assert.match(await page.locator('#client-status').textContent(), /Client: running/);

// Strict Mode remount: toggle monitor off then on
await page.locator('#toggle').click();
await page.waitForTimeout(200);
assert.match(await page.locator('#client-status').textContent(), /Client: stopped/);
await page.locator('#toggle').click();
await page.waitForTimeout(200);
assert.match(await page.locator('#client-status').textContent(), /Client: running/);

// --- Demo app: lifecycle, overlay, block, cleanup ---
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
assert.match(await page.locator('#lifecycle').textContent(), /stopped/i);
await page.locator('#start').click();
assert.match(await page.locator('#lifecycle').textContent(), /running/i);
assert.match(await page.locator('#state').textContent(), /Normal/);
assert.match(await page.locator('#score').textContent(), /^0/);

// Preview overlay action
await page.locator('#preview').click();
const overlay = page.locator('dialog[data-security-guard="overlay"]');
await overlay.waitFor({ state: 'visible', timeout: 3000 });
assert.match(await overlay.locator('h2').textContent(), /Access Restricted/);
assert.match(await overlay.locator('button').textContent(), /Reload page/);
await page.waitForTimeout(6500);
await overlay.waitFor({ state: 'detached', timeout: 3000 });

// Preview block action
await page.locator('#action').selectOption('block');
await page.locator('#preview').click();
const blockLayer = page.locator('dialog[data-security-guard="block"]');
await blockLayer.waitFor({ state: 'visible', timeout: 3000 });
assert.equal(await blockLayer.locator('button').count(), 0);
await page.waitForTimeout(6500);
await blockLayer.waitFor({ state: 'detached', timeout: 3000 });

// Stop and verify cleanup
await page.locator('#stop').click();
assert.match(await page.locator('#lifecycle').textContent(), /stopped/i);
assert.equal(await page.locator('dialog').count(), 0);

// No uncaught errors across both apps
assert.deepEqual(errors, [], `Unexpected page errors: ${errors.join('; ')}`);

await browser.close();
console.log('Browser consumer: Next.js SSR/hydration, Strict Mode, demo overlay/block preview, and cleanup passed.');
