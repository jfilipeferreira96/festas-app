s# Gestão de Festas Infantis — Descrição de Páginas

> Documento de referência para agentes de IA e developers.
> Descreve o conteúdo, lógica e comportamento esperado de cada página da aplicação.

---

## Páginas Públicas (Guest) — Route Group `(guest)`

### Entrar `/entrar`

Página de autenticação (login).  
**Componente:** `SignInForm.tsx`  
Campos: Email + Palavra-passe. Botão "Entrar". Link para recuperação de palavra-passe e registo.

### Registar `/registar`

Página de criação de conta.  
**Componente:** `SignUpForm.tsx`  
Campos: Nome, Email, Palavra-passe, Confirmação. Botão "Criar Conta".

### Recuperar Palavra-passe `/recuperar-palavra-passe`

Solicitação de reset de palavra-passe.  
**Componente:** `ResetPasswordForm.tsx`  
Campo: Email. Envia link de recuperação.

### Reset Password `/reset-password`

Definição de nova palavra-passe após clique no link de recuperação.  
**Componente:** `ResetPasswordConfirmForm.tsx`

---

## Páginas Protegidas — Route Group `(protected)`

Layout protegido com `AppSidebar` + `AppHeader` + `Backdrop`. Redirecciona para `/entrar` se não autenticado.

---

## Dashboard `/dashboard`

Página inicial da aplicação. Mostra um resumo do dia actual.

**Componente:** `DashboardContent.tsx`

**Cabeçalho:** saudação personalizada com o nome do utilizador autenticado ("Boa tarde, [Nome]! 🎉") e a data actual no formato "DD de mês de AAAA".

**KPIs — 5 cards no topo:**
- Festas Hoje — total de festas agendadas para o dia corrente
- A Começar — festas que iniciam nas próximas 60 minutos
- A Terminar — festas que terminam nas próximas 60 minutos
- Cacifos Ocupados — número de cacifos em uso com o total disponível (ex: 24/40)
- Cacifos Pagos — número de cacifos já pagos no dia

**Festas em Curso:** lista das festas activas no momento com hora de início, nome da festa, sala, número de crianças e badge de estado (Em curso / Insuficiente).

**Próximas Festas:** lista das festas que começam nas próximas horas com hora, nome, sala e tempo até ao início em minutos.

**Notas Rápidas:** campo de texto livre persistente para anotações do dia. Guarda automaticamente. Visível apenas ao utilizador autenticado (modelo `NotaRapida`).

---

## Reservas `/reservas`

Gestão completa do ciclo de vida das reservas. `Reserva` é unificada com `Festa` — não existe modelo separado.

**Componente:** `ReservasContent` (definido inline ou em componente próprio)

**Listagem:** tabela com filtros por estado (Todas / Hoje / Esta semana / Pendentes). Colunas: Aniversariante(s), Data e Hora, Sala, Número de crianças, Estado, Acções (editar, ver detalhe).

**Formulário de criação e edição** (modal ou painel lateral) com os seguintes campos:
- Cliente — pesquisa/criação de cliente existente
- Aniversariante(s) — seleção múltipla de aniversariantes do cliente
- Data — selector de data, formato DD/MM/AAAA
- Horário — hora de início, formato HH:MM
- Duração — select com opções predefinidas (ex: 1h, 1h30, 2h, 2h30, 3h)
- Sala ou Espaço — dropdown com os locais activos
- Número de Crianças — número estimado de participantes
- Extras — seleção múltipla (filtrados pelo local seleccionado)
- Monitores — seleção múltipla de monitores activos
- Método de Pagamento — dropdown (Dinheiro, Multibanco, MBWay, Transferência, Cartão, Outro)
- Caução — select (Paga / Não Paga / Paga no Dia) + valor
- Desconto — percentagem + motivo (opcional)
- Notas — campo de texto livre para alergias, preferências e observações
- Tema, Cor, Bolo — campos opcionais da festa

**Stepper de estado** visível no formulário com cinco etapas: Reserva → Confirmado → Em Curso → Concluída / Cancelada.

**Regras de negócio:**
- Não é possível criar duas reservas na mesma sala ao mesmo tempo
- Se o número de crianças exceder a capacidade da sala, deve mostrar aviso
- Uma reserva no estado "Em curso" não pode ser eliminada, apenas concluída
- Quando uma reserva passa a `EM_CURSO`, os campos `inicioEm` e `fimPrevisto` são preenchidos automaticamente
- Quando finalizada, `fimReal` é registado

---

## Calendário `/calendario`

Visão temporal de todas as reservas e festas agendadas.

**Componente:** `CalendarioContent.tsx`

