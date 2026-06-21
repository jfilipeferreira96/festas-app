# Gestão de Festas Infantis — Documentação do Projecto

> Documento de referência para desenvolvimento com Next.js 15 (Fullstack) + TypeScript (PT-PT).  
> Destinado a agentes de IA, developers e designers que trabalhem neste projecto.

---

## 1. Visão Geral

**Nome do projecto:** Gestão de Festas Infantis  
**Tagline:** *Organize, controle e torne cada festa inesquecível.*  
**Stack tecnológico:**
- **Frontend:** Next.js 15 (App Router) + React 19 + Tailwind CSS 4 + TanStack Query
- **Fullstack:** Next.js 15 (App Router) + TypeScript + Prisma ORM + Better Auth (API Routes, sem Express)
- **Database:** MySQL 8.x via Prisma
- **Validation:** Zod (both frontend and backend)
- **Auth:** Better Auth 1.3.x (email/password only)
- **Idioma:** Português de Portugal (PT-PT) — datas, moeda (€), textos e validações

**Descrição:** Plataforma de gestão para espaços de festas infantis. Permite gerir reservas, festas em curso, cacifos, menus/lanches, monitores, locais/salas, participantes, clientes, entradas livres, utilizadores e campanhas de marketing (newsletter e SMS). Os cacifos preservam histórico (JSON), as festas têm preço por criança (com mínimo por aniversariantes), e suporta meias + pagamento dividido.

---

## 2. Design System

### 2.1 Paleta de Cores

Definidas como CSS custom properties em `globals.css` usando Tailwind CSS 4 `@theme` directive.

| Token | Hex | Utilização |
|---|---|---|
| `--color-primary-400` | `#4F8EF7` | Acções principais, botões primários, nav activo |
| `--color-primary-50` | `#EEF4FF` | Backgrounds de cards e badges activos |
| `--color-secondary-400` | `#FF8C42` | Ícones de menus, destaques secundários |
| `--color-success-500` | `#3DC47E` | Estado "Em curso", badges de sucesso |
| `--color-warning-500` | `#FF9F43` | Avisos, estado "A começar" |
| `--color-purple-500` | `#9B59B6` | Cacifos pagos, estado final |
| `--color-error-500` | `#E74C3C` | Alertas, notificações, badge de erro |
| `--color-teal-500` | `#1ABC9C` | Festas, ícone de festas |
| `--color-dark-700` | `#1A1D2E` | Texto principal |
| `--color-dark-500` | `#6B7280` | Texto secundário, labels |
| `--color-dark-400` | `#9CA3AF` | Placeholders, metadados |
| `--color-background` | `#F5F7FF` | Background geral da app |
| `--color-surface` | `#FFFFFF` | Cards, painéis, modais |
| `--color-border` | `#E5E7EB` | Divisórias e bordas |

> **Nota para agentes:** Usar design tokens (`bg-primary-400`, `text-dark-700`, `bg-surface`, etc.) em vez de raw hex. As cores completas estão em `apps/web/src/app/globals.css`.

### 2.2 Tipografia

| Elemento | Fonte | Peso | Tamanho |
|---|---|---|---|
| Título principal (sidebar) | `Nunito` | 700 (Bold) | 22–24px |
| Subtítulo / Tagline | `Nunito` | 400 | 13px |
| Headings de secção | `Poppins` | 600 | 16–18px |
| Labels de navegação | `Inter` | 500 | 13–14px |
| Corpo de texto | `Inter` | 400 | 13–14px |
| Números/métricas grandes | `Poppins` | 700 | 28–36px |
| Badges e etiquetas | `Inter` | 600 | 11–12px |

> **Nota para agentes:** Fontes carregadas via `next/font` em `apps/web/src/app/layout.tsx`. Poppins para headings e métricas, Inter para corpo de texto.

### 2.3 Espaçamentos e Raios

