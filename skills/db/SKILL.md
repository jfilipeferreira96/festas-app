# SKILL — Base de Dados

Padrão para queries, migrações, relações e convenções da base de dados.

## Stack

- **ORM:** Prisma
- **Base de dados:** Neon PostgreSQL (serverless)
- **Dev schema:** `festas` (via `?schema=festas` em `DATABASE_URL`)
- **Test schema:** `test` (via `?schema=testfestas`)
- **Schema file:** `packages/db/prisma/schema.prisma`

## Convenções de nomenclatura

| Elemento | Convenção | Exemplo |
|---|---|---|
| Tabelas (DB) | `snake_case` via `@@map` | `@@map("reserva")`, `@@map("item_menu")` |
| Modelos (Prisma) | `PascalCase` | `Reserva`, `ItemMenu`, `FestaMonitor` |
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
  GESTOR
  RECECAO
  MARKETING
}

enum EstadoReserva {
  RESERVA
  CONFIRMADO
  EM_CURSO
  CONCLUIDA
  CANCELADA
}

enum EstadoFesta {
  EM_CURSO
  CONCLUIDA
}

enum EstadoCacifo {
  LIVRE
  OCUPADO
  RESERVADO
  PAGO
}

enum CategoriaItem {
  LANCHE
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

## Modelos e relações principais

### Autenticação (Better Auth)

```prisma
model User {
  id            String    @id              // Gerado pelo Better Auth
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  funcao        FuncaoUtilizador @default(RECECAO)
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
  id        String   @id @default(cuid())
  nome      String
  email     String?  @unique
  contacto  String
  optOut    Boolean  @default(false)

  aniversariantes     Aniversariante[]
  reservas            Reserva[]
  newsletterContacto  NewsletterContacto?
}

model Aniversariante {
  id        String   @id @default(cuid())
  nome      String
  dataNasc  DateTime?
  observacoes String? @db.Text
  clienteId String

  cliente   Cliente  @relation(...)
  reservas  Reserva[]
}
```

### Locais (Salas / Espaços)

```prisma
model Local {
  id         String   @id @default(cuid())
  nome       String
  capacidade Int
  activo     Boolean  @default(true)

  reservas      Reserva[]
  festas        Festa[]
  monitores     MonitorLocal[]
  extras        ExtraLocal[]
}
```

### Extras

```prisma
model Extra {
  id            String   @id @default(cuid())
  nome          String
  descricao     String?  @db.Text
  precoUnitario Decimal  @db.Decimal(10, 2)  // Guardar em euros com 2 casas decimais
  icone         String?
  activo        Boolean  @default(true)

  reservas      ReservaExtra[]
  locais        ExtraLocal[]
  itensMenu     ItemMenu[]
}

model ExtraLocal {
  // Pivot M:M entre Extra e Local (disponibilidade de extras por sala)
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
  fotoUrl   String?           // Foto de perfil (upload local)
  activo    Boolean  @default(true)

  userId    String?  @unique  // Ligação opcional a User
  user      User?

  festas    FestaMonitor[]
  locais    MonitorLocal[]
}

model MonitorLocal {
  // Pivot M:M entre Monitor e Local (alocação por sala)
  monitorId String
  localId   String
  @@unique([monitorId, localId])
}
```

### Reservas

```prisma
model Reserva {
  id              String        @id @default(cuid())
  data            DateTime
  horario         String        // HH:MM
  duracaoMinutos  Int
  numCriancas     Int           @default(0)
  cacifosPagos    Boolean       @default(false)
  notas           String?       @db.Text
  estado          EstadoReserva @default(RESERVA)

  clienteId       String
  aniversarianteId String
  localId         String

  festa           Festa?
  menu            Menu?
  extras          ReservaExtra[]
  cacifos         Cacifo[]

  @@index([data, localId])
  @@index([estado])
}

model ReservaExtra {
  // Pivot M:M entre Reserva e Extra com quantidade
  reservaId  String
  extraId    String
  quantidade Int     @default(1)
  @@unique([reservaId, extraId])
}
```

### Festas

```prisma
model Festa {
  id             String      @id @default(cuid())
  inicioEm       DateTime
  fimPrevisto    DateTime
  fimReal        DateTime?
  lancheServido  Boolean     @default(false)
  estado         EstadoFesta @default(EM_CURSO)

  reservaId      String      @unique
  localId        String

  reserva        Reserva     @relation(...)
  local          Local       @relation(...)
  monitores      FestaMonitor[]
  cacifos        Cacifo[]
  etapas         FestaEtapa[]

  @@index([estado])
  @@index([inicioEm])
}

model FestaMonitor {
  // Pivot M:M entre Festa e Monitor
  festaId   String
  monitorId String
  @@unique([festaId, monitorId])
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

  festas      FestaEtapa[]
}

model FestaEtapa {
  // Pivot M:M entre Festa e EtapaFesta com estado
  festaId     String
  etapaId     String
  concluida   Boolean   @default(false)
  concluidaEm DateTime?
  @@unique([festaId, etapaId])
}
```

### Cacifos

```prisma
model Cacifo {
  id        String       @id @default(cuid())
  numero    Int          @unique
  estado    EstadoCacifo @default(LIVRE)

  reservaId String?      // Ligação opcional à reserva
  festaId   String?      // Ligação opcional à festa

  @@index([estado])
}
```

### Menus

```prisma
model Menu {
  id        String   @id @default(cuid())
  notas     String?  @db.Text
  reservaId String   @unique

  reserva   Reserva  @relation(...)
  itens     ItemMenu[]
}

model ItemMenu {
  id            String       @id @default(cuid())
  nome          String
  categoria     CategoriaItem
  quantidade    Int          @default(1)
  precoUnitario Decimal      @db.Decimal(10, 2)
  icone         String?

  menuId    String
  extraId   String?   // Ligação opcional a Extra

  menu      Menu      @relation(...)
  extra     Extra?    @relation(...)
}
```

### Marketing — Campanhas & Newsletter

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
  // Pivot M:M entre NewsletterContacto e Segmento
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

### Sistema — Audit Log & Notas Rápidas

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

### RBAC — Funções & Permissões

```prisma
model FuncaoPermissao {
  funcao      FuncaoUtilizador
  modulo      String   // "reservas", "festas", "cacifos", "menus", "relatorios", "divulgacoes", "configuracoes"
  nivelAcesso String   // "leitura", "escrita", "administracao"

  @@unique([funcao, modulo])
}
```

## Regras de negócio na camada de dados

### Ao criar uma reserva
- Verificar se o local tem disponibilidade na data e hora (sem sobreposição com outra reserva no mesmo local)
- Verificar se o número de crianças não excede a capacidade do local (aviso, não erro)

### Ao transitar para `EM_CURSO`
- Criar automaticamente o registo em `Festa` se ainda não existir
- Registar `inicioEm` com a hora actual

### Ao transitar para `CONCLUIDA`
- Registar `fimReal` em `Festa`
- Actualizar todos os `Cacifo` da festa para estado `LIVRE`

### Ao transitar para `CANCELADA`
- Reserva cancelada não pode ser eliminada, apenas mudança de estado
- Se existir `Festa` associada, deve ser tratada (concluída ou cancelada)

## Audit log

Registar no `AuditLog` sempre que:
- Uma reserva é criada, editada ou eliminada
- O estado de uma reserva ou festa é alterado
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
// Festas activas para o dashboard
const festasActivas = await prisma.festa.findMany({
  where: { estado: 'EM_CURSO' },
  include: {
    reserva: { include: { aniversariante: true, cliente: true } },
    local: true,
    monitores: { include: { monitor: true } },
    cacifos: true,
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
  include: { aniversariante: true, local: true },
  orderBy: { data: 'asc' },
  skip: (pagina - 1) * porPagina,
  take: porPagina,
})
```

## Testes

- **Test schema:** `test` (isolado, via `?schema=testfestas`)
- **Test helpers:** `apps/server/__tests__/helpers/seed.ts`
- **Test client:** `apps/server/__tests__/helpers/test-prisma.ts`
- **Padrão:** Mock `@prisma/db-client` → `testPrisma` com schema `test`