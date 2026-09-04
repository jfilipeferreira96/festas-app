# AGENTS.md - Gestão de Festas Infantis

> Universal agent context file. Used by Cline, KiloCode, Cursor, Copilot, and other AI coding agents.

## Project Overview

Plataforma de gestão para espaços de festas infantis. Permite gerir reservas, festas em curso, cacifos, menus/lanches, monitores, locais/salas, participantes, clientes, utilizadores e campanhas de marketing (newsletter e SMS).

> **Page Reference:** See [`PAGINAS.md`](PAGINAS.md) for a complete list of all routes, page components, and sidebar navigation structure.
> **Project Reference:** See [`PROJECTO.md`](PROJECTO.md) for the design system, navigation, modules, and TypeScript types.

## Architecture

```
festas/
├── apps/
│   └── web/              # Next.js 15 (Fullstack: Frontend + API Routes)
│       ├── src/
│       │   ├── app/              # App Router pages + API routes
│       │   │   ├── (guest)/      # Public pages (auth, password recovery)
│       │   │   ├── (protected)/  # Authenticated pages (sidebar + header layout)
│       │   │   └── api/          # API routes (/api/*)
│       │   ├── services/         # Business logic (Service layer)
│       │   ├── components/       # React components
│       │   ├── hooks/            # TanStack Query hooks
│       │   ├── lib/              # Utilities, auth, API clients
│       │   ├── layout/           # AppSidebar, AppHeader, Backdrop
│       │   └── i18n/             # PT-PT translations
│       ├── __tests__/            # Vitest test files
│       └── package.json
├── packages/
│   ├── auth/             # Better Auth configuration (@festas/auth)
│   ├── db/               # Prisma schema & database client (@festas/db)
│   └── shared/
│       ├── shared-types/ # @saas/shared-types - TypeScript interfaces
│       └── shared-defaults/ # @saas/shared-defaults - Default configurations
├── skills/               # AI agent skill files (form, estado, realtime, tabela, layout, db, ptpt)
├── AGENTS.md             # This file - agent context
├── PROJECTO.md           # Design system, navigation, types
└── PAGINAS.md            # Page descriptions and business rules
```

**Pattern:** API Route → Service → Prisma (no controllers, no Express)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Fullstack | Next.js 15 (App Router) + React 19 + TypeScript |
| Database | MySQL 8.x via Prisma ORM |
| Validation | Zod (frontend & API routes) |
| Auth | Better Auth 1.3.x (email/password only) |
| State Management | TanStack Query (React Query) |
| i18n | i18next (locale: `pt-PT` only) |
| Testing | Vitest |

## Database

- **Provider:** MySQL 8.x
- **Prisma schema:** `packages/db/prisma/schema.prisma`
- **Dev database:** `festas` (main `DATABASE_URL`)
- **Test database:** `festas_test` (auto-created by `__tests__/setup-db.ts`)

### Key Models

`User`, `Session`, `Account`, `Verification`, `Cliente`, `Aniversariante`, `Local`, `Extra`, `ExtraLocal`, `Monitor`, `MonitorLocal`, `ConfiguracaoCacifo`, `Reserva`, `ReservaExtra`, `ReservaMonitor`, `ReservaAniversariante`, `EtapaFesta`, `ReservaEtapa`, `Participante`, `Cacifo`, `Menu`, `Segmento`, `NewsletterContacto`, `ContactoSegmento`, `Campanha`, `EnvioCampanha`, `AuditLog`, `NotaRapida`, `EntradaLivre`, `ExcecaoCalendario`, `SlotHorario`, `ConfiguracaoPreco`, `NotaDiaria`

