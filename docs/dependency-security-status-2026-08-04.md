# Dependency Security Status

## Applied Update

On 2026-08-04, `npm audit fix` updated the local dependency graph from React Router 7.0.0 to 7.18.2 and PostCSS 8.5.25. It removed the older router and PostCSS advisories reported by the initial audit.

The updated application passed `npm.cmd run preflight`, including build, typecheck, core-policy coverage gates, domain checks, and canonical React browser checks.

## Remaining Advisory

`npm.cmd audit` still exits nonzero with two high-severity entries rooted in `react-router@7.18.2`:

- `GHSA-qwww-vcr4-c8h2`, React Router RSC Mode CSRF bypass.
- Affected range reported by npm: `>=7.12.0 <8.3.0`.

The registry now publishes `react-router@8.3.0`, but its latest stable `react-router-dom` package remains 7.18.2 and declares an exact `react-router: 7.18.2` dependency. There is no published `react-router-dom@8.3.0`, so the fixed core package cannot be adopted by this SPA as a compatible router-dom upgrade at this check.

## Recheck

`npm.cmd audit --omit=dev` was rerun on 2026-08-04 after the latest local preflight. It still reports two high-severity entries through `react-router@7.12.0 - 8.2.0`. `npm.cmd audit fix --dry-run --omit=dev` does not propose a fixed `react-router-dom` version and leaves the advisory in its resulting report. This remains a release decision gate, not a clean audit.

## Product Boundary

The canonical product is a client-side Vite SPA using `BrowserRouter`, `Routes`, `Route`, `Link`, `Navigate`, `useLocation`, and `useNavigate`. It does not implement React Server Components, SSR, React Router framework mode, data-router server actions, or an application server endpoint.

This limits the known RSC-specific execution path in the current local product, but does not make the dependency advisory disappear. It must be rechecked before any network-hosted release. A release decision requires either a published fixed version with regression evidence or an explicitly authorized risk decision from the responsible release authority.
