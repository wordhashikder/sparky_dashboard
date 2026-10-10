# PickASparky Dashboard

The back office for PickASparky, as a React single-page app. It has two areas, and
which one you see depends on how you sign in:

| Role | Pages |
|---|---|
| **Installer** | New Leads · My Quotes & Messages · Profile settings |
| **Admin** | Overview · Leads & Quotes · Installers · SEO & Locations · Blog · Reviews · Contact inbox · Role Matrix · Settings |

The stack is React 19, Vite, React Router, TanStack Query and Tailwind CSS 4, using the
public site's colours and fonts.

## Run it locally

```bash
cp .env.example .env.local      # VITE_API_URL and VITE_SITE_URL
npm install
npm run dev                     # http://localhost:5173
```

The API must allow this origin. In `backend/.env`, set:

```
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
DASHBOARD_URL=http://localhost:5173
```

To get demo logins (development only), run `uv run python -m app.cli seed-demo` in
`backend/`:

- Admin: `admin@demo.pickasparky.test` / `DemoAdmin123!`
- Installers: `<slug>@demo.pickasparky.test` / `DemoPass123!`, for example
  `greencharge-electrical@demo.pickasparky.test`

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-checks, then builds to `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run lint` | Biome lint and format check |
| `npm run typecheck` | TypeScript only |

## Deploy (Coolify)

The app ships as a Docker image: a static build served by unprivileged nginx on port
**8080**, with a health check at `/healthz`.

1. Create a new resource from this folder and choose the **Dockerfile** build pack.
2. Add these **build variables**. They are baked into the bundle at build time:
   - `VITE_API_URL=https://api.pickasparky.co.uk/api/v1`
   - `VITE_SITE_URL=https://pickasparky.co.uk`
3. Set the domain, for example `https://dashboard.pickasparky.co.uk`.
4. On the API, set `CORS_ORIGINS` to include the Dashboard origin, and set
   `DASHBOARD_URL` to that origin as well.

**Keep the Dashboard and the API on the same site** (for example
`dashboard.pickasparky.co.uk` and `api.pickasparky.co.uk`). The sign-in cookie then works
with the default `SESSION_COOKIE_SAMESITE=lax`.

## How sign-in works

- `POST /auth/session` signs you in. The API sets the refresh token as an **httpOnly**
  cookie that is scoped to `/api/v1/auth/session`. JavaScript never sees that token.
- The short-lived access token (15 minutes) is kept **in memory only**. It is renewed
  before it expires, and again whenever a request gets a 401.
- When the page is reloaded, the session is restored from the cookie
  (`POST /auth/session/refresh`).
- The session endpoints need the `X-Requested-With` header. A cross-site form cannot send
  that header, and CORS only accepts it from the configured origins, so the cookie can't
  be used for request forgery.
- Signing out (`DELETE /auth/session`) ends the session on the server and deletes the
  cookie.
- Changing your password signs out every other device.
