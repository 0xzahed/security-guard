# DevToolGuard Full Audit Report

## 1. Executive Summary

A comprehensive codebase audit, dependency inspection, Antigravity skills installation, functional testing, security review, and npm package validation was performed for **DevToolGuard** (`@0xzahed/devtoolguard` v1.0.2) located at `/home/panda/Desktop/devtool_gaurd`.

DevToolGuard is a client-side anti-inspection and DevTools detection SDK designed as a deterrent and monitoring layer for modern web applications. The library aggregates multiple heuristic browser signals (window dimension gaps, keyboard shortcuts, behavior scheduling drift, and opt-in debugger timing probes) into a confidence score, requiring independent categories before triggering response actions (overlay, interaction block, same-origin redirect, or custom callback).

### Audit Verdict
- **Build**: PASS (tsup generates dual ESM/CJS and `.d.ts`/`.d.cts` declarations)
- **Tests**: PASS (86 unit/integration tests passing in Vitest with JSDOM)
- **Typecheck**: PASS (TypeScript 5.9.3 strict mode, zero errors)
- **Lint**: PASS (ESLint 9.39.1 flat config, zero warnings)
- **Security**: VERIFIED DEFENSIVE DESIGN — No unmitigated runtime vulnerabilities. Zero runtime dependencies. DOM manipulation is strictly text-safe (`textContent`), URLs are validated against protocol/credential/cross-origin abuse, and events are sanitized. One moderate CVE noted in devDependency `@vitest/mocker`.
- **NPM Packaging**: PASS (`npm pack` generates clean 31-file, 62.5 kB tarball containing only `dist`, `README.md`, `LICENSE`, `package.json`).
- **External Consumer**: PASS (Isolated external test consumer successfully installed tarball, imported ESM, required CJS, resolved subpaths `/detectors` and `/scoring`, and compiled types under Node16 and Bundler module resolution; Next.js 15 SSR consumer build and server rendering verified).

---

## 2. Project Architecture

The codebase follows a modular, decoupled architecture with strict separation between detection, scoring, actions, events, and configuration:

```text
src/
├── index.ts               # Public entry point; exports singleton, factory, types, and resolveConfig
├── guard.ts               # Core SecurityGuardInstance coordinating lifecycle, scheduling, and events
├── config.ts              # Configuration validation, presets, and normalization (pure, SSR-safe)
├── environment.ts         # BrowserContext extraction and safe URL/foreground checks
├── scoring.ts             # Evidence category grouping, confidence weighting, threshold & cooldown state
├── events.ts              # Isolated EventBus with immutable event cloning and error-swallowing dispatch
├── reporting.ts           # Privacy-centric telemetry reporter with timeout and concurrency limits
├── detectors/
│   ├── index.ts           # Subpath exports for standalone detector use
│   ├── shared.ts          # Detector interface and signal construction helpers
│   ├── dimension.ts       # Viewport & window gap heuristic (Layout category)
│   ├── debugger.ts        # Opt-in execution delay probe via debugger statement (Timing category)
│   ├── keyboard.ts        # Trusted inspection shortcut listener (Interaction category)
│   └── behavior.ts        # Foreground scheduler drift detector (Timing category)
└── actions/
    ├── index.ts           # Action dispatcher
    ├── layer.ts           # Shared reference-counted modal dialog & inert sibling management
    ├── overlay.ts         # Accessible modal overlay with reload button
    ├── block.ts           # Inert interaction block layer
    ├── redirect.ts        # Same-origin location replacement
    └── callback.ts        # Isolated developer callback executor
```

---

## 3. Technology Stack

- **Language**: TypeScript 5.9.3, JavaScript (ES2022)
- **Runtime**: Node.js >= 20 (tooling), Modern Evergreen Browsers (Chromium 102+, Firefox 112+, Safari 15.5+)
- **Package Format**: Dual ESM (`.js`) and CommonJS (`.cjs`) with TypeScript declarations (`.d.ts`, `.d.cts`)
- **Package Manager**: npm (v10.9.8) with `package-lock.json`
- **Build Engine**: `tsup` 8.5.0 (`esbuild`) with treeshaking, code splitting, and sourcemaps
- **Test Framework**: `vitest` 3.2.6 with `jsdom` 26.1.0
- **Linter & Type Checker**: `eslint` 9.39.1, `typescript-eslint` 8.46.1, `tsc --noEmit`
- **Demo & Tooling**: `vite` 6.4.3
- **Runtime Dependencies**: **0** (Zero external dependencies in production)

