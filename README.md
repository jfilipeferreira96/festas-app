# Gestão de Festas Infantis

Plataforma de gestão para espaços de festas infantis. Permite gerir reservas, festas em curso, cacifos, menus/lanches, monitores, locais/salas, utilizadores e campanhas de marketing (newsletter e SMS).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 + React 19 + Tailwind CSS 4 + TanStack Query |
| Backend | Express 5 + TypeScript + Prisma + Better Auth |
| Database | PostgreSQL via Prisma ORM |
| Validation | Zod (both frontend and backend) |
| Auth | Better Auth (email/password only) |
| i18n | i18next (locale: `pt-PT` only) |
| Logging | Winston with daily rotate files |
| Docs | Swagger UI at `/api/docs` |

## Architecture

```
festas/
├── apps/
│   ├── web/              # Next.js 15 (Frontend) — Port 4444
│   └── server/           # Express 5 (Backend API) — Port 5555
├── packages/
│   ├── auth/             # Better Auth configuration
│   ├── db/               # Prisma schema & database client
│   └── shared/
│       ├── shared-types/ # @saas/shared-types — TypeScript interfaces
│       └── shared-defaults/ # @saas/shared-defaults — Default configurations
```

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

**Backend** (`apps/server/.env`):
```env
DATABASE_URL="postgresql://festas:password@localhost:5432/festas_db"
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:5555"
CORS_ORIGIN="http://localhost:4444"
```

**Frontend** (`apps/web/.env`):
```env
NEXT_PUBLIC_SERVER_URL=http://localhost:5555
NEXT_PUBLIC_APP_URL=http://localhost:4444
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

- Frontend: http://localhost:4444
- Backend API: http://localhost:5555
- Swagger Docs: http://localhost:5555/api/docs

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in dev mode |
| `npm run build` | Build everything |
| `npm run build:shared` | Build shared packages only |
| `npm run check-types` | TypeScript type checking |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:studio` | Open Prisma Studio |

## API Modules

| Module | Routes | Description |
|--------|--------|-------------|
| Dashboard | `/api/dashboard/*` | KPIs, festas em curso, próximas festas |
| Reservas | `/api/reservas/*` | CRUD reservas, estado stepper |
| Festas | `/api/festas/*` | Festas activas, iniciar/finalizar |
| Cacifos | `/api/cacifos/*` | Gestão de cacifos, estados |
| Menus | `/api/menus/*` | Lanches e extras por reserva |
| Locais | `/api/locais/*` | Salas e espaços |
| Clientes | `/api/clientes/*` | Gestão de clientes |
| Monitores | `/api/monitores/*` | Monitores e alocação |
| Extras | `/api/extras/*` | Extras disponíveis |
| Campanhas | `/api/campanhas/*` | Newsletter e SMS |

## User Roles (RBAC)

| Role | Access |
|------|--------|
| Administradora | Full access to all modules |
| Gestora | Reservas, festas, menus, cacifos, relatórios |
| Receção | Reservas e calendário |
| Marketing | Divulgações e relatórios |

## Documentation

- [`PROJECTO.md`](PROJECTO.md) — Design system, navigation, modules, TypeScript types
- [`PAGINAS.md`](PAGINAS.md) — Detailed page descriptions and business rules
- [`AGENTS.md`](AGENTS.md) — Agent context file for AI coding assistants

## License

Private project. All rights reserved.
