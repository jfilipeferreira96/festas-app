# Skills — Gestão de Festas Infantis

Pasta de skills reutilizáveis para o agente de desenvolvimento.
Antes de criar qualquer componente, página ou função, consulta as skills relevantes.

## Quando usar cada skill

| Situação | Skill a consultar |
|---|---|
| Criar ou editar um formulário | `form/SKILL.md` |
| Mostrar estado de reserva, cacifo, campanha | `estado/SKILL.md` |
| Qualquer coisa que actualiza em tempo real | `realtime/SKILL.md` |
| Tabelas com filtros, paginação ou ordenação | `tabela/SKILL.md` |
| Criar uma nova página ou layout | `layout/SKILL.md` |
| Criar queries, relações ou modelos na DB | `db/SKILL.md` |
| Datas, horas, moeda, textos de UI | `ptpt/SKILL.md` |

## Resumo rápido por skill

### `form/SKILL.md`
- React Hook Form + Zod
- Componentes disponíveis: InputField, Select, MultiSelect, Switch, DatePicker, TextArea, Checkbox
- Validações PT-PT obrigatórias
- Nunca mensagens de erro em inglês

### `estado/SKILL.md`
- Enums UPPER_SNAKE_CASE do Prisma: `RESERVA`, `CONFIRMADO`, `EM_CURSO`, `CONCLUIDA`, `CANCELADA`
- Labels PT-PT para cada estado
- Componente Badge para apresentação
- Stepper de estado da reserva
- Nota: Não existe `EstadoFesta` separado — usa `EstadoReserva`

### `realtime/SKILL.md`
- Timer de festa com `useTimer`
- Polling com `refetchInterval` do TanStack Query
- CountdownTimer para UI
- Fluxo de finalizar festa (via PATCH `/api/reservas/:id`)

### `tabela/SKILL.md`
- DataTable genérico com paginação, filtros, pesquisa, ordenação
- `searchableFields` com dot notation
- `itemLabel` para labels de contagem
- 8 páginas usam DataTable

### `layout/SKILL.md`
- Layout protegido: AppSidebar + AppHeader + Backdrop
- Sidebar com menu principal + configurações
- 16 páginas com metadata
- Modais com BaseModal / CreateModal / EditModal

### `db/SKILL.md`
- Enums: EstadoReserva, EstadoCacifo (3 valores), MetodoPagamento, EstadoCaucao, CategoriaItem (MENU/EXTRA), TipoCampanha, EstadoCampanha
- Reserva unificada com Festa — não existe modelo Festa separado
- Menu simplificado (nome + preco) — ItemMenu foi removido
- Convenções: camelCase no Prisma, @@map para snake_case no DB
- Testes com schema `test` isolado, mock `@festas/db`

### `ptpt/SKILL.md`
- date-fns com locale `pt`
- Intl.NumberFormat('pt-PT') para moeda
- Vocabulário PT-PT obrigatório
- Timezone Europe/Lisbon

## Regra geral

Nunca criar um componente de raiz sem verificar se já existe um padrão definido nas skills.
Se o padrão não existir, criá-lo aqui depois de implementado para reutilização futura.