> **Important:** `Reserva` is unified with `Festa` - there is no separate `Festa` model. When a reserva enters `EM_CURSO` state, runtime fields (`inicioEm`, `fimPrevisto`, `fimReal`) are populated. The old `ItemMenu` model was removed; `Menu` is simplified to `nome` + `preco` + `notasLanche`.
>
> **RBAC is hardcoded** - the `FuncaoPermissao` model was removed. Permissions are defined in code (`src/lib/permissoes.ts`). Five roles exist: `ADMINISTRADOR`, `LANCHE`, `CACIFOS`, `MONITOR`, `FESTAS_ACABAR`. Each non-admin role is redirected to a role-specific home page via `getHomeRoute()`.
>
> **New pricing model:** Festas are priced per-child (`precoCriancaSemana`/`precoCriancaFimSemana`) with minimums by nº of aniversariantes. `ConfiguracaoPreco` is a singleton holding all tariffs. `ExcecaoCalendario` marks feriados (affect price) and blocked days (prevent booking). `SlotHorario` defines preset party time slots (default 2h15m = 135 min). `EntradaLivre` supports multiple children, mandatory socks (meias), and split payments (up to 2 methods).
>
> **Role views:** Each non-admin role sees a tailored view. `LANCHE` gets an enhanced lanche table (estado lanche dropdown + observações modal). `MONITOR` sees the Gantt chart + daily notes (`NotaDiaria` written by admin). `FESTAS_ACABAR` sees a table of EM_CURSO festas with brindes/lesões fields. `CACIFOS` sees festas + cacifos only.

### Enums

- `FuncaoUtilizador`: `ADMINISTRADOR`, `LANCHE`, `CACIFOS`, `MONITOR`, `FESTAS_ACABAR`
- `EstadoReserva`: `RESERVA`, `CONFIRMADO`, `EM_CURSO`, `CONCLUIDA`, `CANCELADA`
- `EstadoLanche`: `NAO_INICIADO`, `A_DECORRER`, `TERMINADO`
- `EstadoCacifo`: `LIVRE`, `OCUPADO`, `RESERVADO`
- `EstadoEntradaLivre`: `ATIVA`, `CONCLUIDA`, `CANCELADA`
- `MetodoPagamento`: `DINHEIRO`, `MULTIBANCO`, `MBWAY`, `TRANSFERENCIA`, `CARTAO`, `OUTRO`
- `EstadoCaucao`: `PAGA`, `NAO_PAGA`, `PAGA_NO_DIA`
- `CategoriaItem`: `MENU`, `EXTRA`
- `TipoExcecao`: `FERIADO`, `BLOQUEADO`
- `TipoCampanha`: `EMAIL`, `SMS`
- `EstadoCampanha`: `RASCUNHO`, `AGENDADA`, `ENVIADA`, `CANCELADA`

## API Architecture (apps/web/src)

### Pattern - ALL endpoints MUST follow this:

```
API Route → Service → Prisma
```

| Layer | File | Responsibility |
|-------|------|---------------|
| **API Route** | `src/app/api/[resource]/route.ts` | HTTP methods (GET, POST, PATCH, DELETE) + auth checks |
| **Service** | `src/services/*.service.ts` | Business logic, DB queries, authorization |

### API Route Pattern