```css
--radius-sm: 6px;     /* Badges, tags */
--radius-md: 10px;    /* Inputs, botões */
--radius-lg: 14px;    /* Cards */
--radius-xl: 20px;    /* Painéis, modais */

--spacing-sidebar-width: 220px;
--spacing-sidebar-collapsed: 64px;
```

### 2.4 Sombras

```css
--shadow-card: 0 2px 12px rgba(79, 142, 247, 0.08);
--shadow-modal: 0 8px 32px rgba(0, 0, 0, 0.12);
--shadow-button: 0 4px 14px rgba(79, 142, 247, 0.30);
```

---

## 3. Estrutura de Navegação — Sidebar

A sidebar é fixa à esquerda, com largura de ~220px. Contém logo, menu principal e configurações no fundo. Componentes em `apps/web/src/layout/`.

### 3.1 Menu Principal

| Ordem | Label (PT-PT) | Rota | Ícone (Lucide) |
|---|---|---|---|
| 1 | Dashboard | `/dashboard` | `LayoutDashboard` |
| 2 | Reservas | `/reservas` | `CalendarCheck` |
| 3 | Calendário | `/calendario` | `Calendar` |
| 4 | Festas | `/festas` | `PartyPopper` |
| 5 | Cacifos | `/cacifos` | `Package` |
| 6 | Menus | `/menus` | `UtensilsCrossed` |
| 7 | Clientes | `/clientes` | `Users` |
| 8 | Relatórios | `/relatorios` | `BarChart2` |
| 9 | Divulgações | `/divulgacoes` | `Megaphone` |

### 3.2 Secção Configurações (fundo da sidebar)

| Sub-item | Rota | Ícone (Lucide) |
|---|---|---|
| Utilizadores | `/configuracoes/utilizadores` | `Users` |
| Config. Preços | `/configuracoes/precos` | `Euro` |
| Exceções Calendário | `/configuracoes/excecoes-calendario` | `CalendarX` |
| Slots Horário | `/configuracoes/slots-horario` | `Clock` |
| Monitores | `/configuracoes/monitores` | `UserCog` |
| Locais | `/configuracoes/locais` | `MapPin` |
| Extras | `/configuracoes/extras` | `Sparkles` |
| Etapas de Festa | `/configuracoes/etapas-festa` | `ListChecks` |
| Config. Cacifos | `/configuracoes/cacifos` | `Box` |
| Newsletter | `/configuracoes/newsletter` | `Mail` |

### 3.3 Comportamento da Sidebar

- Item activo: background `primary-50`, texto e ícone em `primary-400`, barra lateral esquerda de 3px arredondada
- Hover: background suave `rgba(79,142,247,0.06)`
- Sidebar colapsável em mobile (hamburger menu no header)
- Secção "Configurações" é um accordion expansível
- Componentes: `AppSidebar` (`src/layout/AppSidebar.tsx`), `AppHeader` (`src/layout/AppHeader.tsx`), `Backdrop` (`src/layout/Backdrop.tsx`)

---

## 4. Módulos da Aplicação

### 4.1 Dashboard (`/dashboard`)

**Saudação personalizada:** "Boa tarde, [Nome]! 🎉"  
**Data actual** visível no canto superior direito.

**Cards de métricas (KPIs):**

| Métrica | Ícone | Cor |
|---|---|---|
| Festas de Hoje | `PartyPopper` | `primary-400` |
| A Começar (próx. 60 min) | `Play` | `warning-500` |
| A Terminar (próx. 60 min) | `Timer` | `error-500` |
| Cacifos Ocupados / Total | `Package` | `secondary-400` |
| Cacifos Pagos | `CheckCircle` | `purple-500` |

**Secções:**
- **Festas em Curso** — lista com hora, nome, sala, nº de crianças, estado colorido
- **Próximas Festas** — lista com hora, nome, sala, estado "A começar em X min"
- **Notas Rápidas** — campo de texto livre persistente por utilizador

---

### 4.2 Reservas (`/reservas`)

