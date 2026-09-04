# SKILL - Base de Dados

Padrão para queries, migrações, relações e convenções da base de dados.

## Stack

- **ORM:** Prisma
- **Base de dados:** MySQL 8.x
- **Dev database:** `festas` (`DATABASE_URL`)
- **Test database:** `festas_test` (auto-created por `__tests__/setup-db.ts`)
- **Schema file:** `packages/db/prisma/schema.prisma`

## Convenções de nomenclatura

| Elemento | Convenção | Exemplo |
|---|---|---|
| Tabelas (DB) | `snake_case` via `@@map` | `@@map("reserva")`, `@@map("reserva_extra")` |
| Modelos (Prisma) | `PascalCase` | `Reserva`, `ReservaMonitor`, `EtapaFesta` |
| Colunas (Prisma) | `camelCase` | `horaInicio`, `criadoEm` → mapeado para `hora_inicio`, `criado_em` no DB |
| Chaves primárias | `id` (CUID ou Better Auth ID) | `@id @default(cuid())` ou `@id` (User) |
| Chaves estrangeiras | `camelCase` + `Id` | `reservaId`, `localId`, `clienteId` |
| Timestamps | `createdAt`, `updatedAt` | Presentes em todos os modelos via `@default(now())` e `@updatedAt` |
| Enums | `UPPER_SNAKE_CASE` | `EM_CURSO`, `CONFIRMADO`, `RASCUNHO` |

> **Nota:** As colunas no Prisma usam `camelCase`, mas o Prisma mapeia automaticamente para `snake_case` na base de dados quando necessário. Os campos `createdAt`/`updatedAt` são mapeados para `created_at`/`updated_at` no DB.

## Campos obrigatórios em todos os modelos

```prisma
id        String   @id @default(cuid())
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

> **Nota:** O modelo `User` usa `@id` sem `@default` (o ID é gerado pelo Better Auth).

## Enums do sistema

```prisma
enum FuncaoUtilizador {
  ADMINISTRADOR
  LANCHE
  CACIFOS
  MONITOR
  FESTAS_ACABAR
}

enum EstadoReserva {
  RESERVA
  CONFIRMADO
  EM_CURSO
  CONCLUIDA
  CANCELADA
}

enum EstadoLanche {
  NAO_INICIADO
  A_DECORRER
  TERMINADO
}

enum EstadoCacifo {
  LIVRE
  OCUPADO
  RESERVADO
}

enum MetodoPagamento {
  DINHEIRO
  MULTIBANCO
  MBWAY
  TRANSFERENCIA
  CARTAO
  OUTRO
}

enum EstadoCaucao {
  PAGA
  NAO_PAGA
  PAGA_NO_DIA
}

enum CategoriaItem {
  MENU
  EXTRA
}

enum TipoCampanha {
  EMAIL
  SMS
}

enum EstadoCampanha {
  RASCUNHO
  AGENDADA
  ENVIADA
  CANCELADA
}
```

> **Importante:** Não existe `EstadoFesta` separado. O estado da festa é o `EstadoReserva` da reserva associada. `CategoriaItem` tem `MENU` e `EXTRA` (não `LANCHE`). `EstadoCacifo` tem 3 valores (sem `PAGO`).

## Modelos e relações principais

> **Conceito chave:** `Reserva` é unificada com `Festa` - não existe modelo `Festa` separado. Quando uma reserva passa a `EM_CURSO`, os campos de runtime (`inicioEm`, `fimPrevisto`, `fimReal`) são preenchidos na própria reserva. O antigo modelo `ItemMenu` foi removido; `Menu` é simplificado para `nome` + `preco`.

### Autenticação (Better Auth)

```prisma
model User {
  id            String    @id              // Gerado pelo Better Auth
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  funcao        FuncaoUtilizador @default(CACIFOS)
  activo        Boolean          @default(true)

  sessions      Session[]
  accounts      Account[]
  monitor       Monitor?         // Ligação opcional 1:1
  auditLogs     AuditLog[]
  notasRapidas  NotaRapida[]
}

