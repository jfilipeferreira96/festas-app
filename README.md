# Gestão de Festas Infantis

Plataforma de gestão para espaços de festas infantis. Permite gerir reservas, festas em curso, cacifos, menus/lanches, monitores, locais/salas, utilizadores e campanhas de marketing (newsletter e SMS).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Fullstack | Next.js 15 (App Router) + React 19 + TypeScript |
| Database | MySQL 8.x via Prisma ORM |
| Validation | Zod (frontend & API routes) |
| Auth | Better Auth 1.3.x (email/password only) |
| State Management | TanStack Query (React Query) |
| Styling | Tailwind CSS 4 |
| i18n | i18next (locale: `pt-PT` only) |
| Testing | Vitest |

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
│       │   └── layout/           # AppSidebar, AppHeader, Backdrop
│       ├── __tests__/            # Vitest test files
│       └── package.json
├── packages/
│   ├── auth/             # Better Auth configuration (@festas/auth)
│   ├── db/               # Prisma schema & database client (@festas/db)
│   └── shared/
│       ├── shared-types/ # @saas/shared-types - TypeScript interfaces
│       └── shared-defaults/ # @saas/shared-defaults - Default configurations
├── skills/               # AI agent skill files (form, estado, realtime, tabela, layout, db, ptpt)
├── AGENTS.md             # Agent context file
├── PROJECTO.md           # Design system, navigation, types
└── PAGINAS.md            # Page descriptions and business rules
```

**Pattern:** API Route → Service → Prisma (no controllers, no Express)

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm

### 1. Clone & Install

```bash
git clone <repo-url>
cd festas
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts a PostgreSQL database on port 5432 with:
- Database: `festas_db`
- User: `festas`
- Password: `password`

### 3. Configure Environment

**App** (`apps/web/.env`):
```env
DATABASE_URL="postgresql://festas:password@localhost:5432/festas_db?schema=festas"
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Setup Database

```bash
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
```

### 5. Start Development

```bash
npm run dev
```

- Application: http://localhost:3000
- API routes: http://localhost:3000/api/*

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js in dev mode |
| `npm run build` | Build Next.js application |
| `npm run build:shared` | Build shared packages only |
| `npm run check-types` | TypeScript type checking |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset database (drop + push + generate) |
| `npm run db:clean` | Clean database (wipe migrations + drop stale enums + push:force + generate) |
| `npm run db:seed:dev` | Seed dev data (festas schema) |
| `npm run test` | Run tests (Vitest) |

## API Routes (Next.js App Router)

All API routes are defined in `apps/web/src/app/api/[resource]/route.ts` and follow the pattern:
**API Route → Service → Prisma**

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

## User Roles (RBAC)

| Role | Access |
|------|--------|
| Administradora | Full access to all modules |
| Gestora | Reservas, festas, menus, cacifos, relatórios |
| Receção | Reservas e calendário |
| Marketing | Divulgações e relatórios |

## Documentation

- [`PROJECTO.md`](PROJECTO.md) - Design system, navigation, modules, TypeScript types
- [`PAGINAS.md`](PAGINAS.md) - Detailed page descriptions and business rules
- [`AGENTS.md`](AGENTS.md) - Agent context file for AI coding assistants

## License

Private project. All rights reserved.