---

## 4. Installed Antigravity Skills

From the `0xzahed/antigravity-skills` catalog, skills were filtered and selected based on the actual technology stack, testing needs, security surface, and architecture.

```text
Skills considered:
- typescript-pro, typescript-engineering, typescript-advanced-types
- javascript-testing-patterns, vitest-engineering, unit-testing-test-generate
- frontend-security, frontend-security-coder, security-auditor, dependency-security
- dependency-management, monorepo-management, python-packaging
- code-reviewer, senior-code-reviewer, api-design-principles

Skills selected:
- typescript-pro
- vitest-engineering
- frontend-security
- dependency-security
- senior-code-reviewer
```

| Skill | Why Needed | Installed |
| ----- | ---------- | --------- |
| `typescript-pro` | Strict TypeScript compilation, ES2022/Bundler module resolution, `.d.ts`/`.d.cts` dual declaration integrity, generic safety | **VERIFIED** (Global + Plugin) |
| `vitest-engineering` | Vitest runner configuration, jsdom environment, fake timers, mock lifecycle, and isolated test suites | **VERIFIED** (Global + Plugin) |
| `frontend-security` | Client-side DOM security, preventing DOM XSS, secure modal inert traps, safe URL handling, preventing redirect attacks | **VERIFIED** (Global + Plugin) |
| `dependency-security` | Supply-chain integrity, zero-dependency validation, auditing devDependencies for vulnerabilities | **VERIFIED** (Global + Plugin) |
| `senior-code-reviewer` | Deep architectural review, API consistency, error boundaries, and defensive programming patterns | **VERIFIED** (Global + Plugin) |

---

## 5. Dependency Audit

### Runtime Dependencies
- `dependencies`: **None** (`{}`). The published package has zero runtime dependencies, eliminating external supply-chain injection vectors.

### DevDependencies
- `@eslint/js`: `9.39.1`
- `@types/node`: `22.18.6`
- `eslint`: `9.39.1`
- `jsdom`: `26.1.0`
- `tsup`: `8.5.0`
- `typescript`: `5.9.3`
- `typescript-eslint`: `8.46.1`
- `vite`: `6.4.3`
- `vitest`: `3.2.6`

### Audit Results (`npm audit`)
- **Runtime**: Clean.
- **Development Tooling**: 2 moderate vulnerabilities identified in devDependency `@vitest/mocker` (transitive via `vitest@3.2.6`):
  - GHSA-82fw-gwwq-j7x9 (Path Traversal / Arbitrary File Read via `@vitest/mocker` redirect mock in dev server).
  - Remediation requires Vitest 5.x upgrade (breaking change for build tooling). Since Vitest is strictly a devDependency and not bundled into `dist/`, it presents zero risk to production consumers.

### Lifecycle Scripts
- No `preinstall`, `install`, or `postinstall` scripts exist in `package.json`. Safe against npm install hooks.

---

## 6. Build Results

Command: `npm run build` (`tsup`)

```text
CLI Building entry: src/index.ts, src/scoring.ts, src/detectors/index.ts
Target: es2022
ESM Build: dist/index.js (20.48 KB), dist/detectors/index.js (179 B), dist/scoring.js (141 B) + chunks
CJS Build: dist/index.cjs (20.78 KB), dist/detectors/index.cjs (719 B), dist/scoring.cjs (426 B) + chunks
DTS Build: dist/*.d.ts and dist/*.d.cts generated cleanly
Status: SUCCESS (231ms)
```

Verification items:
- ESM output is valid ES2022.
- CommonJS output is valid and imports cleanly via `require()`.
- Types declarations (`.d.ts` and `.d.cts`) generated for all entries.
- Sourcemaps generated and aligned with source lines.

---

## 7. Test Results

