# SMART — Research Intelligence Platform (Frontend)

Frontend for the SMART (Systematic Monitoring & Analysis for Research and
Technology) indicator platform. Built with **React + Vite + Tailwind CSS**.

This is a **UI-only build**: every page renders with realistic mock data out
of the box, so you can run and demo it with no backend at all. When your
FastAPI backend is ready, connect it in one step (see below).

## Getting started

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

## Connecting your FastAPI backend

By default the app uses mock data from `src/mock/data.js`. To use live data:

1. Copy `.env.example` to `.env`
2. Set `VITE_API_BASE_URL` to your backend's URL, e.g.:
   ```
   VITE_API_BASE_URL=http://localhost:8000
   ```
3. Restart the dev server.

All API calls live in `src/services/api.js`. Each function already targets
the endpoint path suggested for the FastAPI backend (e.g.
`GET /dashboard/overview`, `POST /semantic-search`, `POST /chat`). Once
`VITE_API_BASE_URL` is set, the mock fallback is skipped automatically and
real requests go out via Axios — no other code changes needed.

## Project structure

```
src/
  components/       Shared UI: Navbar, Footer, DashboardLayout, ui.jsx primitives
  pages/            One file per route (see below)
  mock/data.js       All mock data, shaped to match expected API responses
  services/api.js    Axios client + one function per backend endpoint
```

## Pages / routes

| Route                        | Purpose                                       |
|-------------------------------|------------------------------------------------|
| `/`                           | Public landing page                            |
| `/dashboard`                  | Overview stats + publication trend charts      |
| `/dashboard/analytics`        | Publication, patent & funding analytics charts |
| `/dashboard/search`           | Semantic search + connection-path visual       |
| `/dashboard/institutions`     | Institution list + profile                     |
| `/dashboard/researchers`      | Researcher expertise cards                      |
| `/dashboard/patents`          | Patent explorer table                           |
| `/dashboard/grants`           | Grant explorer table                            |
| `/dashboard/chatbot`          | "Ask SMART" conversational search UI            |

## Design notes

- Palette, type (Source Serif 4 for headings, Inter for UI, JetBrains Mono
  for labels/data) and the "ST" watermark motif are defined once in
  `src/index.css` under `@theme`, and reused across every page.
- Charts use **Recharts**. Icons use **lucide-react**.
- Tailwind CSS v4 (CSS-first config via `@theme`, no `tailwind.config.js`
  needed).

## Build for production

```bash
npm run build
npm run preview   # sanity-check the production build locally
```

Output goes to `dist/`.