model Session { ... }  // Better Auth
model Account { ... }  // Better Auth
model Verification { ... }  // Better Auth
```

### Clientes & Aniversariantes

```prisma
model Cliente {
  id             String   @id @default(cuid())
  nome           String
  contribuinte   String?
  email          String?  @unique
  telefone       String
  codigoPostal   String?
  observacao     String?  @db.Text
  optOut         Boolean  @default(false)

  aniversariantes     Aniversariante[]
  reservas            Reserva[]
  newsletterContacto  NewsletterContacto?
}

model Aniversariante {
  id             String    @id @default(cuid())
  nome           String
  dataNascimento DateTime?
  observacoes    String?   @db.Text
  clienteId      String

  cliente        Cliente   @relation(...)
  reservas       ReservaAniversariante[]
}
```

### Locais (Salas / Espaços)

```prisma
model Local {
  id         String   @id @default(cuid())
  nome       String
  capacidade Int      // Nº máximo de crianças
  activo     Boolean  @default(true)

  reservas      Reserva[]
  monitores     MonitorLocal[]
  extras        ExtraLocal[]
}
```

### Extras

```prisma
model Extra {
  id            String        @id @default(cuid())
  nome          String
  descricao     String?       @db.Text
  precoUnitario Decimal       @db.Decimal(10, 2)
  icone         String?
  categoria     CategoriaItem @default(EXTRA)
  subcategoria  String?       // Ex: "Diversão", "Premium"
  requerTexto   Boolean       @default(false)
  activo        Boolean       @default(true)

  reservas      ReservaExtra[]
  locais        ExtraLocal[]
}

model ExtraLocal {
  // Pivot M:N entre Extra e Local (disponibilidade de extras por sala)
  extraId  String
  localId  String
  @@unique([extraId, localId])
}
```

### Monitores

```prisma
model Monitor {
  id        String   @id @default(cuid())
  nome      String
  contacto  String
  fotoUrl   String?
  activo    Boolean  @default(true)

  userId    String?  @unique  // Ligação opcional a User
  user      User?

  reservas  ReservaMonitor[]  // Alocação por reserva
  locais    MonitorLocal[]
}

model MonitorLocal {
  // Pivot M:N entre Monitor e Local (alocação por sala)
  monitorId String
  localId   String
  @@unique([monitorId, localId])
}
```

### Configuração de Cacifos

```prisma
model ConfiguracaoCacifo {
  id           String   @id @default(cuid())
  totalCacifos Int      @default(200)

  cacifos      Cacifo[]
}
```

### Reservas (unificado com Festa)

```prisma
model Reserva {
  id              String        @id @default(cuid())
  data            DateTime
  horario         String        // HH:MM
  duracaoMinutos  Int
  numCriancas     Int           @default(0)
  notas           String?       @db.Text
  estado          EstadoReserva @default(RESERVA)

  // Runtime fields (preenchidos quando estado = EM_CURSO)
  inicioEm        DateTime?
  fimPrevisto     DateTime?
  fimReal         DateTime?
  cacifosHistorico Json?

  // Campos da festa
  tema              String?
  previsaoCriancas  Int?
  cor               String?
  bolo              String?
  boloQuantidade    Int?

  // Observações
  observacoesGerais  String?  @db.Text
  observacoesLesoes  String?  @db.Text
  observacoesBrindes String?  @db.Text
  outrosExtras       String?  @db.Text

  // Pagamento
  metodoPagamento     MetodoPagamento?
  valorPago           Decimal?          @db.Decimal(10, 2)
  pago                Boolean           @default(false)
  referenciaPagamento String?

  // Caução
  caucao              EstadoCaucao      @default(NAO_PAGA)
  valorCaucao         Decimal?          @db.Decimal(10, 2)

  // Desconto
  descontoPercentagem Int?
  descontoMotivo      String?

  // Relações
  clienteId       String
  cliente         Cliente       @relation(...)

  localId         String
  local           Local         @relation(...)

  menu            Menu?
  extras          ReservaExtra[]
  cacifos         Cacifo[]
  monitores       ReservaMonitor[]
  etapas          ReservaEtapa[]
  participantes   Participante[]
  aniversariantes ReservaAniversariante[]

  @@index([data, localId])
  @@index([estado])
}