Command: `npm test` (`vitest run`)

| Category | Total | Passed | Failed | Skipped | Status |
| -------- | ----: | -----: | -----: | ------: | :----- |
| Configuration Validation (`config.test.ts`) | 16 | 16 | 0 | 0 | **PASS** |
| Actions & Modal DOM (`actions.test.ts`) | 9 | 9 | 0 | 0 | **PASS** |
| Detector Heuristics (`detectors.test.ts`) | 16 | 16 | 0 | 0 | **PASS** |
| Event Bus & Isolation (`events.test.ts`) | 2 | 2 | 0 | 0 | **PASS** |
| Guard Lifecycle & Scheduling (`guard.test.ts`) | 15 | 15 | 0 | 0 | **PASS** |
| Privacy Reporting (`reporting.test.ts`) | 5 | 5 | 0 | 0 | **PASS** |
| Scoring & Timing Protection (`scoring.test.ts`) | 9 | 9 | 0 | 0 | **PASS** |
| Edge Cases & Mutation (`edge-cases.test.ts`) | 12 | 12 | 0 | 0 | **PASS** |
| Server-Side Rendering (`ssr.test.ts`) | 2 | 2 | 0 | 0 | **PASS** |
| **Total** | **86** | **86** | **0** | **0** | **PASS** |

---

## 8. Public API Testing

Tested both directly and via an external consumer (`scratch/test-consumer`) using the packed `.tgz`:

1. **`SecurityGuard` (Default Singleton Export)**:
   - `start(config?)` -> returns singleton instance; starts observation if in browser, returns `unsupported` in Node/SSR.
   - `stop()` -> removes all listeners, clears timers, resets score/state. Idempotent.
   - `pause()` -> stops sampling, retains configuration and subscribers.
   - `resume()` -> resumes from paused state with fresh evidence.
   - `reset()` -> resets score, state, active layers without altering lifecycle.
   - `getStatus()` -> returns `{ lifecycle, state, detected, score, signals }` with immutable copies.
   - `getScore()` -> returns numeric score 0–100.
   - `on(event, handler)` -> registers listener and returns unsubscribe function.
   - `off(event, handler)` -> removes listener.
2. **`createSecurityGuard()`**: Creates isolated instance with identical API.
3. **`resolveConfig(config?)`**: Pure function resolving presets and validating bounds.
4. **`@0xzahed/devtoolguard/detectors`**:
   - `DimensionDetector`, `DebuggerDetector`, `KeyboardDetector`, `BehaviorDetector` all instantiate, sample, and clean up listeners properly.
5. **`@0xzahed/devtoolguard/scoring`**:
   - `calculateScore(signals, options, now)` correctly calculates weighted multi-category score.
   - `DetectionState` handles debounce, clear debounce, and cooldown correctly.

---

## 9. Functional Testing

| Scenario | Input | Expected Outcome | Actual Result | Status |
| -------- | ----- | ---------------- | ------------- | :----- |
| Valid Input | `start({ sensitivity: 'high', action: 'block' })` | Runs with threshold 50, creates block layer on detection | Matches expectation | **VERIFIED** |
| Empty Input | `resolveConfig({})` | Uses conservative defaults (medium, threshold 60, overlay) | Defaults resolved | **VERIFIED** |
| Null Config | `resolveConfig(null)` | Defensively fall back to defaults | Safe defaults returned | **FIXED & VERIFIED** |
| Null devtools | `resolveConfig({ devtools: null })` | Fall back to defaults without crash | Safe defaults returned | **FIXED & VERIFIED** |
| Undefined Input | `guard.start(undefined)` | Runs with default config | Runs safely | **VERIFIED** |
| Invalid String Action | `resolveConfig({ action: 'redirect' })` | Throw TypeError (missing required URL) | Throws TypeError | **FIXED & VERIFIED** |
| Invalid Callback Action | `resolveConfig({ action: 'callback' })` | Throw TypeError (missing handler) | Throws TypeError | **FIXED & VERIFIED** |
| Invalid Weights Key | `resolveConfig({ scoring: { weights: { invalid: 50 } } })` | Throw TypeError on unknown detector key | Throws TypeError | **FIXED & VERIFIED** |
| Null Signals | `calculateScore(null, config)` | Return `{ score: 0, confirmed: false, groups: [] }` | Returns safe zero score | **FIXED & VERIFIED** |
| Array with Null Elements | `calculateScore([null, undefined], config)` | Skip null items and compute valid score | Returns safe zero score | **FIXED & VERIFIED** |
| Boundary Value (Threshold) | `threshold: 1` and `threshold: 100` | Accepted; values `< 1` or `> 100` throw RangeError | RangeError thrown outside bounds | **VERIFIED** |
| Repeated Calls | `start(); start(); start();` | Idempotent; existing timers cleared, single timeout kept | 1 active timer | **VERIFIED** |
| Repeated Reset | `reset(); reset(); reset();` | Idempotent; clears evidence without error | Score remains 0 | **VERIFIED** |
| Re-entrant Callback | Listener throws or mutates event | Error isolated, mutation prevented | Sibling listeners unhindered | **VERIFIED** |

