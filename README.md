## Lawpath Engineer Assessment

### Live Demo

- **Vercel**: [`https://lp-assessment.vercel.app/`](https://lp-assessment.vercel.app/)

### Quick Start (Local)

1. Install dependencies

```bash
pnpm install
```

2. Create `.env.local` with the variables below

```bash
# Auth / crypto
BCRYPT_SALT_ROUNDS=10

# Upstash Redis
REDIS_URL=your-upstash-redis-url
REDIS_TOKEN=your-upstash-redis-token

# Elasticsearch (Serverless)
ELASTICSEARCH_URL=https://your-es-endpoint
ELASTICSEARCH_API_KEY=your-es-api-key

# Australia Post API (mock/proxy for assessment)
AUS_POST_API_URL=https://example.com/auspost
AUS_POST_API_KEY=your-auspost-api-key

# Google Maps (client-side)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

3. Run the app

```bash
pnpm dev
```

4. Open `http://localhost:3000`

### Scripts

- **dev**: `pnpm dev`
- **build**: `pnpm build`
- **start**: `pnpm start`
- **lint**: `pnpm lint`
- **unit tests**: `pnpm test`
- **e2e tests**: `pnpm test:e2e`

### Project Structure (highlights)

- `src/app`:
  - `page.tsx`: CSR page rendering the verifier UI with `ApolloProvider` and the address validation context
  - `api/graphql-proxy/route.ts`: GraphQL-style POST endpoint for address validation with rate limiting and logging
  - `(auth)/login`, `(auth)/signup`: auth pages
- `src/components`:
  - `auth/*`: forms and helpers for login/signup
  - `verifier/VerifierForm.tsx`: form with `react-hook-form` + `zod`
  - `verifier/Map.tsx`: Google Maps rendering via `@react-google-maps/api`
- `src/contexts/address-validation-context.tsx`: Apollo `useLazyQuery` + UI state management
- `src/lib`:
  - `apollo.ts`: client configured to `/api/graphql-proxy`
  - `elastic.ts`: Elasticsearch client and index ensure helpers
  - `auspost.ts`: outbound fetch to AusPost API
  - `rate-limit.ts`, `redis.ts`: Upstash integrations
- `src/data/*`: data access layer (users, logs)
- `src/utils/*`: env, auth (bcrypt), session (Redis cookie), current user utilities, verifier core
- `src/validation/*`: zod schemas and validators
- `tests/*`: Playwright E2E tests
- `src/utils/__tests__`, `src/validation/__tests__`: Vitest unit tests

```text
src/
├── app/                               # Next.js App Router
│   ├── (auth)/                        # Auth routes (public)
│   │   ├── login/                     # Login page
│   │   └── signup/                    # Signup page
│   ├── api/
│   │   └── graphql-proxy/             # GraphQL-style validation endpoint
│   │       └── route.ts               # Address validation handler
│   ├── globals.css
│   ├── layout.tsx                     # Root layout
│   └── page.tsx                       # Verifier UI (CSR)
├── components/                        # UI and feature components
│   ├── auth/                          # Login/Signup forms
│   ├── core/                          # App header
│   ├── svg/                           # SVG components
│   ├── ui/                            # shadcn/ui wrappers
│   └── verifier/                      # Verifier form + map
├── constants/                         # Constants (session, ES indexes, etc.)
├── contexts/                          # React context (address validation)
├── data/                              # DAL for Elasticsearch (users, logs)
├── hooks/                             # Custom hooks (form persistence)
├── lib/                               # Integrations (Apollo, ES, Redis, AusPost)
├── server-actions/                    # Auth server actions (signup/login/logout)
├── types/                             # TypeScript types
├── utils/                             # Env, auth (bcrypt), session, verifier core
└── validation/                        # Zod schemas + validators
```

### Authentication

- **Session storage**: Upstash Redis (`session:<id>`) with 7-day expiry; cookie key is `session-id` (`src/constants/session.ts`)
- **Cookie**: `httpOnly`, `sameSite=lax`, `secure` in production
- **Password hashing**: `bcryptjs` with `BCRYPT_SALT_ROUNDS`
- **Server Actions**: `src/server-actions/log-in.ts`, `sign-up.ts`, `log-out.ts`
  - Signup: create user in Elasticsearch, start session
  - Login: verify credentials, start session
  - Logout: clear session
- **Route protection**: `src/middleware.ts` checks session (Edge-compatible util) and redirects
  - Guest routes: `/login`, `/signup`
  - All others require an active session
- **Rate limiting**: Upstash Ratelimit for auth actions (sliding window)

### Address Verification (GraphQL Proxy + Apollo)

- **Client**: `ApolloClient` targets `/api/graphql-proxy`; query in `src/lib/graphql/query.ts`
- **Context**: `AddressValidationProvider` handles query lifecycle, messages, and coordinate extraction
- **API route**: `src/app/api/graphql-proxy/route.ts`
  - Validates input (Zod)
  - Applies IP-based rate limit via Upstash
  - Calls AusPost API (`src/lib/auspost.ts`)
  - Validates response (`src/utils/verifier.ts`) and returns success/error + optional coordinates
  - Logs attempts to Elasticsearch (success/failure)

### Elasticsearch Integration

- **Client**: configured for Serverless mode (`src/lib/elastic.ts`)
- **Indices**: prefix from `src/constants/elasticsearch.ts` -> `owen-yoo-users`, `owen-yoo-logs`
- **Users mapping**: `id`, `name`, `email`, `password`, `createdAt`
- **Logs mapping**: `userId`, `postcode`, `suburb`, `state`, `timestamp`, `success`, `errorMessage`
- **Ensure functions**: indices created if missing (called during signup/login and proxy route)

### Google Maps

- **Library**: `@react-google-maps/api`
- **API key**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (client-side only)
- **Behavior**: If validation succeeds and coordinates are present, renders map and a marker; otherwise shows an informative message

### Testing

- **Unit (Vitest)**
  - Command: `pnpm test`
  - Environment: `jsdom`; tests under `src/**/__tests__` and `src/**/*.test.ts(x)`
- **E2E (Playwright)**
  - One-time: `pnpm exec playwright install`
  - Run: `pnpm test:e2e`
  - Config: `playwright.config.ts` starts the dev server and loads `.env.local`

### Branch Strategy (history summary)

- `feature/auth`: user signup/login, bcrypt, Redis sessions, tests
- `feature/protect-route`: middleware-based protection, edge-compatible session util
- `feature/verifier-form-with-graphql-proxy`: verifier form, Apollo client, proxy route
- `feature/persist-form-data`: localStorage persistence for form
- `feature/logging`: verification attempt logging to Elasticsearch
- `feature/google-map`: Google Maps integration and related tests
- `feat/rate-limit`: Upstash Ratelimit on auth and validation route
- `fix/index-not-found`: ensure ES indices exist to prevent not-found in prod; map fixes

### Tech Stack

- **Next.js 15**, **React 19** (App Router)
- **Apollo Client**, **@react-google-maps/api**
- **React Hook Form**, **Zod**
- **Upstash (Redis, Ratelimit)**
- **Elasticsearch (serverless)**
- **Vitest**, **Playwright**
- **Tailwind CSS 4**, **shadcn/ui**, **lucide-react**

### Notes / Decisions

- **CSR for verifier UI**: `page.tsx` is client-side for immediate interactivity, toasts, and map rendering
- **Server Actions for auth**: simple form handling and redirects without extra API routes
- **Route Handler for validation**: cohesive orchestration (rate limit, AusPost call, validation, logging)
- **Edge middleware**: fast redirects for protected routes using an Edge-safe session lookup
- **Serverless-friendly services**: Upstash and ES serverless for low-ops setup

---

If you need the deployed demo credentials or API keys for review, please request them separately. The app will error on startup if required env vars are missing (see `src/utils/env.ts`).
