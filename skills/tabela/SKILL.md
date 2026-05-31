# SKILL — Tabelas com Filtros e Paginação

Padrão para todas as listagens da aplicação: reservas, monitores, utilizadores, locais, extras, etapas de festa, campanhas, clientes.

## Componente base

Usar sempre `<DataTable>` de `@/components/ui/table/DataTable` — nunca `<table>` directamente nas páginas.

```tsx
import { DataTable } from '@/components/ui/table/DataTable'

<DataTable
  data={reservas}
  columns={colunasReservas}
  searchableFields={['cliente.nome', 'aniversariantes.aniversariante.nome']}
  itemLabel="reserva"
  renderActions={(row) => (
    // botões de acção por linha
  )}
  isLoading={isLoading}
  emptyMessage="Não existem reservas para os filtros seleccionados."
/>
```

## Funcionalidades do DataTable

| Funcionalidade | Descrição |
|---|---|
| Paginação | Suporte a paginação do lado do servidor |
| Pesquisa | Campos pesquisáveis com suporte a campos aninhados (dot notation) |
| Filtros | Dropdowns de filtro por estado, local, etc. |
| Ordenação | Colunas ordenáveis (sempre no servidor) |
| Acções | Botões por linha (editar, eliminar, ver) via `renderActions` |
| `itemLabel` | Label singular para "Mostrar X itens" (ex: "reserva", "monitor") |
| `searchableFields` | Array de campos pesquisáveis, suporta `aninhado.campo` |
| Estado de carregamento | Skeleton rows durante loading |
| Estado sem resultados | Mensagem centrada quando não há dados |

## Definição de colunas

```tsx
const colunasReservas = [
  {
    key: 'aniversariante',
    label: 'Aniversariante(s)',
    render: (row: Reserva) => (
      <div>
        <p className="font-medium">{row.aniversariantes?.map(ra => ra.aniversariante?.nome).join(', ')}</p>
        <p className="text-xs text-muted">{row.numCriancas} crianças</p>
      </div>
    ),
  },
  {
    key: 'data',
    label: 'Data / Hora',
    sortable: true,
    render: (row: Reserva) => (
      <div>
        <p>{formatarData(row.data)}</p>
        <p className="text-xs text-muted">{row.horario} · {row.duracaoMinutos} min</p>
      </div>
    ),
  },
  {
    key: 'local',
    label: 'Sala',
    render: (row: Reserva) => row.local?.nome,
  },
  {
    key: 'estado',
    label: 'Estado',
    render: (row: Reserva) => <Badge tipo="reserva" estado={row.estado} />,
  },
]
```

## Filtros

Os filtros ficam sempre acima da tabela, numa linha horizontal.
Usar componentes `FilterDropdown` ou `FilterDropdownWithPortal` de `@/components/ui/`.

```tsx
import { FilterDropdown } from '@/components/ui/FilterDropdown'

// Exemplo de filtro por estado
<FilterDropdown
  label="Estado"
  options={[
    { value: '', label: 'Todos' },
    { value: 'RESERVA', label: 'Reserva' },
    { value: 'CONFIRMADO', label: 'Confirmado' },
    { value: 'EM_CURSO', label: 'Em curso' },
    { value: 'CONCLUIDA', label: 'Concluída' },
  ]}
  value={filtroEstado}
  onChange={setFiltroEstado}
/>
```

## Paginação

Paginação do lado do servidor. Parâmetros enviados na query string:

```
GET /api/reservas?pagina=1&porPagina=20&ordenarPor=data&ordem=desc&estado=CONFIRMADO
```

Componente de paginação no fundo da tabela:

```tsx
import { TablePagination } from '@/components/ui/pagination/TablePagination'

<TablePagination
  paginaActual={pagina}
  totalPaginas={Math.ceil(total / porPagina)}
  onChange={setPagina}
/>
// Mostra: "Mostrando 1–20 de 48 resultados"
```

Configuração de paginação em `@/lib/pagination-config.ts`.

## Acções por linha

```tsx
<DataTable
  // ...
  renderActions={(row) => (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={() => abrirFormulario(row)}>
        <IconEdit size={16} />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => verDetalhe(row)}>
        <IconEye size={16} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={row.estado === 'EM_CURSO'}
        onClick={() => confirmarEliminar(row)}
      >
        <IconTrash size={16} />
      </Button>
    </div>
  )}
/>
```

## Estado de carregamento

A tabela mostra skeleton rows durante o carregamento.
Nunca mostrar spinner centrado na página — usar skeleton nas próprias linhas.

## Estado sem resultados

O DataTable mostra mensagem centrada quando não há dados:

```tsx
// O próprio DataTable trata disto via prop emptyMessage
<DataTable
  emptyMessage="Não existem reservas para os filtros seleccionados."
  // ...
/>
```

## Ordenação

Colunas com `sortable: true` mostram ícone de seta ao hover.
A ordenação é sempre feita no servidor — não ordenar arrays no cliente.
Estado da ordenação fica na URL: `?ordenarPor=data&ordem=desc`.

## Páginas que usam DataTable

| Página | Route | itemLabel |
|---|---|---|
| Reservas | `/reservas` | "reserva" |
| Clientes | `/clientes` | "cliente" |
| Utilizadores | `/configuracoes/utilizadores` | "utilizador" |
| Monitores | `/configuracoes/monitores` | "monitor" |
| Locais | `/configuracoes/locais` | "local" |
| Extras | `/configuracoes/extras` | "extra" |
| Etapas de Festa | `/configuracoes/etapas-festa` | "etapa" |
| Divulgações (Campanhas) | `/divulgacoes` | "campanha" |

> **Nota:** Festas (`/festas`) usa card layout (grelha), não tabela. Cacifos (`/cacifos`) usa grelha visual.