---

## 10. Edge-Case Testing

| Scenario | Environment / Conditions | Behavior | Status |
| -------- | ------------------------ | -------- | :----- |
| Node.js / SSR | No `window` or `document` | `getBrowserContext()` returns `undefined`. `start()` sets lifecycle to `unsupported` and attaches zero DOM listeners. | **VERIFIED** |
| Missing `window.performance` | Minimal / polyfilled environment | Falls back to `Date.now()` without throwing `Cannot read properties of undefined (reading 'now')`. | **FIXED & VERIFIED** |
| Missing `document.hasFocus` | Iframe or headless browser | Checks `typeof hasFocus === 'function' ? hasFocus() : true`. | **FIXED & VERIFIED** |
| KeyboardEvent without `key` | Synthetic or legacy keyboard event | `event.key?.toLowerCase()` safely returns without crash. | **FIXED & VERIFIED** |
| Window Focus Loss (`blur`) | Tab backgrounded or switched | Observations suspended, timer cleared, score reset to 0 until focus returns. | **VERIFIED** |
| Zoom / DPI Change | `devicePixelRatio` differs from baseline | Dimension detector suppresses gap calculation to prevent false positive. | **VERIFIED** |
| Coarse Pointer Device | Touch screen / mobile device | Dimension detector suppresses gap calculation. | **VERIFIED** |
| Mobile Viewport | `innerWidth < 768px` | Dimension detector suppresses gap calculation. | **VERIFIED** |
| Deeply Nested Mutating Sibling | SPA adds modal portal while blocked | MutationObserver intercepts and marks new body child `inert`. | **VERIFIED** |
| Map Mutation in Stop | Active reporting requests pending | Keys cloned before iteration; all controllers aborted safely. | **FIXED & VERIFIED** |

---

## 11. Security Audit