model ReservaExtra {
  reservaId          String
  extraId            String
  quantidade         Int     @default(1)
  textoPersonalizado String?
  @@unique([reservaId, extraId])
}

model ReservaMonitor {
  reservaId String
  monitorId String
  @@unique([reservaId, monitorId])
}

model ReservaAniversariante {
  reservaId       String
  aniversarianteId String
  @@unique([reservaId, aniversarianteId])
}
```

### Etapas de Festa (configuráveis)

```prisma
model EtapaFesta {
  id          String    @id @default(cuid())
  nome        String
  descricao   String?   @db.Text
  ordem       Int       @default(0)
  icone       String?
  activo      Boolean   @default(true)

  reservas    ReservaEtapa[]
}

model ReservaEtapa {
  reservaId   String
  etapaId     String
  concluida   Boolean   @default(false)
  concluidaEm DateTime?
  @@unique([reservaId, etapaId])
}
```

### Participantes (crianças na festa)

```prisma
model Participante {
  id        String   @id @default(cuid())
  nome      String
  presente  Boolean  @default(false)
  cacifoId  String?  @unique  // Cacifo atribuído no check-in
  reservaId String

  reserva   Reserva  @relation(...)
  cacifo    Cacifo?  @relation(...)
}
```

### Cacifos

```prisma
model Cacifo {
  id              String            @id @default(cuid())
  numero          Int               @unique
  nome            String?
  estado          EstadoCacifo      @default(LIVRE)
  notas           String?           @db.Text
  criancas        String?

  configuracaoId  String
  configuracao    ConfiguracaoCacifo @relation(...)

  reservaId       String?
  reserva         Reserva?          @relation(...)

  participante    Participante?     // 1:1 com participante (check-in)

  @@index([estado])
}
```

### Menus (simplificado)

```prisma
model Menu {
  id        String   @id @default(cuid())
  nome      String
  preco     Decimal  @db.Decimal(10, 2) @default(0)
  notas     String?  @db.Text

  reservaId String   @unique
  reserva   Reserva  @relation(...)
}
```

> **Nota:** O modelo `ItemMenu` foi removido. O `Menu` agora tem apenas `nome` e `preco`.

### Marketing - Campanhas & Newsletter

```prisma
model Segmento {
  nome      String
  descricao String?  @db.Text

  contactos ContactoSegmento[]
  campanhas Campanha[]
}

model NewsletterContacto {
  optOut    Boolean  @default(false)
  clienteId String   @unique

  cliente   Cliente  @relation(...)
  segmentos ContactoSegmento[]
}

model ContactoSegmento {
  contactoId String
  segmentoId String
  @@unique([contactoId, segmentoId])
}

model Campanha {
  tipo         TipoCampanha
  estado       EstadoCampanha  @default(RASCUNHO)
  assunto      String?
  mensagem     String          @db.Text
  segmentoId   String?
  agendadaPara DateTime?
  enviadaEm    DateTime?

  segmento     Segmento?       @relation(...)
  envios       EnvioCampanha[]
}

model EnvioCampanha {
  campanhaId String
  contactoId String
  aberto     Boolean   @default(false)
  abertoEm   DateTime?
}
```

### Sistema - Audit Log & Notas Rápidas

```prisma
model AuditLog {
  accao     String
  detalhes  Json?
  userId    String

  user      User      @relation(...)
  @@index([userId])
  @@index([createdAt])
}