**Modos de visualização:** Mês, Semana e Dia — navegáveis com setas para anterior e seguinte.

**Funcionalidades:**
- Filtros por sala, monitor e estado no topo da página
- Clicar num dia/reserva abre o detalhe
- Botão "Nova Reserva" abre o formulário pré-preenchido com a data seleccionada

---

## Festas `/festas`

Monitorização de festas. A sub-rota `/festas/a-decorrer` mostra festas em estado `EM_CURSO`.

**Componentes:** `FestasContent.tsx`, `FestasTabela.tsx`, `FestaForm.tsx`

**Card por festa** com:
- Nome da festa e sala
- Monitores alocados
- Badge de estado (Em curso / A começar / Concluída)
- Timer em contagem crescente e regressivo
- Barra de progresso visual
- Estado das etapas de festa

**Check-in de participantes:** `CheckInModal.tsx` — modal para marcar presença de participantes e atribuir cacifo.

**Histórico de etapas:** `HistoricoModal.tsx` — visualização das etapas concluídas/pendentes.

**Regras de negócio:**
- Apenas festas com estado "Em curso" aparecem na sub-rota "a decorrer"
- Ao finalizar, o sistema regista a hora real de término (`fimReal`)
- Se a festa ultrapassar o tempo previsto, o card fica destacado em vermelho

---

## Lanche `/lanche`

Ecrã dedicado à equipa de lanche (função `LANCHE`). Mostra o que tem de ser preparado para cada festa e entrada livre do dia.

**Componente:** `LancheContent.tsx`

**KPIs do dia:** Nº de festas, Nº de entradas livres, Total de crianças.

**Alergias:** secção de alerta com festas que têm notas de lanche preenchidas (alergias, restrições alimentares).

**Cards de festa:** cada festa do dia mostra nome, horário, sala, menu associado e notas de lanche. As notas são editáveis via modal (`useAtualizarNotasLanche`).

**Cards de entrada livre:** cada entrada livre ativa mostra nome do encarregado, duração e crianças.

> Acesso restrito à função `LANCHE` (e `ADMINISTRADOR`). Não permite editar festas — apenas notas de lanche.

---

## Cacifos `/cacifos`

Gestão visual dos cacifos físicos do espaço.

**Componente:** `CacifosContent.tsx`

**Grelha de cacifos:** todos os cacifos representados em grelha com número e cor de estado:
- Verde — Livre
- Vermelho/Laranja — Ocupado
- Azul — Reservado

**Configuração:** definida em `/configuracoes/cacifos` via modelo `ConfiguracaoCacifo`.

**Clicar num cacifo** abre modal com:
- Número e nome do cacifo
- Participante associado (se ocupado)
- Festa/reserva associada
- Botão para marcar como Ocupado / Libertar

**Regras de negócio:**
- Um cacifo só pode estar associado a um participante de cada vez
- Ao concluir uma festa, todos os cacifos associados ficam automaticamente disponíveis
- Estado do cacifo: `LIVRE`, `OCUPADO`, `RESERVADO`

---

## Menus `/menus`

Gestão dos menus associados a cada reserva.

**Componente:** `MenusContent.tsx`

**Modelo simplificado:** `Menu` com `nome` + `preco` (1:1 com Reserva). O antigo modelo `ItemMenu` foi removido.

**Regras de negócio:**
- O menu pode ser editado até ao momento em que a festa começa
- Após o início da festa, o menu fica em modo leitura

---

## Clientes `/clientes`

Gestão de clientes e seus dados de contacto.

**Componente:** `ClientesContent.tsx`

**Listagem:** tabela com Nome, Contribuinte, Email, Telefone, Código Postal, Observações, Opt-out.

**Formulário de criação e edição:**
- Nome
- Contribuinte (NIF)
- Email
- Telefone
- Código Postal
- Observações
- Opt-out de newsletter (toggle)

**Aniversariantes:** cada cliente pode ter múltiplos filhos (aniversariantes). Geridos através da reserva.

**Regras de negócio:**
- Email é único (opcional)
- Clientes com opt-out não recebem campanhas de marketing
- Um cliente pode ter múltiplos aniversariantes

---

## Relatórios `/relatorios`

Indicadores e análises de desempenho do espaço.

**Componente:** `RelatoriosContent.tsx`

**Filtros globais:** período (Mensal / Trimestral / Anual), sala específica, monitor específico.

**KPIs de topo:**
- Total de festas realizadas no período
- Receita total em euros
- Taxa de ocupação dos cacifos
- Extras mais contratados

---

## Divulgações `/divulgacoes`

Gestão de campanhas de comunicação com clientes (Email e SMS).