Formulário de criação/edição de reserva com os campos:

| Campo | Tipo | Notas |
|---|---|---|
| Cliente | `select/search` | Pesquisa de cliente existente ou criação |
| Aniversariante(s) | `multi-select` | Múltiplos aniversariantes por reserva |
| Data | `date` | Formato DD/MM/AAAA |
| Horário | `time` | HH:MM |
| Duração | `select` | Ex: 2h30m |
| Sala ou Espaço | `select` | Ver lista de Locais |
| Nº Crianças | `number` | Número estimado de participantes |
| Extras | `multi-select` | Extras disponíveis no local seleccionado |
| Monitores | `multi-select` | Monitores alocados à reserva |
| Método Pagamento | `select` | Dinheiro, Multibanco, MBWay, etc. |
| Caução | `select` | Paga / Não Paga / Paga no Dia |
| Notas | `textarea` | Alergias, preferências, etc. |
| Estado da Reserva | `stepper` | Reserva → Confirmado → Em curso → Concluída |

**Botão principal:** "Guardar Reserva" (azul primário, full-width no modal)

---

### 4.3 Festas (`/festas`)

Vista em tempo real das festas activas.  

**Sub-rota `/festas/a-decorrer`:** Festas actualmente em estado `EM_CURSO`.

**Card por festa activa** com:
- Nome da festa e sala
- Monitores alocados
- Badge de estado
- Timer em contagem crescente (tempo decorrido) e regressivo (tempo restante)
- Barra de progresso visual
- Estado das etapas (EtapaFesta)
- Lista de participantes com check-in

**Acções rápidas:**
- Check-in de participantes
- Finalizar Festa
- Histórico de etapas

---

### 4.4 Menus (`/menus`)

Gestão dos menus associados a cada reserva.

**Modelo simplificado:** `Menu` com `nome` + `preco` + `notasLanche` (1:1 com Reserva).

---

### 4.5b Lanche (`/lanche`)

Ecrã dedicado à equipa de lanche (função `LANCHE`). Mostra o que tem de ser preparado para cada festa e entrada livre do dia.

**KPIs do dia:** festas, entradas livres, total de crianças.

**Alergias:** alerta com festas que têm `notasLanche` preenchidas (alergias, restrições).

**Cards:** cada festa mostra nome, horário, sala, menu e notas editáveis via modal.

> Acesso: `LANCHE` (escrita notas) + `ADMINISTRADOR`.

---

### 4.6 Cacifos (`/cacifos`)

Gestão visual dos cacifos físicos do espaço.

**Estados possíveis:**
- `LIVRE` — verde
- `OCUPADO` — laranja/vermelho
- `RESERVADO` — azul

**Configuração:** definida em `/configuracoes/cacifos` via modelo `ConfiguracaoCacifo` com `totalCacifos`.

**Participantes:** cada participante pode ter um cacifo associado (check-in).

---

### 4.6 Clientes (`/clientes`)

Gestão de clientes com dados de contacto e aniversariantes associados.

---

### 4.7 Relatórios (`/relatorios`)

Indicadores e análises. Filtros por período, sala, tipo de festa.

---

### 4.8 Divulgações (`/divulgacoes`)

Gestão de campanhas de comunicação (Email e SMS) com segmentos de audiência.

---

### 4.9 Configurações (`/configuracoes`)

Sub-páginas de administração:

| Página | Rota | Modelo |
|---|---|---|
| Utilizadores | `/configuracoes/utilizadores` | `User` + RBAC (hardcoded em `permissoes.ts`) |
| Config. Preços | `/configuracoes/precos` | `ConfiguracaoPreco` (singleton) |
| Exceções Calendário | `/configuracoes/excecoes-calendario` | `ExcecaoCalendario` |
| Slots Horário | `/configuracoes/slots-horario` | `SlotHorario` |
| Monitores | `/configuracoes/monitores` | `Monitor` + `MonitorLocal` |
| Locais | `/configuracoes/locais` | `Local` |
| Extras | `/configuracoes/extras` | `Extra` + `ExtraLocal` |
| Etapas de Festa | `/configuracoes/etapas-festa` | `EtapaFesta` |
| Config. Cacifos | `/configuracoes/cacifos` | `ConfiguracaoCacifo` |
| Newsletter | `/configuracoes/newsletter` | `Campanha` + `Segmento` |

