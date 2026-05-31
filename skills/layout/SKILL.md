# SKILL — Layout e Estrutura de Páginas

Padrão obrigatório ao criar qualquer nova página ou secção.

## Estrutura global da app

```
RootLayout (app/layout.tsx)
├── (guest)/               # Login, registo, recuperar palavra-passe
│   └── layout.tsx          # GuestPageContainer
├── (protected)/            # Área autenticada
│   └── layout.tsx          # AppLayout (sidebar + header)
│       ├── AppSidebar      (fixo à esquerda, 220px)
│       ├── Main
│       │   ├── AppHeader   (fixo no topo, com foto de perfil)
│       │   └── PageContent (scroll vertical)
│       │       └── [conteúdo da página]
│       └── Backdrop        (overlay mobile)
```

## Layout protegido

```tsx
// app/(protected)/layout.tsx
export default async function ProtectedLayout({ children }) {
  const session = await requireAuth()
  if (!session?.user) redirect("/entrar")

  return (
    <ProtectedProviders>
      <div className="flex min-h-screen">
        <AppSidebar user={session.user} />
        <div className="flex-1 flex flex-col lg:ml-[220px] transition-all duration-300">
          <AppHeader user={session.user} />
          <main className="flex-1 p-4 md:p-6 bg-background">
            {children}
          </main>
          <Backdrop />
        </div>
      </div>
    </ProtectedProviders>
  )
}
```

## AppHeader

Componente em `@/layout/AppHeader.tsx`. Mostra:
- Logo / nome da app à esquerda
- Foto de perfil do utilizador (ou inicial) à direita
- Botão de sair

## AppSidebar

Componente em `@/layout/AppSidebar.tsx`. Navegação fixa à esquerda.

### Menu Principal

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

### Secção Configurações (fundo da sidebar)

| Sub-item | Rota | Ícone (Lucide) |
|---|---|---|
| Utilizadores | `/configuracoes/utilizadores` | `Users` |
| Permissões | `/configuracoes/permissoes` | `ShieldCheck` |
| Monitores | `/configuracoes/monitores` | `UserCog` |
| Locais | `/configuracoes/locais` | `MapPin` |
| Extras | `/configuracoes/extras` | `Sparkles` |
| Etapas de Festa | `/configuracoes/etapas-festa` | `ListChecks` |
| Config. Cacifos | `/configuracoes/cacifos` | `Box` |
| Newsletter | `/configuracoes/newsletter` | `Mail` |

### Comportamento da Sidebar

- Item activo: background do token `--color-sidebar-active-bg`, texto em `--color-sidebar-active`, barra lateral esquerda de 3px
- Hover: background suave
- Sidebar colapsável em mobile (hamburger menu no header)
- Secção "Configurações" é um accordion expansível
- O item activo é determinado pelo `pathname` via `usePathname()` do Next.js

## Estrutura interna de uma página

```tsx
// Exemplo: app/(protected)/reservas/page.tsx
export default function ReservasPage() {
  return (
    <>
      {/* 1. PageHeader com título e acções */}
      <PageHeader
        title="Reservas"
        description="Gestão de reservas de festas"
      >
        <Button variant="primary" onClick={abrirFormulario}>
          <Plus size={16} /> Nova reserva
        </Button>
      </PageHeader>

      {/* 2. Filtros + tabela ou listagem principal */}
      <Card className="mt-4">
        <DataTable ... />
      </Card>

      {/* 3. Modal de criação/edição (fora do card) */}
      <ModalReserva aberto={modalAberto} onFechar={() => setModalAberto(false)} />
    </>
  )
}
```

## Grelhas de KPIs

| Nº de KPIs | Classe de grelha |
|---|---|
| 3 | `grid grid-cols-1 md:grid-cols-3 gap-4` |
| 4 | `grid grid-cols-2 md:grid-cols-4 gap-4` |
| 5 | `grid grid-cols-2 md:grid-cols-5 gap-4` |

## Card

Usar sempre o componente `<Card>` de `@/components/ui/card/` como contentor de secções.

```tsx
import { Card } from '@/components/ui/card'

<Card>
  <CardHeader titulo="Festas em curso" />
  <CardBody>
    {/* conteúdo */}
  </CardBody>
</Card>
```

Nunca usar `div` com classes de sombra e border directamente — usar `<Card>`.

## Modais

Todos os formulários de criação e edição abrem em modal, não em página separada.
Usar `<BaseModal>` de `@/components/ui/BaseModal.tsx` ou `<CreateModal>` / `<EditModal>` de `@/components/common/`.

```tsx
<BaseModal
  isOpen={aberto}
  onClose={fechar}
  title="Nova Reserva"
>
  <ReservaForm onSucesso={fechar} />
</BaseModal>
```

O modal fecha ao clicar no overlay ou premir Escape — excepto se o formulário estiver "dirty"
(consultar skill `form/SKILL.md` para o comportamento de confirmação).

## Responsividade

| Breakpoint | Comportamento |
|---|---|
| `< 768px` (mobile) | Sidebar oculta, acessível via hamburger |
| `768px–1024px` (tablet) | Sidebar colapsada (só ícones, 64px) |
| `> 1024px` (desktop) | Sidebar expandida (220px) com labels |

Usar sempre classes Tailwind com prefixo `md:` e `lg:` — nunca media queries em CSS manual.

## Notificações e Toasts

Usar o sistema de toast global via `useToast` de `@/hooks/use-toast`.

```tsx
const toast = useToast()

toast.success('Reserva guardada com sucesso.')
toast.error('Ocorreu um erro ao guardar. Tenta novamente.')
```

Nunca usar `alert()` ou `confirm()` nativos do browser. Usar `<ConfirmActionModal>` ou `<ConfirmDialog>` para confirmações.

## Metadata de página

Cada página tem um ficheiro `metadata.ts` na sua pasta que define título e descrição:

```tsx
// app/(protected)/reservas/metadata.ts
import { createPageMetadata } from '@/lib/metadata'

export const metadata = createPageMetadata('reservas')
```

### Páginas com metadata

| Página | Path |
|---|---|
| Dashboard | `dashboard/metadata.ts` |
| Reservas | `reservas/metadata.ts` |
| Calendário | `calendario/metadata.ts` |
| Festas | `festas/metadata.ts` |
| Festas a decorrer | `festas/a-decorrer/metadata.ts` |
| Cacifos | `cacifos/metadata.ts` |
| Menus | `menus/metadata.ts` |
| Relatórios | `relatorios/metadata.ts` |
| Divulgações | `divulgacoes/metadata.ts` |
| Utilizadores | `configuracoes/utilizadores/metadata.ts` |
| Permissões | `configuracoes/permissoes/metadata.ts` |
| Monitores | `configuracoes/monitores/metadata.ts` |
| Locais | `configuracoes/locais/metadata.ts` |
| Extras | `configuracoes/extras/metadata.ts` |
| Etapas de Festa | `configuracoes/etapas-festa/metadata.ts` |
| Newsletter | `configuracoes/newsletter/metadata.ts` |
