# Electron Notes (future)

- Keep `vetcare-clinic` as SPA and load local production build in Electron (`dist/index.html`) for desktop packaging.
- In development, Electron can point to Vite dev server (`http://localhost:5174`) and auto-reload.
- OIDC redirect URIs will need an Electron strategy:
  - local loopback callback (`http://127.0.0.1:<port>/callback`) or
  - system browser + deep link protocol (recommended for production).
- API and ERP URLs should remain env-driven (`VITE_API_BASE_URL`, `VITE_ERP_URL`) with Electron-side mapping per environment.
- For secure token handling, keep OIDC flow in renderer only if CSP and preload boundaries are strict; otherwise move sensitive bridging to preload/main.
- Add Electron build targets later without changing current React routing structure (`BrowserRouter` can be adapted to `HashRouter` only if needed by packaging constraints).
