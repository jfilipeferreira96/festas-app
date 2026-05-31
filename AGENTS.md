# AGENTS.md — Gestão de Festas Infantis

> Universal agent context file. Used by Cline, KiloCode, Cursor, Copilot, and other AI coding agents.

## Project Overview

Plataforma de gestão para espaços de festas infantis. Permite gerir reservas, festas em curso, cacifos, menus/lanches, monitores, locais/salas, participantes, clientes, utilizadores e campanhas de marketing (newsletter e SMS).

> **Page Reference:** See [`PAGINAS.md`](PAGINAS.md) for a complete list of all routes, page components, and sidebar navigation structure.
> **Project Reference:** See [`PROJECTO.md`](PROJECTO.md) for the design system, navigation, modules, and TypeScript types.

## Architecture

```
festas/
├── apps/
│   ├── web/              # Next.js 15 (Frontend) — Port 4444
│   └── server/           # Express 5 (Backend API) — Port 5555
├── packages/
│   ├── auth/             # Better Auth configuration (@festas/auth)
│   ├── db/               # Prisma schema & database client (@festas/db)
│   └── shared/
│       ├── shared-types/ # @saas/shared-types — TypeScript interfaces
│       └── shared-defaults/ # @saas/shared-defaults — Default configurations
├── skills/               # AI agent skill files (form, estado, realtime, tabela, layout, db, ptpt)
├── AGENTS.md             # This file — agent context
├── PROJECTO.md           # Design system, navigation, types
└── PAGINAS.md            # Page descriptions and business rules
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 + React 19 + Tailwind CSS 4 + TanStack Query |
| Backend | Express 5 + TypeScript + Prisma + Better Auth |
| Database | Neon PostgreSQL (serverless) via Prisma ORM |
| Validation | Zod (both frontend and backend) |
| Auth | Better Auth 1.3.x (email/password only) |
| i18n | i18next (locale: `pt-PT` only) |
| Logging | Winston with daily rotate files |
| Testing | Vitest |
| Docs | Swagger UI via CDN at `/api/docs` |

## Database

- **Provider:** Neon PostgreSQL (serverless, cloud)
- **Prisma schema:** `packages/db/prisma/schema.prisma`
- **Dev schema:** `festas` (set via `?schema=festas` in `DATABASE_URL`)
- **Test schema:** `test` (set via `?schema=testfestas` in test `DATABASE_URL`)

### Key Models

`User`, `Session`, `Account`, `Verification`, `Cliente`, `Aniversariante`, `Local`, `Extra`, `ExtraLocal`, `Monitor`, `MonitorLocal`, `ConfiguracaoCacifo`, `Reserva`, `ReservaExtra`, `ReservaMonitor`, `ReservaAniversariante`, `EtapaFesta`, `ReservaEtapa`, `Participante`, `Cacifo`, `Menu`, `Segmento`, `NewsletterContacto`, `ContactoSegmento`, `Campanha`, `EnvioCampanha`, `AuditLog`, `NotaRapida`, `FuncaoPermissao`

> **Important:** `Reserva` is unified with `Festa` — there is no separate `Festa` model. When a reserva enters `EM_CURSO` state, runtime fields (`inicioEm`, `fimPrevisto`, `fimReal`) are populated. The old `ItemMenu` model was removed; `Menu` is simplified to `nome` + `preco`.

### Enums

- `FuncaoUtilizador`: `ADMINISTRADOR`, `GESTOR`, `RECECAO`, `MARKETING`
- `EstadoReserva`: `RESERVA`, `CONFIRMADO`, `EM_CURSO`, `CONCLUIDA`, `CANCELADA`
- `EstadoCacifo`: `LIVRE`, `OCUPADO`, `RESERVADO`
- `MetodoPagamento`: `DINHEIRO`, `MULTIBANCO`, `MBWAY`, `TRANSFERENCIA`, `CARTAO`, `OUTRO`
- `EstadoCaucao`: `PAGA`, `NAO_PAGA`, `PAGA_NO_DIA`
- `CategoriaItem`: `MENU`, `EXTRA`
- `TipoCampanha`: `EMAIL`, `SMS`
- `EstadoCampanha`: `RASCUNHO`, `AGENDADA`, `ENVIADA`, `CANCELADA`

## Backend Architecture (apps/server)

### 3-Layer Pattern — ALL endpoints MUST follow this:

```
Route → Controller → Service
```

| Layer | File | Responsibility |
|-------|------|---------------|
| **Route** | `src/routes/*.routes.ts` | URL mapping + `requireAuth` middleware |
| **Controller** | `src/controllers/*.controller.ts` | Extract params, call service, format response |
| **Service** | `src/services/*.service.ts` | Business logic, DB queries, authorization |

### Error Handling Pattern

**Services** throw errors with `UPPER_SNAKE_CASE` codes:
```typescript
// service
if (!reserva) throw new Error("NOT_FOUND");
if (!salaAvailable) throw new Error("SALA_UNAVAILABLE");
```

**Controllers** map codes → i18n keys + HTTP status via `createErrorHandler`:
```typescript
const ERROR_MAP: Record<string, string> = {
  NOT_FOUND: "reserva.notFound",
  SALA_UNAVAILABLE: "reserva.salaUnavailable",
};
const STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  SALA_UNAVAILABLE: 409,
};
const handleError = createErrorHandler({ errorMap: ERROR_MAP, statusMap: STATUS_MAP, serviceName: "Reserva" });
```

### Controller Pattern

Every controller follows this structure:
```typescript
export const getResource = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });
    // ... validate params
    const result = await serviceMethod(...params);
    res.status(200).json(result);
  } catch (error) {
    handleError(error, req, res);
  }
};
```

### API Modules

| Module | Routes | Service |
|--------|--------|---------|
| Dashboard | `/api/dashboard/*` | `dashboard.service.ts` |
| Reservas | `/api/reservas/*` | `reserva.service.ts` |
| Cacifos | `/api/cacifos/*` | `cacifo.service.ts` |
| Configuração Cacifos | `/api/configuracoes/cacifos/*` | `configuracaoCacifo.service.ts` |
| Menus | `/api/menus/*` | `menu.service.ts` |
| Locais | `/api/locais/*` | `local.service.ts` |
| Clientes | `/api/clientes/*` | `cliente.service.ts` |
| Monitores | `/api/monitores/*` | `monitor.service.ts` |
| Extras | `/api/extras/*` | `extra.service.ts` |
| Etapas de Festa | `/api/etapas-festa/*` | `etapaFesta.service.ts` |
| Participantes | `/api/participantes/*` | `participante.service.ts` |
| Campanhas | `/api/campanhas/*` | `campanha.service.ts` |
| Utilizadores | `/api/utilizadores/*` | `utilizador.service.ts` |
| Permissões | `/api/permissoes/*` | `permissoes.service.ts` |
| Upload | `/api/upload/*` | `upload.service.ts` |

### Auth Middleware

- `requireAuth` from `src/middlewares/authMiddleware.ts` validates session
- Sets `req.user` (type: `User` from `@festas/auth/types`)
- Apply to all protected routes: `router.get("/path", requireAuth, controller)`

### Role Middleware

- `requireFuncao` from `src/middlewares/roleMiddleware.ts` checks user role
- Roles: `ADMINISTRADOR`, `GESTOR`, `RECECAO`, `MARKETING`
- Usage: `router.post("/reservas", requireAuth, requireFuncao("ADMINISTRADOR", "GESTOR"), createReserva)`

### i18n

- Use `req.t("key")` for ALL user-facing messages
- Only `pt-PT` locale is supported
- Translation file: `src/i18n/locales/pt-PT/messages.json`

## Frontend Architecture (apps/web)

### Route Groups

The app uses Next.js route groups:

- `(guest)/` — Public pages (auth, password recovery) — no sidebar
- `(protected)/` — Authenticated pages — sidebar + header layout

### Routes (App Router)

| Route | Page |
|-------|------|
| `/entrar` | Login (guest) |
| `/registar` | Registar (guest) |
| `/recuperar-palavra-passe` | Recuperar palavra-passe (guest) |
| `/reset-password` | Reset password (guest) |
| `/dashboard` | Dashboard (protected) |
| `/reservas` | Reservas (protected) |
| `/calendario` | Calendário (protected) |
| `/festas` | Festas (protected) |
| `/festas/a-decorrer` | Festas a decorrer (protected) |
| `/cacifos` | Cacifos (protected) |
| `/menus` | Menus (protected) |
| `/relatorios` | Relatórios (protected) |
| `/divulgacoes` | Divulgações (protected) |
| `/clientes` | Clientes (protected) |
| `/configuracoes/utilizadores` | Utilizadores (protected) |
| `/configuracoes/permissoes` | Permissões (protected) |
| `/configuracoes/monitores` | Monitores (protected) |
| `/configuracoes/locais` | Locais (protected) |
| `/configuracoes/extras` | Extras (protected) |
| `/configuracoes/etapas-festa` | Etapas de Festa (protected) |
| `/configuracoes/cacifos` | Configuração de Cacifos (protected) |
| `/configuracoes/newsletter` | Newsletter (protected) |

### Layout Structure

Protected pages use `AppSidebar` + `AppHeader` + `Backdrop` from `src/layout/`:
- `AppSidebar` — Fixed sidebar (220px) with navigation
- `AppHeader` — Top bar with user info
- `Backdrop` — Mobile sidebar overlay

### Data Fetching Pattern

1. **API Client** in `lib/api/[resource].ts` — typed fetch wrapper with `credentials: "include"`
2. **Custom Hook** in `hooks/use-[resource].ts` — TanStack Query (useQuery/useMutation)
3. **Component** — uses hooks, never fetches directly

### Component Rules

- Server Components by default, `'use client'` only when needed
- `cn()` for conditional classes (tailwind-merge)
- CVA for component variants
- `React.memo` for modals, forms, lists
- `useCallback` for event handlers passed as props
- `useMemo` for computed values
- Max 200 lines per component

### Design System

- Colors defined as CSS custom properties in `globals.css` using Tailwind CSS 4 `@theme` directive
- Poppins for headings/metrics, Inter for body text
- Use design tokens: `bg-primary-400`, `text-primary-500`, `bg-surface`, etc.
- Icons: `lucide-react` exclusively
- See `PROJECTO.md` section 2 for full design system

### Forms

- React Hook Form + Zod validation
- **CRITICAL: ALWAYS use project components from `@/components/form/` for form elements**
- Available: `Select`, `MultiSelect`, `InputField`, `TextArea`, `Checkbox`, `Switch`, `DatePicker`

## Shared Packages

### @saas/shared-types
TypeScript interfaces for: utilizador, cliente, aniversariante, reserva (unified with festa), cacifo, configuracaoCacifo, menu, local, monitor, extra, extraLocal, campanha, etapaFesta, participante, permissao, audit.

### @saas/shared-defaults
Default configurations for: extras, menus, locais, menu-templates.

## Testing

- **Framework:** Vitest
- **Config:** `apps/server/vitest.config.ts`
- **Test schema:** `test` (isolated PostgreSQL schema in same Neon database)
- **Setup:** `apps/server/__tests__/setup-db.ts` creates `test` schema and pushes tables
- **Test helpers:** `apps/server/__tests__/helpers/seed.ts` provides `seedTestData()` and `cleanTestData()`
- **Test client:** `apps/server/__tests__/helpers/test-prisma.ts` provides PrismaClient configured for `test` schema

### Test Files

| File | Service tested |
|------|---------------|
| `permissoes.service.test.ts` | CRUD for permissões, seedDefaults, hasAccess |
| `local.service.test.ts` | CRUD for locais |
| `reserva.service.test.ts` | Create, list, updateStatus, delete |
| `cacifo.service.test.ts` | MarcarOcupado, marcarPago, libertar |
| `extra.service.test.ts` | CRUD for extras |
| `cliente.service.test.ts` | CRUD for clientes, search |
| `monitor.service.test.ts` | CRUD for monitores, listActive |
| `campanha.service.test.ts` | Create, update, enviar, metricas |
| `menu.service.test.ts` | getByReservaId, create |
| `dashboard.service.test.ts` | getKPIs, getFestasEmCurso, getProximasFestas |
| `utilizador.service.test.ts` | CRUD for utilizadores, updateFuncao |
| `participante.service.test.ts` | CRUD for participantes, check-in |
| `paginacao-filtro-pesquisa.test.ts` | Paginação, filtros e pesquisa genérica |

### Test Pattern

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import testPrisma from "../helpers/test-prisma";
import { seedTestData, cleanTestData } from "../helpers/seed";

vi.mock("@festas/db", () => ({
  PrismaClient: vi.fn(() => testPrisma),
}));

describe("ServiceName", () => {
  beforeAll(async () => { await seedTestData(); });
  afterAll(async () => { await cleanTestData(); });

  it("should ...", async () => { /* ... */ });
});
```

## API Conventions

- RESTful, plural resource names
- Response format: `{ error: "msg" }` for errors, `{ message: "msg", data }` for success
- Status codes: 200, 201, 400, 401, 403, 404, 409, 500
- Swagger UI: `http://localhost:5555/api/docs`

