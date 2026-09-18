# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2026-09-19

### Added
- Exported `DevToolGuard` and `createDevToolGuard` as first-class aliases matching the package name.
- Added support for boolean shorthands in detector configurations (`keyboard: false`, `debugger: true`, `behavior: false`).
- Added `SECURITY.md` detailing vulnerability disclosure policy and client-side threat model.
- Added repository, issues, and homepage metadata to `package.json`.

### Fixed
- Fixed uncaught `TypeError` when calling `resolveConfig(null)` or passing `{ devtools: null }`.
- Fixed action validation to strictly require valid URL for `redirect` and function handler for `callback`.
- Fixed detector weights validation to reject unknown detector keys.
- Fixed `calculateScore()` handling when input signals array is nullish or contains nullish items.
- Fixed `KeyboardDetector` to handle synthetic events where `event.key` is undefined.
- Fixed `Reporter.stop()` concurrent map iteration mutation when aborting pending requests.
- Fixed `copyEvent()` null-safety when `event.signals` is undefined.
- Added defensive fallbacks for `window.performance.now` and `document.hasFocus`.
- Fixed broken tarball path in `examples/consumer/package.json`.

## [1.0.2] - 2026-09-18

### Changed
- Renamed npm package scope to `@0xzahed/devtoolguard`.

## [1.0.1] - 2026-09-18

### Fixed
- Added missing `reset()` method to `SecurityGuardInstance`.
- Stabilized scoring test timing and linting fixes.

## [1.0.0] - 2026-09-17

### Added
- Initial release of client-side DevTools detection and anti-inspection SDK.
- Multi-heuristic detection (dimension, debugger, keyboard, behavior).
- Independent evidence category scoring with threshold debouncing.
- Action handlers (overlay, block, same-origin redirect, callback).
- Dual ESM and CommonJS package distribution with TypeScript declarations.