| Finding | Severity | Location | Evidence | Status |
| ------- | -------- | -------- | -------- | :----- |
| **XSS via Layer Options** | High (Potential) | `src/actions/layer.ts` | Uses `title.textContent`, `message.textContent`, `button.textContent`. No `innerHTML` or HTML injection. | **VERIFIED SAFE** |
| **Open Redirect / Script Schemes** | High (Potential) | `src/environment.ts` (`safeHttpUrl`) | Protocol must be `http:` or `https:`. Reject `javascript:`, `data:`, credentials (`user:pass@`), and cross-origin destinations for redirects. | **VERIFIED SAFE** |
| **Telemetry Credential Leakage** | Medium (Potential) | `src/reporting.ts` | Requests use `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`, `cache: 'no-store'`, `redirect: 'error'`. Payload contains only `{ type, confidence, timestamp }` by default. | **VERIFIED SAFE** |
| **Path Data Leakage** | Medium (Potential) | `src/reporting.ts` | Path excluded by default. Only sent when `includePath: true` with optional `pathSanitizer`. | **VERIFIED SAFE** |
| **Denial of Service via ReDoS** | Medium (Potential) | Entire `src/` | No regular expressions exist in runtime source code. Zero ReDoS risk. | **VERIFIED SAFE** |
| **Arbitrary Code / Eval Execution** | High (Potential) | Entire `src/` | No `eval()`, `new Function()`, or dynamic code evaluation exists. | **VERIFIED SAFE** |
| **Prototype Pollution** | Medium (Potential) | `src/config.ts`, `src/scoring.ts` | Uses `Object.hasOwn(groups, signal.name)`, avoids recursive deep merge, guards against `__proto__`/`toString`. | **VERIFIED SAFE** |
| **Subprocess / Command Injection** | Critical (Potential) | Entire `src/` | Browser client package; no child processes, exec, or shell execution. | **VERIFIED SAFE** |
| **Uncaught Null Pointer Crash in Config** | Low | `src/config.ts` | `resolveConfig(null)` and `resolveConfig({ devtools: null })` threw unhandled TypeError. | **FIXED** |
| **Action Bypass to Default Overlay** | Low | `src/config.ts` | Passing string `'redirect'` or `'callback'` bypassed validation and defaulted to `'overlay'`. | **FIXED** |
| **Uncaught Null Pointer Crash in Scoring** | Low | `src/scoring.ts` | `calculateScore(null)` or `calculateScore([null])` threw unhandled TypeError. | **FIXED** |
| **Dev Tooling CVE in @vitest/mocker** | Moderate | `devDependencies` | GHSA-82fw-gwwq-j7x9 in devDependency test runner. Not present in published runtime code. | **NOTED / ACCEPTED DEV ONLY** |

---

## 12. TypeScript / API Type Audit