---

## 5. Componentes UI

### 5.1 Estrutura de Componentes (`apps/web/src/components/`)

```
components/
├── auth/                     # Formulários de autenticação
│   ├── SignInForm.tsx
│   ├── SignUpForm.tsx
│   ├── ResetPasswordForm.tsx
│   ├── ResetPasswordConfirmForm.tsx
│   └── OtpForm.tsx
├── cacifos/                  # CacifosContent.tsx
├── calendario/               # CalendarioContent.tsx
├── clientes/                 # ClientesContent.tsx
├── common/                   # Componentes partilhados
│   ├── ComponentCard.tsx
│   ├── CreateModal.tsx
│   ├── DeleteModal.tsx
│   ├── EditModal.tsx
│   ├── GridShape.tsx
│   ├── GuestPageContainer.tsx
│   └── PageBreadCrumb.tsx
├── configuracoes/            # Páginas de configuração
│   ├── ConfigCacifosContent.tsx
│   ├── EtapasFestaContent.tsx
│   ├── ExtrasContent.tsx
│   ├── LocaisContent.tsx
│   ├── MonitoresContent.tsx
│   ├── PermissoesContent.tsx
│   └── UtilizadoresContent.tsx
├── dashboard/                # DashboardContent.tsx
├── divulgacoes/              # DivulgacoesContent.tsx
├── festas/                   # Componentes de festas
│   ├── FestasContent.tsx
│   ├── FestasTabela.tsx
│   ├── FestaForm.tsx
│   ├── CheckInModal.tsx
│   └── HistoricoModal.tsx
├── form/                     # Componentes de formulário (USAR SEMPRE)
│   ├── Form.tsx
│   ├── Label.tsx
│   ├── Select.tsx
│   ├── MultiSelect.tsx
│   ├── date-picker.tsx
│   ├── input/
│   │   ├── InputField.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Radio.tsx
│   │   └── TextArea.tsx
│   └── switch/
│       └── Switch.tsx
├── menus/                    # MenusContent.tsx
├── relatorios/               # RelatoriosContent.tsx
└── ui/                       # Componentes base de UI
    ├── BaseModal.tsx
    ├── Badge.tsx
    ├── Button.tsx
    ├── Card.tsx
    ├── CountdownTimer.tsx
    ├── DataTable.tsx
    ├── FilterDropdown.tsx
    ├── KPICard.tsx
    ├── LoadingSpinner.tsx
    ├── LoadingState.tsx
    ├── PageHeader.tsx
    ├── QuantityStepper.tsx
    ├── StatusBadge.tsx
    ├── StatusStepper.tsx
    ├── Toggle.tsx
    └── ... (mais componentes em subpastas)
```

### 5.2 Layout Components (`apps/web/src/layout/`)

| Componente | Ficheiro | Responsabilidade |
|---|---|---|
| `AppSidebar` | `AppSidebar.tsx` | Sidebar fixa com navegação |
| `AppHeader` | `AppHeader.tsx` | Barra superior com info do utilizador |
| `Backdrop` | `Backdrop.tsx` | Overlay mobile para sidebar |

---

## 6. Estrutura de Pastas do Projecto (Monorepo)