model NotaRapida {
  conteudo  String   @db.Text
  userId    String

  user      User     @relation(...)
}
```

### RBAC - Funções & Permissões (HARDCODED)

> O modelo `FuncaoPermissao` foi removido. As permissões são definidas em código (`apps/web/src/lib/permissoes.ts`).
>
> **5 papéis:** `ADMINISTRADOR`, `LANCHE`, `CACIFOS`, `MONITOR`, `FESTAS_ACABAR`.
>
> **Módulos:** `reservas`, `cacifos`, `menus`, `lanche`, `relatorios`, `divulgacoes`, `configuracoes`, `monitores`, `festas_acabar`.
>
> Cada papel não-administrador é redirecionado para a sua home route via `getHomeRoute()`:
> - `LANCHE` → `/lanche`
> - `CACIFOS` → `/festas`
> - `MONITOR` → `/monitores`
> - `FESTAS_ACABAR` → `/festas-acabar`
>
> **Matriz:**
> - `ADMINISTRADOR` - administração em todos os módulos.
> - `LANCHE` - `lanche` (escrita), `menus` (leitura).
> - `CACIFOS` - `cacifos` (escrita), `reservas` (leitura).
> - `MONITOR` - `monitores` (leitura).
> - `FESTAS_ACABAR` - `festas_acabar` (escrita).

## Regras de negócio na camada de dados

### Ao criar uma reserva
- Verificar se o local tem disponibilidade na data e hora (sem sobreposição com outra reserva no mesmo local)
- Verificar se o número de crianças não excede a capacidade do local (aviso, não erro)

### Ao transitar para `EM_CURSO`
- Registar `inicioEm` e calcular `fimPrevisto` na própria reserva
- A reserva passa a funcionar como "festa" - os campos de runtime são preenchidos

### Ao transitar para `CONCLUIDA`
- Registar `fimReal` na reserva
- Actualizar todos os `Cacifo` da reserva para estado `LIVRE`

### Ao transitar para `CANCELADA`
- Reserva cancelada não pode ser eliminada, apenas mudança de estado
- Cacifos reservados devem ser libertados

## Audit log

Registar no `AuditLog` sempre que:
- Uma reserva é criada, editada ou eliminada
- O estado de uma reserva é alterado
- Um utilizador acede ao sistema
- Permissões são alteradas

```typescript
await prisma.auditLog.create({
  data: {
    accao: 'reserva.criada',
    detalhes: { reservaId: reserva.id },
    userId: sessao.user.id,
  }
})
```

## Queries comuns

```typescript
// Reservas em estado EM_CURSO (festas activas) para o dashboard
const festasActivas = await prisma.reserva.findMany({
  where: { estado: 'EM_CURSO' },
  include: {
    cliente: true,
    aniversariantes: { include: { aniversariante: true } },
    local: true,
    monitores: { include: { monitor: true } },
    cacifos: true,
    participantes: true,
    etapas: { include: { etapa: true } },
  },
  orderBy: { inicioEm: 'asc' },
})

// Reservas com filtros e paginação
const reservas = await prisma.reserva.findMany({
  where: {
    ...(filtros.estado && { estado: filtros.estado }),
    ...(filtros.localId && { localId: filtros.localId }),
    ...(filtros.data && {
      data: {
        gte: startOfDay(filtros.data),
        lte: endOfDay(filtros.data),
      }
    }),
  },
  include: {
    cliente: true,
    aniversariantes: { include: { aniversariante: true } },
    local: true,
  },
  orderBy: { data: 'asc' },
  skip: (pagina - 1) * porPagina,
  take: porPagina,
})
```

## Testes

- **Test schema:** `test` (isolado, via `?schema=testfestas`)
- **Test helpers:** `apps/web/__tests__/helpers/seed.ts`
- **Test client:** `apps/web/__tests__/helpers/test-prisma.ts`
- **Padrão:** Mock `@festas/db` → `testPrisma` com schema `test`

```typescript
vi.mock("@festas/db", () => ({
  PrismaClient: vi.fn(() => testPrisma),
}));
```

## Database scripts

- `packages/db/scripts/db.js` - Operações: generate, push, push:force, migrate, studio, reset, clean, seed, seed:dev
- `packages/db/scripts/fix-enum.sql` - SQL para limpar stale enum types (`_old` suffix) antes do `db push`
- Os comandos `clean` e `reset` limpam automaticamente stale enums para evitar erros PostgreSQL
