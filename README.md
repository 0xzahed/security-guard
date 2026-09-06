# SecurityGuard

**Client-side anti-inspection and security monitoring for web applications.** TypeScript-first, framework-independent, SSR-safe, with zero runtime dependencies.

SecurityGuard combines ambiguous browser signals into a configurable score, requires multiple independent evidence categories, and optionally responds with an accessible overlay, interaction block, redirect, or callback.

**There is no official, reliable browser API for “DevTools is open.” Detection is not guaranteed. Determined users can bypass all client-side checks. This SDK is a deterrent and monitoring layer, not authentication, authorization, DRM, API protection, or a place to store secrets.**

## Installation

Node.js 20+ is required for package tooling. Use a currently supported Node LTS release when possible.

```bash
npm install @yourname/security-guard
```

The repository uses the requested npm scope `@yourname`. Before publishing, change it to a scope you own. Until published, install a local tarball with `npm pack` followed by `npm install /absolute/path/to/yourname-security-guard-1.0.0.tgz`.

ES modules, CommonJS, source maps, and TypeScript declarations are included. The package has no runtime dependencies. Browser bundlers can tree-shake ESM exports. Standalone detectors and scoring are available through `/detectors` and `/scoring` subpaths.

## Quick start / Vanilla JavaScript

In a Vite, webpack, or other bundled browser entry:

```ts
import SecurityGuard from '@yourname/security-guard';

const guard = SecurityGuard.start({
  devtools: true,
  action: 'overlay',
});

window.addEventListener('pagehide', () => guard.stop(), { once: true });
```

For a plain unbundled site, copy **all** ESM files from `dist`, retaining their relative paths, into a public directory, then use `<script type="module">` and import from `/security-guard/index.js`. Bare npm imports need a bundler or import map. Do not copy only `index.js`: shared chunks are required.

For initial rollout, use a callback to evaluate false positives before enabling blocking actions:

```ts
import { createSecurityGuard } from '@yourname/security-guard';

const guard = createSecurityGuard().start({
  action: {
    type: 'callback',
    handler(event) {
      console.info('Inspection heuristic score:', event.confidence);
    },
  },
});

guard.stop();
```

## Configuration

```ts
import SecurityGuard, { type SecurityGuardConfig } from '@yourname/security-guard';

const config = {
  devtools: { enabled: true, threshold: 60, interval: 1000 },
  keyboard: { enabled: true },
  behavior: { enabled: true, delayThreshold: 1500 },
  debugger: { enabled: false, interval: 15000, delayThreshold: 1500 },
  sensitivity: 'medium',
  scoring: {
    threshold: 60,
    weights: { dimension: 20, debugger: 40, keyboard: 15, behavior: 25 },
  },
  debounce: 1000,
  clearDebounce: 2000,
  cooldown: 30000,
  signalTtl: 10000,
  action: 'overlay',
  reporting: false,
  onDetected(event) {
    console.info('Confirmed heuristic episode:', event.confidence);
  },
} satisfies SecurityGuardConfig;

SecurityGuard.start(config);
```

All durations are in milliseconds. Configuration is copied and validated before replacing a running instance. Invalid finite ranges throw `RangeError`; invalid action/configuration structures or unsafe URLs throw `TypeError`. TypeScript types are the supported configuration contract; configuration is not an untrusted JSON schema validator.

Defaults and constraints:

