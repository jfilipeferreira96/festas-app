# SKILL - Estados e Badges

Padrão para representar estados de reservas, cacifos, monitores e campanhas.
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

> **Nota:** O estado da festa é o `EstadoReserva` da reserva. Não existe enum `EstadoFesta` separado. Quando uma reserva está em `EM_CURSO`, os campos de runtime (`inicioEm`, `fimPrevisto`) são preenchidos.

> **Nota:** O estado `A começar` é calculado na UI (baseado no tempo até ao início), não é um valor do enum.

## Estados de Cacifo

```ts
// Valores do enum no Prisma: EstadoCacifo
type EstadoCacifo = 'LIVRE' | 'OCUPADO' | 'RESERVADO'
```

| Estado (Prisma) | Label PT-PT | Variante badge |
|---|---|---|
| `LIVRE` | Livre | `green` |
| `OCUPADO` | Ocupado | `red` |
| `RESERVADO` | Reservado | `blue` |

> **Nota:** `EstadoCacifo` tem 3 valores. Não existe `PAGO` - o estado de pagamento da caução é gerido pelo enum `EstadoCaucao` na reserva.

## Estado de Caução

```ts
// Valores do enum no Prisma: EstadoCaucao
type EstadoCaucao = 'PAGA' | 'NAO_PAGA' | 'PAGA_NO_DIA'
```

| Estado (Prisma) | Label PT-PT | Variante badge |
|---|---|---|
| `PAGA` | Paga | `green` |
| `NAO_PAGA` | Não paga | `red` |
| `PAGA_NO_DIA` | Paga no dia | `orange` |

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

Usar sempre o componente `<Badge>` - nunca estilos inline para estados.

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
- O estado só avança - nunca recua automaticamente
- Fluxo: `RESERVA` → `CONFIRMADO` → `EM_CURSO` → `CONCLUIDA`
- `CANCELADA` pode ser definido a partir de qualquer estado (excepto `CONCLUIDA`)
- Excepção: Administrador pode corrigir estado com confirmação explícita
- Transição para `EM_CURSO` só é possível se a data/hora da festa já chegou
- Transição para `EM_CURSO` preenche `inicioEm` e calcula `fimPrevisto` na reserva
- Transição para `CONCLUIDA` regista `fimReal` na reserva

## Aviso de monitores insuficientes

Mostrar badge `insuficiente` quando o número de crianças da reserva excede
o rácio mínimo configurado para a sala (ex: 1 monitor por 10 crianças).
