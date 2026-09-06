# SecurityGuard — LinkedIn Post

---

## Post (Copy-paste ready)

🛡️ Just published my first npm package: **SecurityGuard** — a client-side DevTools detection & anti-inspection SDK for web applications.

Here's the problem: there's no official browser API to detect if DevTools is open. Every existing solution relies on a single trick — a dimension check, a debugger statement, or a keyboard shortcut listener. Each one breaks differently across browsers and produces false positives on mobile, zoom, or even normal resizing.

So I built something different.

**SecurityGuard combines 4 independent detectors into a confidence score:**

🔹 Window dimensions — stable viewport gap heuristic
🔹 Debugger timing — opt-in execution delay probe
🔹 Keyboard shortcuts — F12, Ctrl+Shift+I/J/C, Cmd+Option+I/J/C
🔹 Browser behavior — foreground scheduling drift

**Key design decisions:**

✅ No single signal can trigger a response — at least 2 independent evidence categories must agree
✅ Correlated timing signals share a category, so one browser pause can't count twice
✅ Debounce + cooldown prevents false firing and repeat spam
✅ Debugger probe disabled by default (attached debugger can pause indefinitely)
✅ SSR-safe — no module-level browser access, works in Next.js/React/Vue/Nuxt
✅ Zero runtime dependencies, ~20KB minified, tree-shakable ESM + CJS
✅ TypeScript declarations included
✅ 72 unit tests passing

**4 configurable actions when detection is confirmed:**

→ Overlay — accessible modal dialog with reload button
→ Block — full-screen interaction block
→ Redirect — same-origin safe redirect
→ Callback — monitoring-only mode for logging/analytics

**Important honesty note:**

This is NOT a security boundary. Browsers have no "DevTools is open" API. Determined users can bypass all client-side checks. SecurityGuard is a deterrent and monitoring layer — keep your real security on the server.

**Tech stack:** TypeScript, tsup, Vitest, Vite, jsdom, Playwright

📦 npm: https://www.npmjs.com/package/@0xzahed/security-guard
🐙 GitHub: https://github.com/0xzahed/security-guard
🚀 Live demo: https://landing-sepia-one-49.vercel.app

#webdev #typescript #npm #security #frontend #javascript #websecurity #devtools #opensourcesoftware #ssr #react #nextjs #vue #angular

---

## SEO Keywords (embedded naturally)

- Client-side DevTools detection
- Anti-inspection SDK
- Browser security monitoring
- TypeScript npm package
- Web application security
- Frontend security library
- DevTools detection JavaScript
- SSR-safe security SDK
- Zero dependency npm package
- Confidence scoring detection
- Web inspection prevention
- Browser developer tools detection

---

## Posting Tips

1. **Best time:** Tuesday–Thursday, 8–10 AM or 1–3 PM (your timezone)
2. **Tag people:** Tag any dev advocates, TypeScript community members, or security researchers you know
3. **First comment:** Add the live demo link in the first comment to boost engagement
4. **Image:** Attach a screenshot of the landing page or the demo console
5. **Hashtags:** Keep 10–15 hashtags, mix broad (#webdev) with niche (#devtoolsdetection)
6. **Engagement:** Reply to every comment within the first hour to boost reach
7. **Cross-post:** Share to Twitter/X with a shorter version linking to the LinkedIn post

---

## Short Version (for Twitter/X)

Published @0xzahed/security-guard on npm — a client-side DevTools detection SDK for web apps.

4 independent detectors → confidence score → configurable actions (overlay/block/redirect/callback)

- ~20KB, zero deps
- SSR-safe (Next.js, React, Vue)
- 72 tests
- TypeScript-first

No single signal can trigger. Two categories required. Honest about limitations.

npm: https://www.npmjs.com/package/@0xzahed/security-guard
GitHub: https://github.com/0xzahed/security-guard
Demo: https://landing-sepia-one-49.vercel.app

#typescript #npm #webdev #security

---

## Medium Hashnode Version (for blog cross-post)

### Title: I Built a Client-Side DevTools Detection SDK — Here's What I Learned

Browsers don't have a "DevTools is open" API. Every existing detection method is a hack. So I built SecurityGuard — an npm package that combines 4 independent signals into a confidence score instead of relying on one trick.

**The core insight:** No single signal is reliable. Window dimensions break on mobile. Debugger statements can freeze the page. Keyboard shortcuts have false positives. Timing checks are affected by CPU load.

**The solution:** Require at least two independent evidence categories to agree before triggering a response. Group correlated signals (debugger + behavior timing) so one browser pause can't count twice. Add debounce, cooldown, and signal TTL.

**What I built:**

- 4 detectors: dimensions, debugger timing, keyboard shortcuts, browser behavior
- Centralized scoring with configurable weights and threshold
- 4 actions: overlay, block, redirect, callback
- SSR-safe (no module-level browser access)
- Zero runtime dependencies, ~20KB
- 72 unit tests with Vitest
- Full TypeScript with strict mode
- Consumer validation with Next.js, React, and Playwright

**The honest part:** This is a deterrent, not a security boundary. Determined users can bypass it. Your real security belongs on the server.

Links in the first comment 👇

#typescript #npm #webdev #security #frontend