- `devtools`: enabled. `false` or `{ enabled: false }` disables **all** detectors. No polling or detector listeners are attached.
- `devtools.interval`: 1,000; allowed 250–60,000. Sampling uses a self-scheduling timeout, not an overlapping interval.
- `sensitivity`: `medium`. `low` uses threshold 75, gap 220px, settling 3,000ms; `medium` uses 60 / 180px / 2,000ms; `high` uses 50 / 150px / 1,500ms.
- Threshold priority: `scoring.threshold` > `devtools.threshold` > sensitivity preset. Allowed 1–100.
- `scoring.weights`: dimension 20, debugger 40, keyboard 15, behavior 25. Partial overrides are supported; values must be finite and 0–100. Zero removes a signal's scoring contribution.
- `keyboard.enabled`: true. Listens only for inspection shortcuts; never prevents their default behavior.
- `behavior.enabled`: true. Foreground scheduling drift threshold defaults to 1,500; allowed 500–60,000. Drifts above 10,000 are discarded as likely suspension, so thresholds above that effectively disable positive observations.
- `debugger.enabled`: **false**. Explicitly enable only after considering the pause risk below.
- `debugger.interval`: 15,000; allowed 5,000–300,000. First probe waits a full interval.
- `debugger.delayThreshold`: 1,500; allowed 100–60,000.
- `debounce`: 1,000; allowed 0–60,000. Qualifying observations must persist across samples.
- `clearDebounce`: 2,000; allowed 0–60,000. Below-threshold evidence must persist before recovery.
- `cooldown`: 30,000; allowed 0–3,600,000. Minimum time between detection episodes, measured from the previous detection. Persistent detection never repeatedly fires, even after cooldown expires.
- `signalTtl`: 10,000, automatically raised to twice the sampling interval if needed. Explicit values must be at least `max(1000, interval * 2)` and at most 300,000. A future or expired timestamp contributes nothing.
- `action`: `overlay`.
- `reporting`: disabled.

A low preset or custom threshold can intentionally be unreachable with the enabled detectors. No configuration bypasses the two-category confirmation rule. The default non-debugger configuration reaches 60 only when **layout (20), interaction (15), and timing/behavior (25)** coincide. A dimension gap alone never causes an action. With an opt-in debugger probe, layout plus debugger timing can reach 60. These conservative defaults favor missed detections over aggressive blocking.

## Detection methods

Each detector exposes `name`, `group`, `start()`, `sample()`, and `stop()`. A sample is structured:

```ts
interface DetectionSignal {
  name: string;
  detected: boolean;
  confidence: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

`confidence` is signal quality from 0–100, **not an additive point value or statistical probability**. V1 built-in detectors return 100 for a positive observation and 0 otherwise. The scorer scales each weight by quality. Timestamps use epoch milliseconds; interval/debounce/cooldown comparisons use monotonic `performance.now()`.

### Window dimension heuristic — layout category

Detects a stable outer/inner window gap beyond the configured preset. Supported where `outerWidth`, `outerHeight`, `innerWidth` and `innerHeight` provide meaningful measurements in modern desktop browsers.

Suppresses evidence while resizing/orienting, on coarse-pointer devices, at widths below 768px, during reported pinch zoom, or after the device-pixel ratio differs from its startup baseline. `visualViewport` and `matchMedia` are feature-tested. A pixel-ratio change suppresses this detector until it returns to baseline or observation restarts.

**False positives:** browser chrome, side panels, OS UI and unusual desktop configurations can look like a docked inspector. **Limitations:** undocked tools usually do not change viewport dimensions; zoom detection is incomplete; emulation can mask desktop/mobile signals. This detector is never sufficient alone. Metadata contains numeric width/height gaps only.

### Debugger timing heuristic — timing category, opt-in

Measures `performance.now()` before and after a real `debugger` statement, while visible and focused. A long delay becomes weak inspection evidence. JavaScript supports this statement in current major browsers, but user settings and bundlers can disable/remove it.

**Critical limitation:** when an attached debugger honors the statement, execution can pause **indefinitely until the user resumes**. JavaScript cannot safely impose a timeout on its own paused execution. A long interval avoids aggressive repeated probes; it does not bound an individual pause. No busy loops, console tricks or continuous freezing are used. Keep it disabled unless this trade-off is acceptable. Ensure your consuming bundler does not strip debugger statements if enabling this detector.

**False positives:** GC, CPU contention, OS sleep and execution scheduling. **False negatives:** breakpoints disabled, ignored statements, remote tools, transformed code, or deliberately bypassed probes. Metadata contains only rounded delay duration. Keyboard and timing can both result from an innocent shortcut; evidence categories reduce correlation, not eliminate it.

### Keyboard shortcut heuristic — interaction category

Observes trusted, non-repeated, non-composing `keydown` events for F12, Ctrl+Shift+I/J/C and Cmd+Option+I/J/C. Other key values are not retained; form values are never read. No `preventDefault` is used by this detector.

**Compatibility:** only shortcuts actually delivered to the page can be seen. Browser/OS-reserved combinations may not dispatch a page event. **False positives:** custom application shortcuts or a user trying a combination. **Limitations:** a shortcut does not prove tools opened; menus, remote inspection and existing tools may have no event. Synthetic `dispatchEvent` events are ignored. Metadata records only `F12` or `inspection-shortcut`, not arbitrary keystrokes.

### Browser behavior heuristic — timing category

Observes unusually late scheduled sampling while the page remains visible and focused. Drift is measured beyond the expected interval; delays over 10 seconds are ignored. Focus/visibility changes reset the baseline. SDK synchronous work, including its debugger probe, is excluded from the next drift measurement.

**Compatibility:** uses standard timers, Page Visibility and focus APIs. **False positives:** ordinary long tasks, garbage collection, CPU pressure and short machine suspension. **Limitations:** this is a scheduling anomaly, not a specific inspector fingerprint. It is deliberately weak and can be disabled. Both behavior and debugger signals share the **same** category; a single timing interruption cannot provide two confirmations or two additive timing weights.

### Scoring and independent confirmation

```text
Structured signals
  → discard stale/unknown/invalid observations
  → weight each quality score
  → strongest contribution per evidence category
  → sum, round and cap at 100
  → require at least two contributing categories AND threshold
  → detection debounce + per-episode cooldown
  → detected event → onDetected → violation event → report + action
