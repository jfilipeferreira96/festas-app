# SKILL — Localização PT-PT

Padrão obrigatório para datas, horas, moeda, números e textos de UI.
Nunca usar formatos en-US ou PT-BR nesta aplicação.

## Datas

```ts
import { format, formatDistance } from 'date-fns'
import { pt } from 'date-fns/locale'

// Data completa
format(data, "d 'de' MMMM 'de' yyyy", { locale: pt })
// → "16 de maio de 2025"

// Data curta (tabelas, inputs)
format(data, 'dd/MM/yyyy', { locale: pt })
// → "16/05/2025"

// Hora
format(data, 'HH:mm', { locale: pt })
// → "15:30"

// Data + hora
format(data, "dd/MM/yyyy 'às' HH:mm", { locale: pt })
// → "16/05/2025 às 15:30"

// Tempo relativo
formatDistance(data, new Date(), { locale: pt, addSuffix: true })
// → "há 3 minutos" / "em 20 minutos"
```

## Moeda

```ts
// Valores monetários são guardados como Decimal(10,2) no Prisma (em euros)
// Usar Intl.NumberFormat para formatação

const formatarEuro = (valor: number) =>
  new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(valor)

formatarEuro(85)    // → "85,00 €"
formatarEuro(3.5)   // → "3,50 €"
formatarEuro(1200)  // → "1 200,00 €"
```

> **Nota:** O schema Prisma usa `Decimal @db.Decimal(10, 2)` para preços. O Prisma retorna estes valores como `Prisma.Decimal`, que deve ser convertido para `number` antes de formatar.

## Números

```ts
const formatarNumero = (n: number) =>
  new Intl.NumberFormat('pt-PT').format(n)

formatarNumero(1240)   // → "1 240"
formatarNumero(48.5)   // → "48,5"
```

## Telefone

Formato de apresentação: `XXX XXX XXX`

```ts
const formatarTelefone = (tel: string) =>
  tel.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')

formatarTelefone('912345678')  // → "912 345 678"
```

## Vocabulário obrigatório (PT-PT vs PT-BR)

| ✅ PT-PT | ❌ PT-BR / Inglês |
|---|---|
| Utilizador | Usuário |
| Palavra-passe | Senha / Password |
| Guardar | Salvar |
| Eliminar | Deletar |
| Anular | Cancelar (em contexto de acção) |
| Cancelar | Cancel |
| Em curso | Em andamento |
| Encarregado | Responsável (aceitável também) |
| Activo / Inactivo | Ativo / Inativo |
| Seleccionar | Selecionar (ambos aceites, manter consistência) |
| Contacto | Contato |
| Ficheiro | Arquivo |
| Pesquisar | Buscar |
| A carregar... | Carregando... / Loading... |
| Cacifo | Armário |
| Monitor | Monitor (igual) |
| Duração | Duração (igual) |
| Caução | Caução (igual) |
| Registar | Registrar |
| Configuração | Configuração (igual) |

## Mensagens de UI — padrões

### Confirmações de acção destrutiva
> "Tens a certeza que queres eliminar esta reserva? Esta acção não pode ser revertida."

### Sucesso
> "Reserva guardada com sucesso."
> "Festa concluída com sucesso."
> "Utilizador criado. O convite foi enviado para [email]."

### Erro genérico
> "Ocorreu um erro inesperado. Tenta novamente."

### Erro de validação de formulário
> "Corrige os erros assinalados antes de continuar."

### Sem resultados
> "Não existem [entidade] para os filtros seleccionados."
> Botão: "Limpar filtros"

### Carregamento
> "A carregar..." (nunca "Loading...")

### Estado vazio (primeira utilização)
> "Ainda não tens reservas. Cria a primeira agora."

## Dias da semana e meses

O `date-fns` com locale `pt` trata disto automaticamente.
Nunca hardcodar nomes de dias ou meses em português.

```ts
// Correcto — deixar o date-fns tratar
format(data, 'EEEE', { locale: pt })  // → "segunda-feira"
format(data, 'MMMM', { locale: pt })  // → "maio"

// Errado
const DIAS = ['Domingo', 'Segunda', ...]  // não fazer isto
```

## Timezone

Todas as datas são guardadas em UTC na base de dados.
A conversão para o fuso horário de Portugal (Europe/Lisbon) é feita na camada de apresentação.

```ts
import { toZonedTime } from 'date-fns-tz'

const TIMEZONE = 'Europe/Lisbon'

const dataLocal = toZonedTime(dataUtc, TIMEZONE)
const dataFormatada = format(dataLocal, 'dd/MM/yyyy HH:mm', { locale: pt })
```

## i18n no Backend

O backend usa `i18next` com locale `pt-PT` apenas. As traduções ficam em:
`apps/server/src/i18n/locales/pt-PT/messages.json`

Usar `req.t("key")` para todas as mensagens ao utilizador:

```ts
// No controller
res.status(404).json({ error: req.t("reserva.notFound") })
```

## i18n no Frontend

O frontend usa `i18next` + `react-i18next`. Configuração em:
- `apps/web/src/lib/i18n.ts`
- `apps/web/src/lib/i18n-init.ts`
- Traduções em `apps/web/src/locales/`

Hooks disponíveis: `useTranslation`, `useLanguage`
