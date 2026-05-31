# SKILL — Estados e Badges

Padrão para representar estados de reservas, festas, cacifos, monitores e campanhas.
Nunca criar cores ou labels de estado fora deste ficheiro.

> **Importante:** Os valores dos enums são `UPPER_SNAKE_CASE` (definidos no schema Prisma). As labels PT-PT são para apresentação na UI.

## Estados de Reserva

```ts
// Valores do enum no Prisma: EstadoReserva
type EstadoReserva = 'RESERVA' | 'CONFIRMADO' | 'EM_CURSO' | 'CONCLUIDA' | 'CANCELADA'
```

| Estado (Prisma) | Label PT-PT | Variante badge |
|---|---|---|
| `RESERVA` | Reserva | `gray` |
| `CONFIRMADO` | Confirmado | `blue` |
| `EM_CURSO` | Em curso | `green` |
| `CONCLUIDA` | Concluída | `purple` |
| `CANCELADA` | Cancelada | `red` |

## Estados de Festa

```ts
// Valores do enum no Prisma: EstadoFesta
type EstadoFesta = 'EM_CURSO' | 'CONCLUIDA'
```

| Estado (Prisma) | Label PT-PT | Variante badge |
|---|---|---|
| `EM_CURSO` | Em curso | `green` |
| `CONCLUIDA` | Concluída | `gray` |

> **Nota:** O estado `A começar` é calculado na UI (baseado no tempo até ao início), não é um valor do enum.

## Estados de Cacifo

```ts
// Valores do enum no Prisma: EstadoCacifo
type EstadoCacifo = 'LIVRE' | 'OCUPADO' | 'RESERVADO' | 'PAGO'
```

| Estado (Prisma) | Label PT-PT | Variante badge |
|---|---|---|
| `LIVRE` | Livre | `green` |
| `OCUPADO` | Ocupado | `red` |
| `RESERVADO` | Reservado | `blue` |
| `PAGO` | Pago | `orange` |

## Estados de Campanha

```ts
// Valores do enum no Prisma: EstadoCampanha
type EstadoCampanha = 'RASCUNHO' | 'AGENDADA' | 'ENVIADA' | 'CANCELADA'
```

| Estado (Prisma) | Label PT-PT | Variante badge |
|---|---|---|
| `RASCUNHO` | Rascunho | `gray` |
| `AGENDADA` | Agendada | `blue` |
| `ENVIADA` | Enviada | `green` |
| `CANCELADA` | Cancelada | `red` |

## Estados de Monitor / Local

| Estado | Label | Variante |
|---|---|---|
| `activo` | Activo | `green` |
| `inactivo` | Inactivo | `gray` |
| `insuficiente` | Insuficiente | `red` |

> **Nota:** `activo`/`inactivo` são booleans no modelo, não enums. O estado `insuficiente` é calculado na UI (rácio monitores/crianças).

## Componente Badge

Usar sempre o componente `<Badge>` — nunca estilos inline para estados.

```tsx
import { Badge } from '@/components/ui/badge/Badge'

<Badge tipo="reserva" estado="CONFIRMADO" />
<Badge tipo="cacifo" estado="LIVRE" />
<Badge tipo="monitor" estado="insuficiente" />
```

## Implementação interna do Badge

O componente Badge deve mapear os valores UPPER_CASE do Prisma para labels PT-PT:

```tsx
// components/ui/badge/Badge.tsx
const CONFIG = {
  reserva: {
    RESERVA:    { label: 'Reserva',    variant: 'gray'   },
    CONFIRMADO: { label: 'Confirmado', variant: 'blue'   },
    EM_CURSO:   { label: 'Em curso',   variant: 'green'  },
    CONCLUIDA:  { label: 'Concluída',  variant: 'purple' },
    CANCELADA:  { label: 'Cancelada',  variant: 'red'    },
  },
  cacifo: {
    LIVRE:     { label: 'Livre',     variant: 'green'  },
    OCUPADO:   { label: 'Ocupado',   variant: 'red'    },
    RESERVADO: { label: 'Reservado', variant: 'blue'   },
    PAGO:      { label: 'Pago',      variant: 'orange' },
  },
  campanha: {
    RASCUNHO:  { label: 'Rascunho', variant: 'gray'  },
    AGENDADA:  { label: 'Agendada', variant: 'blue'  },
    ENVIADA:   { label: 'Enviada',  variant: 'green' },
    CANCELADA: { label: 'Cancelada', variant: 'red'  },
  },
}
```

## Stepper de estado da reserva

```tsx
<StatusStepper
  estadoActual="CONFIRMADO"
  onChange={(novoEstado) => actualizarReserva(novoEstado)}
  readOnly={false}
/>
```

**Regras do stepper:**
- O estado só avança — nunca recua automaticamente
- Fluxo: `RESERVA` → `CONFIRMADO` → `EM_CURSO` → `CONCLUIDA`
- `CANCELADA` pode ser definido a partir de qualquer estado (excepto `CONCLUIDA`)
- Excepção: Administradora pode corrigir estado com confirmação explícita
- Transição para `EM_CURSO` só é possível se a data/hora da festa já chegou
- Transição para `CONCLUIDA` regista `fimReal` no registo da festa

## Aviso de monitores insuficientes

Mostrar badge `insuficiente` quando o número de crianças da reserva excede
o rácio mínimo configurado para a sala (ex: 1 monitor por 10 crianças).