```

Debugger 40 + behavior 25 contributes **40**, not 65. Dimension 20 + debugger 40 contributes 60. Setting dimension weight to 100 still cannot confirm it alone. Categories are conceptual safeguards, not a claim of statistical independence.

```ts
import { calculateScore } from '@yourname/security-guard/scoring';
import { resolveConfig } from '@yourname/security-guard';

const now = Date.now();
const result = calculateScore([
  { name: 'dimension', detected: true, confidence: 100, timestamp: now },
  { name: 'debugger', detected: true, confidence: 100, timestamp: now },
], resolveConfig(), now);
console.info(result.score, result.confirmed); // 60, true
```

Detector constructors are exported from `@yourname/security-guard/detectors` for focused use and testing. Supply a browser context at runtime, call `start()`, periodically `sample()`, then `stop()`. V1's managed guard supports the four built-in names; custom plugins are not accepted by `start()`. Additional detectors can be developed against the exported `Detector` interface and incorporated into a custom orchestration/scoring layer without modifying the built-ins.

## Actions

### Overlay

```ts
SecurityGuard.start({
  action: {
    type: 'overlay',
    title: 'Access Restricted',
    message: 'Possible inspection activity was detected. Reload to retry.',
    buttonLabel: 'Reload page',
  },
});
```

The shorthand is `action: 'overlay'`. Uses a responsive full-viewport modal dialog, accessible title/description, focus containment and a reload button. Text uses `textContent`, never HTML interpolation. Escape does not dismiss the restriction; closing evidence, pause, stop or reload restores access. Repeated false positives may recur after reload; provide an application-specific support/recovery flow when deploying a hard restriction.

### Block

```ts
SecurityGuard.start({ action: 'block' });
```

A controlled modal layer without a reload button. It does not destroy application roots or their state. Body siblings become inert while the layer is present, including new SPA portals. Cleanup restores prior inert attributes, scroll style and focus. Native `dialog.showModal()` is preferred, with a basic focus/pointer containment fallback. Use a modern browser for full inert/top-layer semantics.

Layers are reversible on natural `cleared`, `pause()` and `stop()`. Multiple instances of the same loaded SDK share one reference-counted layer per document. The first active layer's appearance and mode win until all owners release it; prefer one action-owning instance. Separately bundled copies do not coordinate. No layer can reliably control other frames, browser UI, competing top-layer dialogs, or malicious page scripts.

### Redirect

```ts
SecurityGuard.start({ action: { type: 'redirect', url: '/security-blocked' } });
```

Uses `location.replace`. HTTP(S), same-origin URLs only; credentials and script/data URLs are rejected. An identical current URL is not reloaded. **Do not initialize the guard on the redirect destination**, otherwise different route transitions can still create a loop. Navigation is not reversible by `stop()`.

### Callback / monitoring-only

```ts
SecurityGuard.start({
  action: {
    type: 'callback',
    handler(event) {
      document.documentElement.dataset.inspectionScore = String(event.confidence);
    },
  },
});
```

No SDK layer is created. Callbacks are isolated from SDK control flow; thrown exceptions and rejected native promises do not stop other callbacks. Callback-created UI/side effects are the developer's responsibility to clean up. For custom styling, shadow-root applications, application-specific accessibility needs or restrictive CSP, use a callback to render a framework-owned warning instead of weakening CSP for this SDK. Built-in layers assign styles through DOM style APIs and need testing with your actual CSP and host CSS.

## Events

```ts
const unsubscribe = SecurityGuard.on('detected', event => {
  console.info(event.type, event.confidence);
});