## Commands

```bash
npm run dev              # Start all apps in dev mode
npm run dev:server       # Start backend only
npm run dev:web          # Start frontend only
npm run build            # Build everything
npm run build:shared     # Build shared packages only
npm run check-types      # TypeScript type checking
npm run db:push          # Push Prisma schema to DB
npm run db:generate      # Generate Prisma client
npm run db:studio        # Open Prisma Studio
npm run db:reset         # Reset database (drop + push + generate)
npm run db:clean         # Clean database (wipe migrations + drop stale enums + push:force + generate)
npm run db:seed:dev      # Seed dev data (festas schema)
npm run test             # Run tests (server) — setup + vitest
```

### Database Scripts (`packages/db/scripts/db.js`)

The `db:clean` and `db:reset` commands automatically clean stale enum types (`_old` suffix) before running `prisma db push` to prevent the `cannot drop type X_old` PostgreSQL error.

## Environment Variables

**Frontend** (`apps/web/.env`):
- `NEXT_PUBLIC_APP_URL` — Frontend URL (http://localhost:4444)
- `NEXT_PUBLIC_SERVER_URL` — Backend API URL (http://localhost:5555)

**Backend** (`apps/server/.env`):
- `DATABASE_URL` — Neon PostgreSQL connection string (includes `?schema=festas`)
- `BETTER_AUTH_SECRET` — Auth secret key
- `BETTER_AUTH_URL` — Backend URL
- `CORS_ORIGIN` — Frontend URL for CORS
- `MAILJET_API_KEY`, `MAILJET_API_SECRET`, `MAILJET_SENDER_EMAIL`, `MAILJET_SENDER_NAME` — Email config

## Critical Rules

- **NEVER use `any` type** — Always use proper types or `unknown` with type guards
- **PT-PT only** — All UI text in Portuguese of Portugal
- **Design tokens** — Use CSS custom properties from `@theme` in `globals.css`, never raw hex colors
- **lucide-react** — Only icon library allowed
- **date-fns with pt locale** — For all date formatting
- **Intl.NumberFormat('pt-PT')** — For currency formatting (€)
- **Node.js v22** — Required for tsdown/rolldown compatibility