```
festas/
├── apps/
│   ├── web/                        # Next.js 15 (Frontend)
│   │   ├── src/
│   │   │   ├── app/                # App Router pages
│   │   │   │   ├── (guest)/        # Páginas públicas (auth)
│   │   │   │   ├── (protected)/    # Páginas autenticadas
│   │   │   │   └── [...not-found]/
│   │   │   ├── components/         # Componentes React
│   │   │   ├── hooks/              # TanStack Query hooks
│   │   │   ├── layout/             # AppSidebar, AppHeader, Backdrop
│   │   │   ├── lib/                # API clients, utils, auth
│   │   │   ├── providers/          # Context providers
│   │   │   └── locales/            # i18n PT-PT translations
│   │   └── package.json
│   └── server/                     # Express 5 (Backend API)
│       ├── src/
│       │   ├── routes/             # URL mapping + middleware
│       │   ├── controllers/        # Extract params, call service
│       │   ├── services/           # Business logic, DB queries
│       │   ├── middlewares/        # Auth, roles, rate limiter
│       │   ├── i18n/               # Backend translations (PT-PT)
│       │   ├── docs/               # Swagger/OpenAPI
│       │   ├── utils/              # Error handler, validation
│       │   └── types/              # TypeScript types
│       ├── __tests__/              # Vitest test files
│       └── package.json
├── packages/
│   ├── auth/                       # Better Auth (@festas/auth)
│   │   └── src/
│   │       ├── index.ts            # Auth configuration
│   │       ├── types.ts            # User type exports
│   │       └── email.ts            # Email templates
│   ├── db/                         # Prisma (@festas/db)
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Database schema
│   │   │   └── seed-dev.ts         # Dev seed script
│   │   ├── scripts/
│   │   │   ├── db.js               # DB operations (clean, reset, push, etc.)
│   │   │   └── fix-enum.sql        # Stale enum cleanup SQL
│   │   └── src/index.ts            # PrismaClient export
│   └── shared/
│       ├── shared-types/           # @saas/shared-types
│       │   └── src/types/          # TypeScript interfaces
│       └── shared-defaults/        # @saas/shared-defaults
│           └── src/defaults/       # Default configurations
├── skills/                         # AI agent skill files
├── AGENTS.md                       # Agent context
├── PROJECTO.md                     # This file
└── PAGINAS.md                      # Page descriptions
```

---

## 7. Tipos TypeScript Principais

Definidos em `packages/shared/shared-types/src/types/`:

```typescript
// types/utilizador.ts
export type FuncaoUtilizador = 'ADMINISTRADOR' | 'LANCHE' | 'CACIFOS' | 'MONITOR' | 'FESTAS_ACABAR';

export interface Utilizador {
  id: string;
  name: string;
  email: string;
  funcao: FuncaoUtilizador;
  activo: boolean;
  image?: string;
}

// types/reserva.ts — UNIFIED with Festa (no separate Festa model)
export type EstadoReserva = 'RESERVA' | 'CONFIRMADO' | 'EM_CURSO' | 'CONCLUIDA' | 'CANCELADA';
export type MetodoPagamento = 'DINHEIRO' | 'MULTIBANCO' | 'MBWAY' | 'TRANSFERENCIA' | 'CARTAO' | 'OUTRO';
export type EstadoCaucao = 'PAGA' | 'NAO_PAGA' | 'PAGA_NO_DIA';

export interface Reserva {
  id: string;
  data: string;
  horario: string;
  duracaoMinutos: number;
  numCriancas: number;
  notas?: string;
  estado: EstadoReserva;
  // Runtime fields (when EM_CURSO)
  inicioEm?: string;
  fimPrevisto?: string;
  fimReal?: string;
  // Pagamento
  metodoPagamento?: MetodoPagamento;
  valorPago?: number;
  pago: boolean;
  caucao: EstadoCaucao;
  valorCaucao?: number;
  // Relations
  clienteId: string;
  localId: string;
  extras?: ReservaExtra[];
  monitores?: ReservaMonitor[];
  etapas?: ReservaEtapa[];
  participantes?: Participante[];
  aniversariantes?: ReservaAniversariante[];
}

// types/cacifo.ts
export type EstadoCacifo = 'LIVRE' | 'OCUPADO' | 'RESERVADO';

export interface Cacifo {
  id: string;
  numero: number;
  nome?: string;
  estado: EstadoCacifo;
  reservaId?: string;
  participante?: Participante;
}

// types/menu.ts — Simplified (no ItemMenu)
export type CategoriaItem = 'MENU' | 'EXTRA';

export interface Menu {
  id: string;
  nome: string;
  preco: number;
  reservaId: string;
}

// types/participante.ts
export interface Participante {
  id: string;
  nome: string;
  presente: boolean;
  cacifoId?: string;
  reservaId: string;
}

// types/etapaFesta.ts
export interface EtapaFesta {
  id: string;
  nome: string;
  descricao?: string;
  ordem: number;
  icone?: string;
  activo: boolean;
}

// types/campanha.ts
export type TipoCampanha = 'EMAIL' | 'SMS';
export type EstadoCampanha = 'RASCUNHO' | 'AGENDADA' | 'ENVIADA' | 'CANCELADA';
```