const onCleared = (event: import('@yourname/security-guard').SecurityEvent) => {
  console.info('Heuristic episode ended:', event.timestamp);
};
SecurityGuard.on('cleared', onCleared);
SecurityGuard.on('violation', event => {
  console.info('Configured response requested:', event.confidence);
});

unsubscribe();
SecurityGuard.off('cleared', onCleared);
```

- `detected`: one `DEVTOOLS_DETECTED` per confirmed episode.
- `cleared`: one `DEVTOOLS_CLEARED` when evidence remains insufficient for `clearDebounce`. Does **not** prove DevTools closed. Not emitted for explicit stop/pause.
- `violation`: `SECURITY_VIOLATION` immediately before the configured response is attempted. Means policy response requested, not an independently proven security breach or action-success receipt.

Payload contains `type`, `confidence`, `signals`, `timestamp`, and `path: location.pathname`. No query string, hash, cookies, tokens, input values, device identifier, user agent or arbitrary keyboard input is collected. **Paths themselves can contain personal data**; local listeners must handle them accordingly. No browser fingerprint or persistence is created. Each listener receives a separate copy of the built-in signal data.

Listener subscriptions survive `stop()`/`start()` so registration before initialization works. Use the unsubscribe function or `off()` to release subscriber references. Native DOM listeners and SDK timers do not survive `stop()`. Avoid retaining an abandoned shared singleton subscription in a component.

## Optional reporting

```ts
SecurityGuard.start({
  reporting: { endpoint: '/api/security/events', timeout: 3000 },
  action: { type: 'callback', handler: event => console.info(event.confidence) },
});
```

Sends a non-blocking `POST` once per detection episode:

```json
{
  "type": "DEVTOOLS_DETECTED",
  "confidence": 60,
  "timestamp": 1788710000000
}
```

The payload is deliberately whitelisted: **signals and path are not sent by default**. To include a reviewed/sanitized route:

```ts
SecurityGuard.start({
  reporting: {
    endpoint: '/api/security/events',
    includePath: true,
    pathSanitizer(path) {
      return path.startsWith('/users/') ? '/users/:id' : '/other';
    },
  },
});
```

Reporting behavior:

- `reporting: false`, omitted configuration, or `enabled: false` disables reporting.
- Timeout defaults to 3,000ms; allowed 100–30,000ms. Stop/pause abort pending requests and clear timers.
- Fetch failures, HTTP failures, serialization/sanitizer errors, and missing Fetch support are silent. No retries, beacon fallback or background queue. At most two requests are in flight.
- Uses `Content-Type: application/json`, `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`, `cache: 'no-store'`, and `redirect: 'error'`. No cookies, authorization headers or keys are attached. Cookie-authenticated endpoints therefore need a separate appropriate ingestion design.
- Same-origin HTTP(S) by default. To intentionally send telemetry elsewhere, set `allowCrossOrigin: true`; normal CORS and CSP `connect-src` still apply. The endpoint itself is developer-provided: do not place credentials or private values in its URL.
- The browser/network naturally exposes information such as source IP to the recipient. The SDK cannot hide network metadata or control a host service worker. Obtain consent and comply with your privacy policy.
- Treat every report as untrusted, forgeable client telemetry. Apply server-side body validation, rate limits, origin policy and retention limits. **Never grant/deny sensitive authorization based solely on these reports.**

## React

Use an isolated instance inside an effect; cleanup works with React Strict Mode's mount/unmount/remount behavior:

```tsx
import { useEffect } from 'react';
import { createSecurityGuard } from '@yourname/security-guard';