**Componente:** `DivulgacoesContent.tsx`

**Campanhas:** modelo `Campanha` com `tipo` (EMAIL/SMS), `estado` (RASCUNHO/AGENDADA/ENVIADA/CANCELADA), `assunto`, `mensagem`, `segmento`.

**Segmentos:** modelo `Segmento` com contactos associados via `ContactoSegmento`.

**Newsletter Contactos:** modelo `NewsletterContacto` ligado a `Cliente` com opt-out.

**Regras de negócio:**
- Clientes com opt-out não recebem comunicações
- Campanhas enviadas ficam imutáveis no histórico
- Métricas: taxa de abertura, total de envios

---

## Configurações

### Utilizadores `/configuracoes/utilizadores`

Gestão de acessos ao sistema (RBAC).

**Componente:** `UtilizadoresContent.tsx`

**Funções disponíveis:** `ADMINISTRADOR`, `LANCHE`, `CACIFOS`

> **RBAC hardcoded:** As permissões são definidas em código (`src/lib/permissoes.ts`), não em base de dados. O modelo `FuncaoPermissao` foi removido.

**Campos:** Nome, Email, Função, Estado (Activo/Inactivo).

---

### Configuração de Preços `/configuracoes/precos`

Configuração global de preços (tarifário por criança, meias, entradas livres, excesso de tempo).

**Componente:** `ConfigPrecosContent.tsx`

**Modelo:** `ConfiguracaoPreco` — singleton com campos: `precoCriancaSemana`, `precoCriancaFimSemana`, `precoMeia`, `precoEntradaHoraSemana`, `precoEntradaHoraFimSemana`, `precoExcessoFixo`, `minimosCriancasPorAniversariante` (JSON array: `[{ aniversariantes, minimo }]`).

> O preço da festa é calculado automaticamente: `precoCrianca × criancasFaturadas` (respeitando mínimo por nº de aniversariantes). Fins-de-semana e feriados usam tarifa fim-de-semana.

---

### Exceções de Calendário `/configuracoes/excecoes-calendario`

Gestão de feriados e dias bloqueados.

**Componente:** `ExcecoesCalendarioContent.tsx`

**Modelo:** `ExcecaoCalendario` com `data`, `tipo` (FERIADO/BLOQUEADO), `nome`, `afectaPreco` (aplica tarifa fim-de-semana), `bloqueiaReserva` (impede criar festas), `recorrenciaAnual`.

**Regras de negócio:**
- Feriados com `afectaPreco=true` aplicam tarifa de fim-de-semana
- Dias com `bloqueiaReserva=true` rejeitam criação de festas (erro `DAY_BLOCKED`)
- `recorrenciaAnual=true` compara apenas mês/dia (ignora o ano)

---

### Slots de Horário `/configuracoes/slots-horario`

Configuração dos horários predefinidos para festas.

**Componente:** `SlotsHorarioContent.tsx`

**Modelo:** `SlotHorario` com `horaInicio`, `duracaoMin` (default 135 = 2h15), `ordem`, `activo`.

> Os slots predefinidos agilizam a criação de festas. A duração normal de uma festa é 2h15m (135 minutos).

---

### Monitores `/configuracoes/monitores`

Gestão dos monitores e sua alocação a salas.

**Componente:** `MonitoresContent.tsx`

**Modelo:** `Monitor` + `MonitorLocal` (pivot M:N)

**Campos:** Nome, Contacto, Foto, Estado (Activo/Inactivo), Salas alocadas.

**Ligação opcional a utilizador:** `Monitor.userId` → `User` (1:1 opcional).

---

### Locais `/configuracoes/locais`

Gestão das salas e espaços.

**Componente:** `LocaisContent.tsx`

**Modelo:** `Local`

**Campos:** Nome, Capacidade máxima (nº de crianças), Estado (Activo/Inactivo).

---

### Extras `/configuracoes/extras`

Gestão de extras disponíveis.

**Componente:** `ExtrasContent.tsx`

**Modelo:** `Extra` + `ExtraLocal` (pivot M:N para disponibilidade por local)

**Campos:** Nome, Descrição, Preço Unitário, Ícone, Categoria (`MENU`/`EXTRA`), Subcategoria, Requer Texto (para personalização), Estado.

---

### Etapas de Festa `/configuracoes/etapas-festa`

Configuração das etapas do fluxo de festa.

**Componente:** `EtapasFestaContent.tsx`

**Modelo:** `EtapaFesta` com `nome`, `descricao`, `ordem`, `icone`, `activo`.

**Na reserva:** `ReservaEtapa` (pivot) com `concluida` e `concluidaEm` por etapa/reserva.