- TypeScript configuration: `target: "ES2022"`, `moduleResolution: "Bundler"`, `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `noImplicitOverride: true`.
- Declaration outputs:
  - `dist/index.d.ts` & `dist/index.d.cts`
  - `dist/detectors/index.d.ts` & `dist/detectors/index.d.cts`
  - `dist/scoring.d.ts` & `dist/scoring.d.cts`
- Verified external type checking:
  - Compiled consumer test against installed package with `--moduleResolution bundler --module esnext`: **PASS**
  - Compiled consumer test against installed package with `--moduleResolution node16 --module node16`: **PASS**
  - All public types (`SecurityGuardConfig`, `SecurityEvent`, `GuardStatus`, `DetectionSignal`, etc.) resolve properly without missing type imports.

---

## 13. Package Publishing Audit

Command: `npm pack` -> `0xzahed-devtoolguard-1.0.2.tgz` (62.5 kB)

File list verified:
```text
dist/chunk-EOT3YBCP.js
dist/chunk-EOT3YBCP.js.map
dist/chunk-OLWFES7O.js
dist/chunk-OLWFES7O.js.map
dist/chunk-OTKIWSPI.cjs
dist/chunk-OTKIWSPI.cjs.map
dist/chunk-TWM33YDH.cjs
dist/chunk-TWM33YDH.cjs.map
dist/detectors/index.cjs
dist/detectors/index.cjs.map
dist/detectors/index.d.cts
dist/detectors/index.d.ts
dist/detectors/index.js
dist/detectors/index.js.map
dist/index.cjs
dist/index.cjs.map
dist/index.d.cts
dist/index.d.ts
dist/index.js
dist/index.js.map
dist/scoring.cjs
dist/scoring.cjs.map
dist/scoring.d.cts
dist/scoring.d.ts
dist/scoring.js
dist/scoring.js.map
dist/types-BaC8Sjm5.d.cts
dist/types-BaC8Sjm5.d.ts
LICENSE
README.md
package.json
```

- No source files (`src/`) included.
- No tests (`tests/`) or demo files (`demo/`) included.
- No development or environment files (`.env`, `.git`, `.gitignore`, `tsconfig.json`) included.
- Removed stale root `yourname-security-guard-1.0.0.tgz`.
- Added `*.tsbuildinfo` to `.gitignore`.

---

## 14. CLI Audit

- `DevToolGuard` does **not** declare a `"bin"` field in `package.json`.
- It is strictly a client-side JavaScript/TypeScript SDK library for web applications, with no CLI binary intended or shipped.
- **Verdict**: N/A (Library SDK only).

---

## 15. Documentation & API Consistency

| Contract Item | Documentation (`README.md`) | Implementation (`src/`) | Published Bundle (`dist/`) | Tests | Match |
| ------------- | --------------------------- | ----------------------- | -------------------------- | ----- | :---: |
| Package Name | `@0xzahed/devtoolguard` | `@0xzahed/devtoolguard` | `@0xzahed/devtoolguard` | Tested | **YES** |
| Default Export | `SecurityGuard` | `SecurityGuardInstance` | `SecurityGuardInstance` | Tested | **YES** |
| Factory Export | `createSecurityGuard` | `createSecurityGuard()` | `createSecurityGuard()` | Tested | **YES** |
| Subpath `/detectors` | Exported detectors & types | `src/detectors/index.ts` | `dist/detectors/index.*` | Tested | **YES** |
| Subpath `/scoring` | `calculateScore`, `DetectionState` | `src/scoring.ts` | `dist/scoring.*` | Tested | **YES** |
| Presets | `low` (75), `medium` (60), `high` (50) | Match presets map | Matches | Tested | **YES** |
| SSR Behavior | Safe no-op, `lifecycle: 'unsupported'` | Match | Matches | Tested | **YES** |
| Actions | `overlay`, `block`, `redirect`, `callback` | Match | Matches | Tested | **YES** |

---

## 16. Code Quality Review

- **Modularity & Single Responsibility**: High. Each detector handles only its specific browser signal. Scoring logic is decoupled from detection and action execution.
- **Error Boundaries**: Excellent. Event handlers and user callbacks are wrapped in `try...catch` and isolated; an error in one consumer callback never crashes other listeners or the guard lifecycle.
- **Memory Management**: MutationObserver, window event listeners, document event listeners, and timers are tracked and removed in `stop()` and `pause()`.
- **SSR Safety**: Safe by design. Modules do not reference `window`, `document`, `navigator`, or `location` at load time.

---

## 17. Bugs Found

1. **Crash on Null Configuration (`resolveConfig(null)`)**: Calling `resolveConfig(null)` or `guard.start(null as any)` threw `TypeError: Cannot read properties of null (reading 'sensitivity')`.
2. **Crash on Null `devtools` Property (`resolveConfig({ devtools: null })`)**: In `const devtools = typeof config.devtools === 'object' ? config.devtools : {}`, since `typeof null === 'object'`, `devtools` became `null`, causing line 50 (`devtools.interval`) to throw `TypeError: Cannot read properties of null (reading 'interval')`.
3. **Invalid Action Validation Bypass**: `validateAction` permitted strings `'redirect'` and `'callback'`. Because `runAction` treats non-`'block'` strings as `'overlay'`, passing `action: 'redirect'` silently created an overlay modal dialog rather than throwing an error or redirecting.
4. **Permissive Unknown Weight Keys**: `resolveConfig` did not validate keys in `config.scoring.weights`, allowing arbitrary keys to pollute the resolved weights object.
5. **Crash on Null/Non-Array in `calculateScore()`**: Calling `calculateScore(null)` or `calculateScore(undefined)` threw `TypeError: signals is not iterable`, and calling `calculateScore([null])` threw `TypeError: Cannot read properties of null (reading 'name')`.
6. **Fragile `window.performance` Access**: `getBrowserContext()` called `window.performance.now()` directly without checking if `window.performance` is defined, creating a crash risk in non-standard or polyfilled environments.
7. **Unchecked `document.hasFocus()` Call**: `isForeground()` invoked `context.document.hasFocus()` directly without verifying it is a function.
8. **Unchecked `event.key` in KeyboardDetector**: In `KeyboardDetector`, `event.key.toLowerCase()` could throw if an event lacked the `key` property.
9. **Map Mutation during Key Iteration**: In `Reporter.stop()`, keys were iterated directly over `this.pending.keys()` while `this.finish()` deleted entries from `this.pending`.
10. **Broken Consumer Dependency Path**: In `examples/consumer/package.json`, dependency `@0xzahed/devtoolguard` pointed to non-existent `file:../../0xzahed-security-guard-1.0.0.tgz`, causing `examples/consumer/ssr.mjs` to fail on module resolution.

---

## 18. Fixes Applied

1. **`src/config.ts`**:
   - Added `const cfg = config ?? {};` to handle `null` or `undefined` arguments gracefully.
   - Updated `devtools` fallback: `typeof cfg.devtools === 'object' && cfg.devtools !== null ? cfg.devtools : {}`.
   - Hardened `validateAction`: strictly enforced that string actions may only be `'overlay' | 'block'`. Required `action.type === 'redirect'` to have a non-empty string `url`, and `action.type === 'callback'` to have a function `handler`.
   - Added validation rejecting unknown detector weight keys in `cfg.scoring?.weights`.
2. **`src/scoring.ts`**:
   - Added guard `if (!Array.isArray(signals) || !options?.weights) return { score: 0, confirmed: false, groups: [] };`.
   - Added defensive check in loop: `if (!signal || typeof signal !== 'object' || ...) continue;`.
3. **`src/environment.ts`**:
   - Added safe clock fallback: `clock: () => (typeof window.performance?.now === 'function' ? window.performance.now() : Date.now())`.
   - Added `document.hasFocus` function guard: `const focused = typeof context.document.hasFocus === 'function' ? context.document.hasFocus() : true;`.
4. **`src/detectors/keyboard.ts`**:
   - Added optional chaining and guard: `const key = event.key?.toLowerCase(); if (!key) return;`.
5. **`src/reporting.ts`**:
   - Cloned map keys `for (const controller of [...this.pending.keys()])` before calling `abort()` and `finish()`.
6. **`src/events.ts`**:
   - Defensively handled nullish signals in `copyEvent`: `(event?.signals ?? []).map(...)`.
7. **`examples/consumer/package.json`**:
   - Updated dependency path to `file:../../0xzahed-devtoolguard-1.0.2.tgz`.
8. **`.gitignore`**:
   - Added `*.tsbuildinfo` to ignore TypeScript build cache artifacts.
9. **`tests/`**:
   - Added tests covering `resolveConfig(null)`, `resolveConfig({ devtools: null })`, rejection of invalid string actions, rejection of unknown weights, nullish `calculateScore()` calls, and undefined keyboard event keys.

---

## 19. Regression Test Results

After applying all fixes and rebuilding:
- **Build**: PASS (`tsup` 231ms)
- **Unit Tests**: PASS (86/86 passed across 9 test files)
- **Typecheck**: PASS (`tsc --noEmit` 0 errors)
- **Lint**: PASS (`eslint .` 0 errors, 0 warnings)
- **Demo Build**: PASS (`vite build` 204ms)
- **NPM Pack**: PASS (`0xzahed-devtoolguard-1.0.2.tgz`)
- **External Consumer ESM/CJS/Types**: PASS (`node test-esm.mjs`, `node test-cjs.cjs`, `tsc test-types.ts`)
- **Next.js 15 SSR Consumer Build**: PASS (`next build` compiled, prerendered, 0 errors)
- **Next.js SSR Runtime Test**: PASS (`node examples/consumer/ssr.mjs` passed)

---

## 20. Remaining Issues

- **`@vitest/mocker` Dev Vulnerability**: Moderate vulnerability in Vitest 3.x devDependencies (GHSA-82fw-gwwq-j7x9). Not shipped in package output, zero runtime risk. Upgrading to Vitest 5.x is recommended during the next scheduled tooling overhaul.

---

## 21. Recommended Improvements

1. **Output Named Warning in tsup**: Add `output: { exports: 'named' }` in `tsup.config.ts` if desiring to silence the tsup mixed default/named export warning for CJS bundles.
2. **Automated CI Workflow**: Add a GitHub Actions workflow (`.github/workflows/ci.yml`) to automatically execute `npm run build && npm test && npm run lint && npm run demo:build` on pull requests.

---

## 22. Final Status

```text
BUILD:              PASS
TESTS:              PASS (86/86 passed)
TYPECHECK:          PASS
LINT:               PASS
SECURITY:           NO VERIFIED RUNTIME FINDINGS / DEV DEPENDENCY CVE NOTED
NPM PACKAGING:      PASS
EXTERNAL CONSUMER:  PASS
```