export function SecurityMonitor() {
  useEffect(() => {
    const guard = createSecurityGuard().start({
      action: { type: 'callback', handler: event => console.info(event.confidence) },
    });
    return () => guard.stop();
  }, []);
  return null;
}
```

Mount this once near your application root. No React runtime dependency is bundled in the SDK. For a framework-owned warning, update React state from the action callback and clear it using a `cleared` subscription; unsubscribe on unmount.

## Next.js (App Router)

`app/security-monitor.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { createSecurityGuard } from '@yourname/security-guard';

export default function SecurityMonitor() {
  useEffect(() => {
    const guard = createSecurityGuard().start({ devtools: true, action: 'overlay' });
    return () => guard.stop();
  }, []);
  return null;
}
```

`app/layout.tsx`:

```tsx
import type { ReactNode } from 'react';
import SecurityMonitor from './security-monitor';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body><SecurityMonitor />{children}</body>
    </html>
  );
}
```

The SDK may safely be imported during SSR, but initialization belongs in a client effect. No `dynamic(..., { ssr: false })` workaround is required. Do not access DOM globals in your own render path. For redirect actions, mount the monitor only in protected route layouts, not the blocked destination.

## Vue 3

```vue
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { createSecurityGuard } from '@yourname/security-guard';

const guard = createSecurityGuard();
onMounted(() => guard.start({ action: 'overlay' }));
onUnmounted(() => guard.stop());
</script>

<template><slot /></template>
```

In Angular, start after browser view initialization and call `stop()` in `ngOnDestroy`. Use `NgZone.runOutsideAngular()` for startup if your application patches timers, then explicitly re-enter the zone if your callback updates Angular state. No framework adapters or peer dependencies are required.

## TypeScript

All configuration, events and status fields are exported. Strict TypeScript and declaration files are included for ESM and CJS.

```ts
import { createSecurityGuard, type SecurityGuardConfig, type SecurityEvent } from '@yourname/security-guard';