---

### Configuração de Cacifos `/configuracoes/cacifos`

Configuração do número total de cacifos.

**Componente:** `ConfigCacifosContent.tsx`

**Modelo:** `ConfiguracaoCacifo` com `totalCacifos` + `Cacifo[]`.

---

### Newsletter `/configuracoes/newsletter`

Gestão de segmentos e contactos para campanhas.

**Componente:** (integrado em Divulgações)

**Modelos:** `Segmento`, `NewsletterContacto`, `ContactoSegmento`

---

## Visão Macro das Tabelas da Base de Dados

Lista de tabelas com as suas relações principais.

| Tabela | Relações principais |
|---|---|
| `user` | → sessions, accounts, monitor (1:1 opcional), audit_logs, notas_rapidas |
| `session` | → user |
| `account` | → user |
| `cliente` | → reservas (1:N), aniversariantes (1:N), newsletter_contacto (1:1) |
| `aniversariante` | → cliente (N:1), reserva_aniversariante (1:N) |
| `reserva` | → cliente, local, menu (1:1), extras (M:N via reserva_extra), monitores (M:N via reserva_monitor), aniversariantes (M:N via reserva_aniversariante), etapas (M:N via reserva_etapa), participantes (1:N), cacifos (1:N) |
| `reserva_extra` | → reserva, extra; unique([reservaId, extraId]) |
| `reserva_monitor` | → reserva, monitor; unique([reservaId, monitorId]) |
| `reserva_aniversariante` | → reserva, aniversariante; unique([reservaId, aniversarianteId]) |
| `reserva_etapa` | → reserva, etapa_festa; unique([reservaId, etapaId]) |
| `local` | → reservas (1:N), monitores (M:N via monitor_local), extras (M:N via extra_local) |
| `extra` | → reservas (M:N via reserva_extra), locais (M:N via extra_local) |
| `extra_local` | → extra, local; unique([extraId, localId]) |
| `monitor` | → user (1:1 opcional), reservas (M:N via reserva_monitor), locais (M:N via monitor_local) |
| `monitor_local` | → monitor, local; unique([monitorId, localId]) |
| `configuracao_cacifo` | → cacifos (1:N) |
| `cacifo` | → configuracao_cacifo, reserva (N:1 opcional), participante (1:1 opcional) |
| `participante` | → reserva, cacifo (1:1 opcional) |
| `etapa_festa` | → reserva_etapa (1:N) |
| `menu` | → reserva (1:1) |
| `segmento` | → campanhas (1:N), contactos (M:N via contacto_segmento) |
| `newsletter_contacto` | → cliente (1:1), segmentos (M:N via contacto_segmento) |
| `contacto_segmento` | → newsletter_contacto, segmento; unique([contactoId, segmentoId]) |
| `campanha` | → segmento (N:1), envios (1:N) |
| `envio_campanha` | → campanha |
| `audit_log` | → user — registo imutável de todas as acções |
| `nota_rapida` | → user — notas rápidas por utilizador |
| `entrada_livre` | → local; crianças (JSON); cacifo (N:1 opcional); entradas pagas sem festa |
| `excecao_calendario` | — feriados/dias bloqueados; `data` única; `afectaPreco`, `bloqueiaReserva`, `recorrenciaAnual` |
| `slot_horario` | — horários predefinidos: `horaInicio`, `duracaoMin`, `ordem`, `activo` |
| `configuracao_preco` | — singleton: tarifário por criança, meias, entradas, excesso, mínimos |

**Notas sobre relações:**
- `Reserva` é unificada com `Festa` — não existe tabela separada. Campos de runtime (`inicioEm`, `fimPrevisto`, `fimReal`) são preenchidos quando estado = `EM_CURSO`
- Múltiplos aniversariantes por reserva via `reserva_aniversariante`
- `participante` pode ter cacifo associado (check-in)
- `menu` é simplificado: `nome` + `preco` + `notasLanche` (1:1 com reserva). O antigo modelo `ItemMenu` foi removido
- `monitor` pode estar ligado a um `user` do sistema (1:1 opcional)
- `audit_log` nunca é alterado nem eliminado — apenas inserções
- **RBAC é hardcoded** em `src/lib/permissoes.ts` — o modelo `FuncaoPermissao` foi removido. Funções: `ADMINISTRADOR`, `LANCHE`, `CACIFOS`
- `cacifo` preserva histórico (`cacifosHistorico` JSON) ao ser libertado — não apaga os dados da festa
- `entrada_livre` suporta múltiplas crianças (irmãos/amigos), meias e pagamento dividido (até 2 métodos)