Every API route follows this structure:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import * as service from "@/services/reserva.service";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const result = await service.getAllReservas();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  try {
    const result = await service.createReserva(body, session.user);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

### Error Handling Pattern

**Services** throw errors with `UPPER_SNAKE_CASE` codes:
```typescript
// service
if (!reserva) throw new Error("NOT_FOUND");
if (!salaAvailable) throw new Error("SALA_UNAVAILABLE");
```

**API Routes** map codes → i18n keys + HTTP status:
```typescript
const ERROR_MAP: Record<string, { key: string; status: number }> = {
  NOT_FOUND: { key: "reserva.notFound", status: 404 },
  SALA_UNAVAILABLE: { key: "reserva.salaUnavailable", status: 409 },
};

// In the catch block
if (error.message in ERROR_MAP) {
  const { key, status } = ERROR_MAP[error.message];
  return NextResponse.json({ error: t(key) }, { status });
}
```

### API Modules

| Module | Routes | Service |
|--------|--------|---------|
| Dashboard | `/api/dashboard/*` | `src/services/dashboard.service.ts` |
| Reservas | `/api/reservas/*` | `src/services/reserva.service.ts` |
| Cacifos | `/api/cacifos/*` | `src/services/cacifo.service.ts` |
| Configuração Cacifos | `/api/configuracoes/cacifos/*` | `src/services/configuracaoCacifo.service.ts` |
| Menus | `/api/menus/*` | `src/services/menu.service.ts` |
| Locais | `/api/locais/*` | `src/services/local.service.ts` |
| Clientes | `/api/clientes/*` | `src/services/cliente.service.ts` |
| Monitores | `/api/monitores/*` | `src/services/monitor.service.ts` |
| Extras | `/api/extras/*` | `src/services/extra.service.ts` |
| Etapas de Festa | `/api/etapas-festa/*` | `src/services/etapaFesta.service.ts` |
| Participantes | `/api/participantes/*` | `src/services/participante.service.ts` |
| Campanhas | `/api/campanhas/*` | `src/services/campanha.service.ts` |
| Utilizadores | `/api/utilizadores/*` | `src/services/utilizador.service.ts` |
| Upload | `/api/upload/*` | `src/services/upload.service.ts` |
| Aloc. Monitores | `/api/alocacao-monitores/*` | `src/services/alocacaoMonitor.service.ts` |
| Entrada Livre | `/api/entrada-livre/*` | `src/services/entradaLivre.service.ts` |
| Lanche | `/api/lanche/*` | `src/services/lanche.service.ts` |
| Config. Preços | `/api/configuracoes/precos/*` | `src/services/configuracaoPreco.service.ts` |
| Exceções Calendário | `/api/excecoes-calendario/*` | `src/services/excecaoCalendario.service.ts` |
| Slots Horário | `/api/slots-horario/*` | `src/services/slotHorario.service.ts` |
| Relatórios | `/api/relatorios/*` | `src/services/relatorio.service.ts` |
| Notas Diárias | `/api/notas-diarias/*` | `src/services/notaDiaria.service.ts` |
| Festas a Acabar | `/api/festas-acabar/*` | `src/services/festasAcabar.service.ts` |

### Auth

- `requireAuth()` from `src/lib/auth.ts` validates session
- Returns `session` object with `session.user` or `null`
- Apply at start of all protected API routes
- Roles are checked in services: `if (session.user.funcao !== "ADMINISTRADOR") throw new Error("UNAUTHORIZED")`

### i18n

- Use `t("key")` from `src/i18n/` for ALL user-facing messages
- Only `pt-PT` locale is supported
- Translation file: `src/locales/pt-PT/messages.json`

## Frontend Architecture (apps/web)

### Route Groups

The app uses Next.js route groups:

- `(guest)/` - Public pages (auth, password recovery) - no sidebar
- `(protected)/` - Authenticated pages - sidebar + header layout

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
| `/festas-acabar` | Festas a Acabar (protected, FESTAS_ACABAR role) |
| `/monitores` | Monitores / Gantt (protected, MONITOR role) |
| `/cacifos` | Cacifos (protected) |
| `/lanche` | Lanche (protected) |
| `/menus` | Menus (protected) |
| `/relatorios` | Relatórios (protected) |
| `/divulgacoes` | Divulgações (protected) |
| `/clientes` | Clientes (protected) |
| `/configuracoes/utilizadores` | Utilizadores (protected) |
| `/configuracoes/precos` | Config. Preços (protected) |
| `/configuracoes/excecoes-calendario` | Exceções Calendário (protected) |
| `/configuracoes/slots-horario` | Slots Horário (protected) |
| `/configuracoes/monitores` | Monitores (protected) |
| `/configuracoes/locais` | Locais (protected) |
| `/configuracoes/extras` | Extras (protected) |
| `/configuracoes/etapas-festa` | Etapas de Festa (protected) |
| `/configuracoes/cacifos` | Configuração de Cacifos (protected) |
| `/configuracoes/newsletter` | Newsletter (protected) |

### Layout Structure

Protected pages use `AppSidebar` + `AppHeader` + `Backdrop` from `src/layout/`:
- `AppSidebar` - Fixed sidebar (220px) with navigation
- `AppHeader` - Top bar with user info
- `Backdrop` - Mobile sidebar overlay

### Data Fetching Pattern

1. **API Client** in `lib/api/[resource].ts` - typed fetch wrapper with `credentials: "include"`
2. **Custom Hook** in `hooks/use-[resource].ts` - TanStack Query (useQuery/useMutation)
3. **Component** - uses hooks, never fetches directly

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
- **Config:** `apps/web/vitest.config.ts`
- **Test database:** `festas_test` (separate MySQL database, auto-created by `__tests__/setup-db.ts`)
- **Setup:** `apps/web/__tests__/setup-db.ts` creates the `festas_test` database and pushes the Prisma schema; `__tests__/setup.ts` loads env
- **Test helpers:** `apps/web/__tests__/helpers/seed.ts` provides `seedTestData()` and `cleanTestData()`
- **Test client:** `apps/web/__tests__/helpers/test-prisma.ts` provides a PrismaClient configured for the test database

### Test Files

| File | Service tested |
|------|---------------|
| `rbac.test.ts` | RBAC hardcoded: FUNCOES, PERMISSOES matrix, hasAccess, role isolation |
| `local.service.test.ts` | CRUD for locais |
| `reserva.service.test.ts` | Create, list, updateStatus, delete, DAY_BLOCKED, meias/split, materialização de cacifos no dia (iniciar top-up) |
| `cacifo.service.test.ts` | MarcarOcupado, marcarPago, libertar, histórico, getDisponiveisParaFesta, preReservarCacifos |
| `extra.service.test.ts` | CRUD for extras |
| `cliente.service.test.ts` | CRUD for clientes, search |
| `monitor.service.test.ts` | CRUD for monitores, listActive |
| `campanha.service.test.ts` | Create, update, enviar, metricas |
| `menu.service.test.ts` | getByReservaId, create |
| `dashboard.service.test.ts` | getKPIs, getFestasEmCurso, getProximasFestas, totalCriancasNoParque |
| `utilizador.service.test.ts` | CRUD for utilizadores, updateFuncao |
| `participante.service.test.ts` | CRUD for participantes, check-in |
| `entradaLivre.service.test.ts` | CRUD, concluir, pagamento, meias/split, multi-criança |
| `configuracaoPreco.service.test.ts` | getConfig, updateConfig, calcularPrecoFesta, meias, entradas |
| `excecaoCalendario.service.test.ts` | CRUD, isFeriado, isBloqueado, recorrenciaAnual |
| `slotHorario.service.test.ts` | CRUD, list/listAll, duracaoMin default |
| `lanche.service.test.ts` | getLanchesDoDia, getById, atualizarNotas, alergias, atualizarEstadoLanche |
| `notaDiaria.service.test.ts` | getByData, upsert (manhã/tarde) |
| `festasAcabar.service.test.ts` | getFestas (EM_CURSO), atualizarObservacoes |
| `paginacao-filtro-pesquisa.test.ts` | Paginação, filtros e pesquisa genérica |

### Test Pattern

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import testPrisma from "../helpers/test-prisma";
import { seedTestData, cleanTestData } from "../helpers/seed";

vi.mock("@festas/db", () => ({
  default: testPrisma,
}));

vi.mock("@/lib/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), http: vi.fn() },
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

## Commands

```bash
npm run dev              # Start Next.js in dev mode
npm run build            # Build Next.js application
npm run build:shared     # Build shared packages only
npm run check-types      # TypeScript type checking
npm run db:push          # Push Prisma schema to DB
npm run db:generate      # Generate Prisma client
npm run db:studio        # Open Prisma Studio
npm run db:reset         # Reset database (drop + push + generate)
npm run db:clean         # Clean database (wipe migrations + drop stale enums + push:force + generate)
npm run db:seed:dev      # Seed dev data (festas schema)
npm run test             # Run tests (Vitest)
```

### Database Scripts (`packages/db/scripts/db.js`)

The `db:clean` and `db:reset` commands clean stale enum values before running `prisma db push`.

## Environment Variables

**App** (`apps/web/.env`):
- `DATABASE_URL` - MySQL connection string (`mysql://user:pass@host:3306/festas`)
- `BETTER_AUTH_SECRET` - Auth secret key
- `BETTER_AUTH_URL` - Backend URL (same as app URL)
- `NEXT_PUBLIC_APP_URL` - Frontend URL (http://localhost:3000)
- `MAILJET_API_KEY`, `MAILJET_API_SECRET`, `MAILJET_SENDER_EMAIL`, `MAILJET_SENDER_NAME` - Email config

## Critical Rules

- **NEVER use `any` type** - Always use proper types or `unknown` with type guards
- **PT-PT only** - All UI text in Portuguese of Portugal
- **Design tokens** - Use CSS custom properties from `@theme` in `globals.css`, never raw hex colors
- **lucide-react** - Only icon library allowed
- **date-fns with pt locale** - For all date formatting
- **Intl.NumberFormat('pt-PT')** - For currency formatting (€)
- **Node.js v22** - Required for tsdown/rolldown compatibility