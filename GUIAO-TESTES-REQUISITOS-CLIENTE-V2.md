# Guião de Testes e Análise - Requisitos do Cliente (V2)

## 1. Cruzamento ponto-a-ponto - tudo o que o Nuno pediu

| # | Pedido do Nuno | Estado | Onde ficou |
|---|---|---|---|
| 1 | Entrada livre: total preenchido por defeito no campo total a pagar | ✅ FASE 1 | Nova Entrada → secção Pagamento (campo sempre visível, pré-preenchido com o cálculo) |
| 2 | Entrada livre: "falta pagar" dava o valor que se está a pagar | ✅ FASE 1 | Ledger: sem pagamentos mostra "Total a pagar" (neutro); "Falta pagar" só com pagamento parcial |
| 3 | Entrada livre: campo não deixa apagar | ✅ FASE 1 | Apagar = segue o cálculo; não volta a auto-preencher enquanto o utilizador não mudar a composição |
| 4 | Extras da entrada livre com seta para aparecer | ✅ FASE 2 | Secção Extras colapsável com seta + contador; abre automaticamente se já houver extras |
| 5 | Meias antes do pagamento | ✅ FASE 2 | Bloco Meias movido para a secção Duração/Lanche (antes do Pagamento) |
| 6 | Talão da entrada livre para impressora USB | ✅ FASE 6 | Modal Gerir pagamento → botão **Talão** (formato 80mm; imprime via browser → impressora USB do PC) |
| 7 | Entrada livre: falta hora de saída na listagem | ✅ FASE 1 | Coluna **Saída**: hora real quando concluída; prevista (muted) enquanto em curso |
| 8 | Após pagamento continua "Por pagar" | ✅ FASE 1 | Causa raiz corrigida: `concluir()` e "marcar excesso pago" agora re-derivam o estado `pago`; testes de regressão |
| 9 | Festas: sala só deve mostrar Sala 1 e Sala 2 | ⚠️ **Ação operacional** | O form mostra apenas locais **activos** → desativar as restantes salas em Configurações → Locais (sem código destrutivo) |
| 10 | Nova festa: retirar adultos acompanhantes | ✅ FASE 2 | Campo removido do form; mantém default 0 internamente |
| 11 | Não deixar alterar a cor da festa - ficar a do slot | ✅ FASE 2 | Select de cor removido; cor aplica-se ao escolher o slot (`slot.corDefault`); horário personalizado → primeira cor livre |
| 12 | O extra é sempre o total de crianças | ✅ FASE 2 | Quantidade fixa = total de crianças, auto-sync (sem stepper manual) |
| 13 | Extra do almoço/janta por baixo do menu | ✅ FASE 2 | Extras com "Almoço/Jantar/Janta" no nome aparecem por baixo do select Menu |
| 14 | Receção: tem que ter tudo o que foi marcado | ✅ FASE 3 | Detalhe da festa auditado e completo; secção **Monitores** era a que faltava e foi adicionada |
| 15 | Nº total de crianças que apareceram na festa | ✅ FASE 3 | Campo "Crianças presentes" editável na receção (em curso/concluída) e input na finalização |
| 16 | Caução paga/não paga na tabela e na receção | ✅ FASE 3 | Coluna Caução na tabela de festas (badge); receção já mostrava e continua |
| 17 | Página tudo a decorrer com 3 abas (tudo/festas/entradas) | ✅ FASE 4 | **/a-decorrer** no menu lateral |
| 18 | Página com as cauções todas (pagas/por pagar) | ✅ FASE 4 | **/caucoes** com filtros, totais e pesquisa |
| 19 | Página de bolos a encomendar por data | ✅ FASE 4 | **/bolos** (Festas → Bolos) com lista por data + impressão |
| 20 | Opção de não enviar notificações ao cliente | ✅ FASE 5 | Checkbox "Enviar confirmação por email" no Nova Festa (default respeita o opt-out global do cliente) |
| 21 | Email da marcação com tudo; caução paga → reservada; não paga → dados de pagamento | ✅ FASE 5 | Email MailJet automático na criação; dados de pagamento editáveis em Configurações → Preços |
| 22 | "cacifos, lanches, monitores, festas-acabar" | ⚠️ **Ambíguo** | Interpretado como manter as vistas destas equipas consistentes (rodapés, avisos, colunas ocultas por papel). Confirmar com o Nuno o que pretendia exatamente |
| 23 | Dashboard: receita do dia por método de pagamento | ✅ Já existia | Secção "Receitas do Dia" na dashboard (verificar no guião abaixo) |
| 24 | Cacifos: nome da criança + outras crianças no cacifo | ✅ Já existia | Preencher Cacifos aceita vários nomes por cacifo (separados por vírgula/linha) - verificar no guião |
| 25 | Receção: imprimir crianças registadas nos cacifos | ✅ Já existia | Botão Imprimir no detalhe da festa e no Preencher Cacifos |
| 26 | Festas a acabar só no monitor quando faltam 10 min, até concluir | ✅ FASE 6 | Endpoint da TV: `fimPrevisto ≤ agora+10min` e estado EM_CURSO |
| 27 | O mesmo nas entradas livres | ✅ FASE 6 | Mesmo critério para entradas ATIVA |
| 28 | Retirar o título; chamar lanche 10 min antes; abas FESTAS ACABAR \| ENTRADAS LIVRES \| LANCHES | ✅ FASE 6 | TV redesenhada: sem título, 3 abas com contadores, secção LANCHES |
| 29 | "Muito lixo e texto para remover" | ✅ FASE 7 | Hints redundantes removidos dos formulários; rodapés informativos consistentes |

