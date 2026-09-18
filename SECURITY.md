# Security Policy

## Supported Versions

Only the latest published version of `@0xzahed/devtoolguard` receives security patches.

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0.0 | :x:                |

## Threat Model & Design Boundaries

DevToolGuard operates entirely on the client side in browser environments:

- **Client-Side Heuristics**: Detection relies on heuristic browser behavior (dimension anomalies, keyboard shortcuts, scheduler drift, and opt-in debugger delays). There is no guaranteed browser API to confirm DevTools presence.
- **Deterrent, Not DRM**: Determined reverse engineers can inspect, pause, mock, or disable client-side JavaScript execution. DevToolGuard is intended as a telemetry, deterrent, and friction layer.
- **Server Defense**: Never rely on client-side detection for authorization, authentication, access control, or sensitive business logic. Always enforce security controls on the server.

## Reporting a Vulnerability

If you discover a security vulnerability in DevToolGuard:

1. **Do NOT disclose publicly** in GitHub issues, PRs, discussions, or social media.
2. **Email the maintainer**: send details to `zahed04x@gmail.com` with the subject line `[SECURITY] DevToolGuard Vulnerability Report`.
3. Provide:
   - A clear description of the vulnerability (e.g., XSS, prototype pollution, open redirect, ReDoS).
   - Minimal reproduction steps or proof-of-concept.
   - Impact assessment and suggested remediation, if known.

You will receive an acknowledgement within 48 hours and updates regarding patch timeline and coordinated release.