---

## 8. Localização (PT-PT)

- **Datas:** formato `DD/MM/AAAA` — usar `date-fns/locale/pt`
- **Horas:** formato `HH:MM` (24h)
- **Moeda:** `€` com vírgula decimal — usar `Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })`
- **Textos de UI:** sempre em PT-PT (não PT-BR)
  - "Utilizadores" (não "Usuários")
  - "Palavra-passe" (não "Senha")
  - "Confirmar" / "Guardar" / "Cancelar"
  - "Em curso" (não "Em andamento")
  - "Aniversariante" — criança que faz anos
  - "Cacifo" — espaço individual para pertences
  - "Configuração" (não "Configurações" para itens singulares)
  - "Registar" (não "Registrar")

---

## 9. Estados de UI Importantes

| Estado | Cor badge | Exemplo |
|---|---|---|
| Reserva | Cinzento azulado | Estado inicial |
| Confirmado | Azul `primary-400` | Reserva confirmada |
| Em curso | Verde `success-500` | Festa a decorrer |
| A começar | Laranja `warning-500` | Início em breve |
| Concluída | Roxo `purple-500` | Festa terminada |
| Cancelada | Vermelho `error-500` | Reserva cancelada |
| Insuficiente | Vermelho `error-500` | Ex: monitores insuficientes |
| Activo | Verde `success-500` | Monitor/local activo |
| Inactivo | Cinzento `dark-400` | Desactivado |

---

## 10. Instruções para Agentes de IA

Ao trabalhar neste projecto, respeita sempre:

1. **Idioma:** Todo o código de UI usa PT-PT. Nunca usar inglês em labels visíveis ao utilizador.
2. **Componentes:** Reutilizar os componentes de `/components/ui/` e `/components/form/` antes de criar novos.
3. **Cores:** Usar sempre os tokens CSS definidos em `globals.css`. Não usar cores em raw hex no código dos componentes.
4. **Ícones:** Usar exclusivamente a biblioteca `lucide-react`.
5. **Formulários:** Usar `react-hook-form` + `zod` para validação. Mensagens de erro em PT-PT. Usar sempre `@/components/form/`.
6. **Datas:** Usar `date-fns` com locale `pt` para formatação.
7. **Moeda:** Formatar sempre com `Intl.NumberFormat('pt-PT')`.
8. **Acessibilidade:** Todos os botões e inputs com `aria-label` em PT-PT.
9. **Mobile-first:** A sidebar colapsa em mobile. Usar Tailwind breakpoints `md:` e `lg:`.
10. **Estado global:** TanStack Query para server state. React Context para auth/UI state.
11. **Backend:** Seguir sempre o padrão Route → Controller → Service.
12. **Database:** `Reserva` é unificado com `Festa` — nunca criar modelo separado.

---

*Documento actualizado para reflectir o estado actual do projecto. Actualizar sempre que houver alterações ao design system ou à estrutura de navegação.*