**Resumo:** 27/29 implementados ou já existentes · 2 pontos operacionais/ambíguos (#9 ação por dados; #22 a confirmar com o Nuno).

---

## 2. Guião de testes manuais (por página)

### 2.1 Entradas Livres (`/entradas-livres`) - como ADMINISTRADOR
1. **Nova Entrada**: preencher crianças + duração → secção Meias aparece **antes** do Pagamento.
2. **Extras**: secção colapsada com seta; abrir, selecionar extras → badge com contador.
3. **Total a pagar**: campo visível sem checkboxes, pré-preenchido com o cálculo.
   - Apagar o valor → fica vazio (não volta a auto-preencher); o ledger usa o cálculo.
   - Escrever outro valor → o ledger usa o valor escrito.
4. **Ledger**: sem pagamentos mostra "Total a pagar 25,00 €"; adicionar 10 € → passa a "Falta pagar 15,00 €".
5. Guardar → na tabela o badge deve dizer **Por pagar** (pagamento parcial).
6. **Gerir pagamento** (💳): registar o restante → Guardar → badge da tabela passa a **✓ Pago** (sem refresh manual).
7. **Talão**: no modal, botão **Talão** → abre janela de impressão formato 80mm com itens, total, pagamentos e "FALTA PAGAR"/"LIQUIDADO".
8. **Coluna Saída**: linha ATIVA mostra hora prevista (muted); concluir a entrada → mostra hora real.
9. **Concluir com excesso** (deixar passar o tempo, excesso 5 €): badge passa a **Por pagar**; clicar "Marcar excesso pago" (💳) → badge passa a **✓ Pago**. *(Regressão do bug do cliente.)*

### 2.2 Festas - Nova Festa (`/festas`) - como ADMINISTRADOR
1. Sem campo **Adultos acompanhantes**.
2. Sem select **Cor da Festa**; escolher slot → cor da pulseira aplicada automaticamente.
3. **Sala**: apenas as salas ativas (desativar as extra em Configurações → Locais; confirmar Sala 1/Sala 2).
4. **Extras**: selecionar um extra → quantidade sempre = total de crianças, sem controlo manual.
5. **Menu**: extra com "Almoço/Janta" no nome aparece **por baixo do Menu** (fora dos Extras).
6. **Checkbox "Enviar confirmação por email"**: visível junto ao encarregado; ao pesquisar um cliente com opt-out, fica desligada por defeito.
7. Guardar → (com MAILJET configurado) o cliente recebe email com o resumo e o bloco de caução/dados de pagamento.

### 2.3 Receção (detalhe da festa)
1. Abrir uma festa → tab **Geral** deve mostrar: data/hora/sala, crianças, **menu**, **extras com quantidades**, **bolo**, **monitores atribuídos**, **caução**, **pagamentos**, notas e observações.
2. Em festa EM_CURSO/CONCLUIDA: campo **"Crianças presentes"** editável com botão Guardar.
3. Botão **Imprimir** → lista de crianças com os nomes registados nos cacifos.
4. Na tabela de festas: coluna **Caução** com badge Paga / Paga no dia / Não paga (tooltip com o valor).
5. **Finalizar**: modal com input **"Nº total de crianças que apareceram"** (opcional).

### 2.4 Novas páginas
- **/a-decorrer**: 3 abas no topo (Tudo | Festas | Entradas Livres); Tudo mostra ambas as vistas; rodapé "atualiza automaticamente".
- **/caucoes**: totais (Pagas / Paga no dia / Por pagar), filtros funcionais, pesquisa por cliente, badge por linha, rodapé sobre devolução da caução.
- **/bolos**: escolher data → apenas bolos da casa (1kg/2kg/artístico) listados por hora; **Imprimir lista** abre o PDF de impressão para a cozinha; bloco à parte com bolos "pais trazem / a decidir".

### 2.5 Dashboard (`/dashboard`)
1. Secção **Receitas do Dia** com desagregação por método de pagamento (já existia - confirmar).
2. Se houver emails na fila por enviar → alerta laranja discreto "N email(s) por enviar"; ao carregar a página a fila é reprocessada automaticamente.

### 2.6 TV / Festas a Acabar (`/festas-acabar` → Modo ecrã)
1. Sem título grande; data + botão Ecrã no topo.
2. 3 abas grandes: **FESTAS ACABAR | ENTRADAS LIVRES | LANCHES** com contadores.
3. Apenas festas/entradas com **faltam ≤10 min** para o fim (e permanecem até serem concluídas).
4. Aba LANCHES: festas EM_CURSO de hoje com `horaLanche` na janela (−30/+10 min) com aviso "Chamar para o lanche".
5. Relógio no rodapé; auto-refresh a cada 30 s.

### 2.7 Cacifos (`/cacifos`) - como CACIFOS
1. Tabela de festas **sem** colunas Caução/Custo/Pagamento (ocultas para este papel).
2. Preencher Cacifos: escrever vários nomes no mesmo cacifo (separados por vírgula) → aparecem na impressão.
3. Entradas livres: coluna Saída visível; colunas Custo/Pagamento ocultas.

### 2.8 Emails (FASE 5/9)
1. Com MAILJET configurado: criar marcação com email válido → cliente recebe confirmação.
2. Caução PAGA → bloco verde "Reserva confirmada"; NÃO PAGA → bloco laranja com os dados de pagamento.
3. Cliente com opt-out ou sem email → nenhum envio.
4. Fila: se o envio falhar, fica FALHADO com tentativa; alerta na dashboard; retry automático no próximo carregamento (máx. 3).

---

## 3. Análise por papel - o que cada utilizador vê e o que mudou

| Papel | Home | Vê | Mudou para ele |
|---|---|---|---|
| **ADMINISTRADOR** | /dashboard | Tudo | Todas as fases: bugs de pagamento corrigidos, nova página A Decorrer, Cauções, Bolos, email automático, talão, fila de emails, TV, formulários simplificados |
| **RECECAO** | /reservas | Festas (escrita), Clientes | Nova Festa simplificado (sem adultos/cor), talão, coluna Saída, cauções na tabela, receção completa com monitores + crianças presentes, páginas novas (A Decorrer/Cauções/Bolos acessíveis via reservas leitura/escrita) |
| **CACIFOS** | /cacifos | Cacifos (escrita) + festas/entradas em modo leitura sem preços | Coluna **Saída** nas entradas (útil); coluna Caução **oculta** (igual às de preço); caução nunca aparece; resto inalterado |
| **LANCHE** | /lanche | Lanche (escrita) + menus (leitura) | **Nada de direto** - a sua página não mudou; indireto: festas chegam mais limpas (sem adultos, extras normalizados) |
| **MONITOR** | /monitores | Monitores (leitura - Gantt + notas) | **Nada de direto** |
| **FESTAS_ACABAR** | /festas-acabar | Festas a Acabar (escrita) | **Grande mudança**: TV redesenhada (sem título, 3 abas FESTAS ACABAR/ENTRADAS LIVRES/LANCHES, janela de 10 min mantida até concluir, aviso de lanche, relógio) |
| **STAFF** | /festas | Reservas (leitura), Cacifos (escrita), Festas a Acabar (leitura) | Vê as tabelas atualizadas (coluna Saída/Caução); páginas novas visíveis apenas em leitura onde o módulo reservas o permita |

---

## 4. Pendências operacionais / a confirmar

1. **Salas Sala 1 e Sala 2**: desativar as restantes em Configurações → Locais (o form já filtra por ativas).
2. **Email via SMTP do cPanel** (substitui o MailJet): preencher no `.env` de produção
   `SMTP_HOST=mail.baselandia.pt`, `SMTP_PORT=465`, `SMTP_SECURE=true`,
   `SMTP_USER=reservas@baselandia.pt`, `SMTP_PASS=...`, `EMAIL_FROM_ADDRESS=reservas@baselandia.pt`,
   `EMAIL_FROM_NAME=Baselandia`. Alimenta os 3 fluxos: verificação de conta, reset de password
   e confirmação de marcação. Sem credenciais, os emails apenas registam em log (não rebentam).
3. **Dados de pagamento**: preencher IBAN/MBWay em Configurações → Preços (vai no email quando a caução não está paga).
4. **BD remota**: aplicar schema com `node scripts/remote-db.mjs <cmd> prod` (mudanças todas aditivas: `numCriancasPresentes`, `dadosPagamento`, tabela `envio_email`).
5. **Confirmar com o Nuno** o ponto "cacifos, lanches, monitores, festas-acabar" (mensagem ambígua).
6. **Melhoria futura sugerida**: toggle visível para o opt-out global do cliente na ficha de Clientes (hoje a flag existe e é respeitada; a edição é apenas pela ficha de cliente existente).
7. **Dica de deliverability no cPanel**: ativar SPF/DKIM do domínio baselandia.pt (Email Deliverability no cPanel) para reduzir o risco de spam.

---

## 5. Mapa de acessos por utilizador (RBAC) - quem vê que página

> Análise verificada no código. Fontes de verdade: matriz hardcoded em `src/lib/permissoes.ts` (7 papéis × 10 módulos), guarda server-side em cada `page.tsx` (`hasAccess()` → redirect para a home do papel) e filtro do menu lateral (`src/layout/AppSidebar.tsx`).

### 5.1 Como o acesso é garantido (4 camadas)

1. **Middleware** (`src/middleware.ts`): só exige sessão (sem sessão → `/entrar`). Não filtra papéis.
2. **Página (server component)**: `hasAccess(funcao, modulo, nivel)`; se falhar → redirect para a home do papel (`getHomeRoute`). Aplica-se a: `/festas`, `/entradas-livres`, `/a-decorrer`, `/caucoes`, `/bolos`, `/monitores`, `/festas-acabar`, `/clientes`, `/configuracoes/*`.
3. **Menu lateral**: mostra apenas itens cujo módulo tem, pelo menos, leitura. `Dashboard` é exclusivo do ADMINISTRADOR; para o papel CACIFOS os itens do módulo "reservas" são ocultados de propósito no menu (o acesso por URL mantém-se, em modo leitura simplificado sem preços).
4. **API/Serviços**: `requireAuth()` + verificação de papel no serviço (defesa final, mesmo se alguém chegar a uma página por URL direto).

### 5.2 Página inicial (home) por papel

| Papel | Home | Nota |
|---|---|---|
| ADMINISTRADOR | `/dashboard` | Vê tudo |
| RECECAO | `/reservas` | Cria/edita festas e entradas |
| STAFF | `/festas` | Apoio geral: leitura de festas + escrita em cacifos |
| CACIFOS | `/cacifos` | Só cacifos no menu; reservas por URL em leitura simplificada |
| LANCHE | `/lanche` | Vista dedicada de lanches |
| MONITOR | `/monitores` | Gantt + notas diárias |
| FESTAS_ACABAR | `/festas-acabar` | Tabela EM_CURSO + Modo Ecrã (TV) |

### 5.3 Página a página - quem tem acesso

Legenda: ✍️ = escrita/administração · 👁️ = leitura · 🔒 = vista simplificada (modo "cacifos": sem preços/caução/pagamento) · `—` = sem acesso (redirect para a home do papel).

| Página | ADMIN | RECEÇÃO | STAFF | CACIFOS | LANCHE | MONITOR | FESTAS ACABAR |
|---|---|---|---|---|---|---|---|
| `/dashboard` | ✍️ | — | — | — | — | — | — |
| `/festas` (Todas) | ✍️ | ✍️ | 👁️ | 👁️🔒 | — | — | — |
| `/festas/a-decorrer` | ✍️ | ✍️ | 👁️ | 👁️🔒 | — | — | — |
| `/bolos` | ✍️ | ✍️ | 👁️ | 👁️ | — | — | — |
| `/entradas-livres` (Todas) | ✍️ | ✍️ | 👁️ | 👁️🔒 | — | — | — |
| `/entradas-livres/a-decorrer` | ✍️ | ✍️ | 👁️ | 👁️🔒 | — | — | — |
| `/a-decorrer` (3 abas) | ✍️ | ✍️ | 👁️ | 👁️ | — | — | — |
| `/caucoes` | ✍️ | ✍️ | 👁️ | 👁️ | — | — | — |
| `/calendario` | ✍️ | ✍️ | 👁️ | 👁️¹ | — | — | — |
| `/cacifos` | ✍️ | 👁️ | ✍️ | ✍️ | — | — | — |
| `/lanche` | ✍️ | — | — | — | ✍️ | — | — |
| `/monitores` | ✍️ | — | — | — | — | 👁️ | — |
| `/festas-acabar` (TV) | ✍️ | — | 👁️ | — | — | — | ✍️ |
| `/clientes` | ✍️ | 👁️ | — | — | — | — | — |
| `/relatorios` | ✍️ | — | — | — | — | — | — |
| `/configuracoes/utilizadores` | ✍️ | — | — | — | — | — | — |
| `/configuracoes/monitores` | ✍️ | — | — | — | — | — | — |
| `/configuracoes/locais` | ✍️ | — | — | — | — | — | — |
| `/configuracoes/menus` (Menus & Extras) | ✍️ | — | — | — | — | — | — |
| `/configuracoes/cacifos` | ✍️ | — | — | — | — | — | — |
| `/configuracoes/precos` | ✍️ | — | — | — | — | — | — |
| `/configuracoes/excecoes-calendario` | ✍️ | — | — | — | — | — | — |
| `/configuracoes/slots-horario` | ✍️ | — | — | — | — | — | — |

¹ CACIFOS tem `reservas: leitura` (a API permite), mas o item não aparece no menu dele - só por URL direto.

### 5.4 O que cada papel vê no menu lateral (resumo prático)

- **ADMINISTRADOR**: Dashboard, Festas (Todas / A decorrer / Bolos), Entradas Livres (Todas / A decorrer), A Decorrer, Cauções, Calendário, Cacifos, Lanche, Monitores, Festas a Acabar, Clientes, Relatórios + Configurações (8 subpáginas).
- **RECEÇÃO**: Festas (Todas / A decorrer / Bolos), Entradas Livres (Todas / A decorrer), A Decorrer, Cauções, Calendário, Cacifos (leitura), Clientes (leitura). Sem Dashboard, Configurações, Lanche, Monitores, Festas a Acabar, Relatórios.
- **STAFF**: Festas (Todas / A decorrer / Bolos, leitura), Entradas Livres (leitura), A Decorrer, Cauções, Calendário, Cacifos (escrita), Festas a Acabar (leitura). Sem Dashboard, Clientes, Configurações, Lanche, Monitores, Relatórios.
- **CACIFOS**: apenas Cacifos (escrita). As páginas de festas/entradas/cauções/bolos abrem por URL em modo leitura simplificado (sem colunas de preço/caução/pagamento; nas entradas mantém a coluna Saída).
- **LANCHE**: apenas Lanche (escrita). O nível `menus: leitura` alimenta os dados dentro da página de Lanche (não há página de menus no menu - "Menus & Extras" vive em Configurações, só admin).
- **MONITOR**: apenas Monitores (leitura - Gantt + notas diárias escritas pelo admin).
- **FESTAS ACABAR**: apenas Festas a Acabar (escrita - tabela EM_CURSO, brindes/lesões e Modo Ecrã TV com as 3 abas).

### 5.5 Observações da análise

1. **Coesão com o guião**: o mapa confirma a secção 3 (análise por papel) - nenhuma contradição encontrada entre o que o documento descreve e o que o código garante.
2. **Páginas client sem guarda server** (`/lanche`, `/cacifos`, `/calendario`, `/relatorios`): a proteção real está na API/serviços e no menu. Funciona, mas por defesa em profundidade poderia acrescentar-se o mesmo padrão `hasAccess()` + redirect usado nas restantes páginas (melhoria opcional, não bloqueante).
3. **Página raiz `/`**: redireciona sempre para a home do papel (`getHomeRoute`) - cada utilizador cai na "sua" página após login.
4. **Modo "cacifos" bem aplicado**: o `mode` é decidido no server (`page.tsx`) conforme a função, com as colunas pagamento/caução filtradas na tabela de festas e `hidePrices` no modal de detalhe - como descrito na secção 2.7 deste guião.
5. **Módulo Divulgações/Campanhas REMOVIDO** (19/09/2026): a página `/divulgacoes` era um protótipo não funcional (sem link no menu; o botão "Enviar" falhava sempre porque o form nunca enviava um `segmentoId` real; e não existia integração de envio MailJet/SMTP/SMS - o serviço apenas registava linhas na BD). Foi apagado: página, componente, `API /api/campanhas`, `campanha.service.ts`, `use-campanhas.ts`, `lib/api/campanhas.ts` e o respetivo teste; o módulo `divulgacoes` saiu da matriz de permissões. **O marketing real mantém-se**: emails automáticos de aniversário (`marketing.service.ts` + `/api/emails/aniversarios` + card no dashboard), fila de emails com retry e a página **Configurações → Newsletter** (agora funcional: lista segmentos e sincroniza o segmento "Aniversariantes"). Os models `Campanha`/`EnvioCampanha`/`Segmento`/`ContactoSegmento` permanecem na BD (cleanup por migração própria, se necessário).