function observe(event: SecurityEvent): void {
  console.info(event.type, event.confidence);
}
const config: SecurityGuardConfig = {
  sensitivity: 'low',
  action: { type: 'callback', handler: observe },
};
const guard = createSecurityGuard().start(config);
const status = guard.getStatus();
console.info(status.lifecycle, status.state, status.score);
guard.stop();
```

CommonJS:

```js
const { default: SecurityGuard, createSecurityGuard } = require('@yourname/security-guard');
const guard = createSecurityGuard();
SecurityGuard.stop();
guard.stop();
```

## SSR considerations

No module initialization reads `window`, `document`, `navigator` or `location`. Construction and subscription are safe on the server. `start(validConfig)` returns the same instance with lifecycle `unsupported` and score 0 when browser globals are absent. No native listeners, polling, networking or actions are installed. Configuration validation still occurs; invalid configuration can throw on the server. `pause`, `resume`, and `stop` are safe. Call `start()` in a client effect after hydration; an SSR no-op does not automatically start later.

The SDK waits for a document body, page visibility and focus before observing. It stops sampling on focus/visibility loss and uses fresh evidence on return. Existing action layers remain during background suspension; explicit pause removes them. “Cleared” recovery requires fresh foreground observations.

## Browser compatibility

Targets ES2022 and modern evergreen Chrome, Edge, Firefox and Safari. A practical minimum for the native modal/inert experience is Chromium 102+, Firefox 112+, and Safari 15.5+. Feature checks cover visual viewport, media queries, modal dialogs and Fetch; legacy browsers and embedded WebViews need separate application testing and potentially transpilation/polyfills.

Mobile Safari/Chrome are supported as browser environments, **not as reliable mobile DevTools detectors**. Coarse-pointer and narrow-viewport dimension signals are intentionally suppressed. Remote inspection and responsive emulation often cannot be detected. Native Safari is only available on Apple platforms; Linux WebKit automation is not equivalent to testing Safari on a real device.

## False-positive limitations

There is no empirical precision/recall guarantee. Scores are not calibrated probabilities. Do not punish users or make irreversible account decisions from a detection. Resizing, rotation, zoom or a sidebar alone cannot cause an SDK action because confirmation needs multiple evidence categories. Coincidental additional keyboard/timing signals **can still** produce a false positive. Accessibility tools, custom hotkeys, slow devices and responsive design tools need testing against your application.

Start in callback-only mode, review aggregate results, disable inappropriate detectors, raise thresholds/debounce, and choose a humane recovery path. Higher weights do not make evidence more reliable. Never add an aggressive single-signal F12 blocker.

## Security limitations

Users control their browser. They can alter/remove the SDK, patch APIs, prevent events, use remote tools or inspect network resources before execution. A layer does not erase already-downloaded HTML, JavaScript, data, caches, source maps or network responses. It is not sandboxing, cryptography or tamper resistance. Keep secrets, credentials, sensitive validation and authorization on the server; apply authentication, API authorization, rate limits, CSP, output encoding and other appropriate defenses independently.

## Performance and cleanup

The managed engine uses one self-scheduling timeout, 1 second by default, only while visible and focused. Sampling is constant-time over four detectors. No console getter tricks, busy loops, persistent storage, fingerprinting or external assets. Debugger probing is disabled by default and rate-limited when enabled. Each active report has one abort timeout. Modal siblings are observed only while a layer exists.

`stop()` removes all native SDK listeners, timers, pending reports and action ownership. `pause()` stops observation and removes actions but retains lifecycle subscriptions for resuming; use `stop()` for teardown. Internal event subscriber references persist until `off`/unsubscribe or instance garbage collection. Callback work and callback-created resources are outside SDK control. Timings can be delayed by a busy browser; they are not real-time deadlines.

## API reference

Both the default singleton and `createSecurityGuard()` instances provide:

- `start(config?: SecurityGuardConfig): SecurityGuardInstance`: replaces configuration, clears old state and starts a new episode window. Returns the same instance. Calling twice does not create duplicate observers.
- `stop(): void`: complete native teardown and score/state reset. Idempotent.
- `pause(): void`: suspend, clear evidence, abort reports and remove layers; preserve configuration/subscribers/cooldown. No-op unless running.
- `resume(): void`: restart observation only from paused, with fresh evidence.
- `getStatus(): GuardStatus`: copied `{ lifecycle, state, detected, score, signals }`. Lifecycle is `stopped | running | paused | unsupported`; state is `normal | suspicious | blocked`. `blocked` means an SDK layer is owned, not that all browser access is prevented. A high unconfirmed score is `suspicious`.
- `getScore(): number`: latest 0–100 heuristic score. Background/paused/stopped evidence is reset to 0.
- `on(name, handler): () => void`: subscribe to `detected | cleared | violation`, return unsubscribe. Identical handler registrations on one channel are deduplicated.
- `off(name, handler): void`: unsubscribe; harmless if missing.

Named exports: `SecurityGuard`, `SecurityGuardInstance`, `createSecurityGuard`, `resolveConfig`, and public types. `new SecurityGuardInstance()` is equivalent to `createSecurityGuard()`.

## Development, demo and testing

```bash
npm install
npm run build
npm test
npm run lint
npm run demo
```

`npm run lint` runs ESLint and strict `tsc --noEmit`. `npm run demo:build` creates `demo-dist`. Vitest covers configuration, every detector, quality/weight scoring, independent evidence, thresholds, cooldown/debounce, event isolation, SSR, DOM actions, reporting timeout/privacy, lifecycle, reentrant callbacks, listener/timer cleanup and concurrent layers.

The demo displays real SDK status and signals. “Preview selected action” is explicitly a **manual action preview**, not a fake detection; its layer is removed after six seconds. A real detection does not use this preview timeout. It never sends reports. Browser-reserved shortcuts may not reach the page. Opening DevTools and seeing no event is an expected limitation, not proof of malfunction.

Separate tarball-consumer applications are in `examples/consumer`. They exercise npm installation, ESM/CJS/SSR, Vanilla JS, React Strict Mode, Next.js SSR/hydration, and browser lifecycle behavior. See their scripts and the validation notes at the end of this README. Do not conflate simulated detector inputs in automated tests with a successful real-world DevTools detector.

Recommended manual release checks on desktop Chrome/Firefox/Edge/Safari and real mobile devices:

1. Start in callback mode; try resizing, sidebars, zoom, rotation, ordinary typing and focus/tab changes. None alone should emit a detection.
2. Try inspection shortcuts and docked/undocked tools. Note which signals the browser actually exposes.
3. If deliberately enabling debugger probing, resume an encountered pause, inspect the evidence and then disable it again. Do not enable in automated debugger-attached sessions unintentionally.
4. Preview each action, confirm keyboard focus containment and screen-reader announcement, and verify SPA state survives cleanup.
5. Stop the guard and confirm no sampling, shortcut observation, DOM layers or in-flight reports remain.
6. Verify an actual reporting endpoint with server validation/CORS/CSP, redacted paths and appropriate rate limits.

## Publishing

Replace the scope and update example imports. Add your repository/homepage/bugs metadata when you have real repository URLs; none are fabricated here. Confirm the MIT license is suitable for your project.

```bash
npm ci
npm run build
npm test
npm run lint
npm run demo:build
npm audit
npm pack --dry-run
npm pack
```

Review the tarball. Only `dist`, README, LICENSE and npm's required metadata are shipped; tests, demo, consumer apps and dependencies are not. Both `dist/index.js` and `dist/index.cjs` need their adjacent generated chunks. Types include `index.d.ts` and `index.d.cts`.

When ready, authenticate locally with npm and publish under your own scope:

```bash
npm login
npm publish --access public
```

Use npm's supported trusted-publishing/provenance flow for CI when available. Never put an npm token in the SDK, demo, repository, or frontend environment variables. Publication is an explicit release step; these instructions do not publish automatically.

## FAQ

**Can this guarantee DevTools detection?** No. Browser APIs do not offer that capability, and client-side checks are bypassable.

**Why does F12 not block immediately?** A shortcut is not proof. It contributes only interaction evidence and never cancels the key event. Two categories, sufficient weight and debounce are required.

**Why does the score not equal the sum of all detected weights?** Correlated timing signals share one category. Only its strongest weighted quality contributes.

**Why is the debugger disabled?** A real debugger statement can suspend the browser indefinitely. Interval controls cannot prevent that individual pause.

**Does resizing block users?** Not on its own, regardless of dimension weight. A stable gap can produce a suspicious score, not a confirmed detection. Coinciding unrelated signals remain a false-positive risk.

**Can I monitor without interfering with users?** Yes. Use a callback action and keep debugger probing disabled. Reporting is optional and off by default.

**Does this replace backend security?** No. Never use it as an authorization decision or put secrets in frontend code.

**What does `cleared` mean?** The current evidence no longer passes confirmation for the clear debounce. It does not establish whether tools are open or closed.

**Are reports delivered reliably?** No. Offline state, navigation, blockers, CSP/CORS, aborts and unavailable APIs can drop them. There is no retry queue.

**Does it collect passwords, cookies or form input?** No. Only fixed inspection shortcut classification, numeric browser/timing measurements and pathname are used locally. Reporting excludes the pathname by default. Developer callbacks are application code and must maintain their own privacy boundaries.

## License

MIT. See [LICENSE](./LICENSE).
