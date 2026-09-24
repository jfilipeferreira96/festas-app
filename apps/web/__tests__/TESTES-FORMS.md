# Testes de Frontend + REST (Forms de Festas e Entradas Livres)

> Guia em português para perceber o que foi acrescentado, para que serve cada
> tecnologia e como funcionam os padrões usados. Pensado para quem está a
> começar com testes em React.

---

## 1. O que foi feito (resumo)

Antes desta alteração, os 588 testes do projeto só testavam **serviços** (base
de dados real) e **cálculos puros**. Nada testava os formulários nem as rotas
HTTP. Foram acrescentados **101 testes novos** em 3 níveis (total da suíte:
**689 testes a verde**):

| Nível | O que testa | Ficheiros novos |
|-------|-------------|-----------------|
| **1 — Lógica pura** | As funções dos schemas dos forms (sem renderizar nada): construir payloads, defaults de edição, estimativas de preço | `__tests__/forms/festa-form.schema.test.ts`, `__tests__/forms/entrada-livre-form.schema.test.ts` |
| **2 — Componentes React** | O comportamento dos forms renderizados num browser falso: cadeados de extras obrigatórios, totais, modais de pagamento | `__tests__/forms/FestaForm.test.tsx`, `EntradaLivreForm.test.tsx`, `PagamentoModal.test.tsx`, `EntradaLivrePagamentoModal.test.tsx` |
| **3 — Rotas REST** | Os handlers de `/api/reservas` e `/api/entradas-livres` com base de dados real de teste: status codes (201/400/401/404/409/500) e a matriz de erros | `__tests__/api/reservas.routes.test.ts`, `__tests__/api/entrada-livre.routes.test.ts` |

Mais 2 ficheiros de apoio (helpers) e alterações de configuração:

| Ficheiro | Papel |
|----------|-------|
| `__tests__/helpers/form-fixtures.ts` | Dados de exemplo reutilizáveis (config de preços, extras, slots, salas, reservas, entradas) |
| `__tests__/helpers/render-form.tsx` | Utilitários para renderizar componentes em testes (QueryClient, formato €, abrir dropdowns) |
| `vitest.config.ts` | Passou a aceitar testes `.tsx` (componentes) além de `.ts` |
| `package.json` + `package-lock.json` | Novas devDependencies (só para testes, não afetam a app) |

---

## 2. As tecnologias instaladas (e o que cada uma faz)

Instaladas como `devDependencies` do `apps/web` (nunca entram no build de
produção):

### `jsdom`
Um **browser falso que corre dentro do Node**. Os componentes React precisam de
um DOM (document, window, eventos…) para existir. O jsdom finge esse DOM.
- Os testes de **serviços** continuam a correr em Node puro (rápido, sem DOM).
- Os testes de **componentes** ativam o jsdom só para si, com uma linha no topo
  do ficheiro:
  ```ts
  // @vitest-environment jsdom
  ```

### `@testing-library/react` (v16, compatível com React 19)
A ferramenta que **renderiza componentes** dentro do jsdom e dá utilidades para
lhes aceder. O lema da biblioteca: testar como o utilizador vê, não como o código
é por dentro.
```tsx
render(<FestaForm onClose={vi.fn()} />);          // desenha o componente
await screen.findByText("Seleccionar slot");      // procura texto no ecrã
```
Depende do `@testing-library/dom` (motor de pesquisas, instalado também).

### `@testing-library/user-event`
**Simula cliques e escrita reais** do utilizador (com todos os eventos
intermédios que um browser dispararia). É o sucessor recomendado do `fireEvent`.
```ts
const user = userEvent.setup();
await user.type(screen.getByPlaceholderText("Email"), "ana@teste.pt");
await user.click(screen.getByRole("button", { name: "Criar Reserva" }));
```

### `@testing-library/jest-dom`
**Matchers extra** para as asserções ficarem legíveis:
```ts
expect(botao).toBeDisabled();
expect(screen.getByText("obrigatório")).toBeInTheDocument();
expect(input).toHaveAttribute("aria-pressed", "true");
```
Ativado em cada ficheiro de componente com `import "@testing-library/jest-dom/vitest";`.

### (Já existia) `vitest`
O corredor de testes — equivalente ao Jest, mas integrado com o Vite. O que foi
configurado: `include` de `*.test.{ts,tsx}` e transformação de JSX (`esbuild.jsx: "automatic"`).

---

## 3. Como correr

```bash
npm test                  # suíte completa (precisa do MySQL ligado p/ testes de serviços + rotas)
npx vitest run __tests__/forms          # só os testes de forms (não precisa de BD)
npx vitest run __tests__/forms/FestaForm.test.tsx   # um ficheiro
npx vitest run -t "slot ocupado"        # um teste pelo nome
```

---

## 4. Os padrões usados (explicados)

### 4.1 Mocks de API em vez de rede (`vi.mock`)
Nos testes de componente, **ninguém fala com o servidor**. Os módulos de API
(`@/lib/api/*`) são substituídos por funções falsas que devolvem as fixtures:

```ts
vi.mock("@/lib/api/reservas", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/reservas")>();
  return { ...actual, reservasApi: { ...actual.reservasApi, create: vi.fn() } };
});

// no teste:
vi.mocked(reservasApi.create).mockResolvedValue(reservaFixture);
// ... clicar "Criar Reserva" ...
expect(vi.mocked(reservasApi.create)).toHaveBeenCalledWith(expect.objectContaining({ horario: "11:00" }));
```
Os **hooks TanStack continuam reais** — só a camada de rede é falsa. Assim
testamos o comportamento verdadeiro dos componentes.

### 4.2 Fixtures (`form-fixtures.ts`)
Objetos com dados realistas partilhados por todos os testes: o menu Landy
(16,50 €), o suplemento "Almoço / Jantar" (3 €), o slot 11:00 de FDS com
`extrasObrigatorios`, salas A/B, uma reserva de 148 € para a modal de
pagamento, etc. Datas **fixas** (quarta 2026-09-23 e sábado 2026-09-26) para os
testes nunca dependerem do dia em que correm.

### 4.3 Stubs
- **DatePicker**: o `flatpickr` (calendário) não funciona em jsdom → o módulo é
  substituído por um `<input>` simples que dispara o mesmo `onChange`.
- **ClienteSearchModal**: fora de âmbito → substituída por `() => null`.
- **`@/hooks/use-toast`** e **AuthContext**: substituídos por espiões
  (`vi.fn()`) para poder afirmar `expect(toast.success).toHaveBeenCalledWith(...)`.

### 4.4 Rotas REST com BD real (`__tests__/api/`)
Seguem o padrão dos testes de serviços: `vi.mock("@festas/db")` → `testPrisma`
(base `festas_test`), seed no `beforeAll`, limpeza no `afterAll`. A novidade é
o mock do `requireAuth` (com `vi.hoisted` para poder alternar entre autenticado
e 401) e o `NextRequest` construído à mão:
```ts
new NextRequest("http://localhost/api/reservas", { method: "POST", body: JSON.stringify(payload) });
const res = await POST(request);
expect(res.status).toBe(409);
```

---

## 5. Armadilhas que apanhámos (útil para o futuro)

1. **Hoisting do `vi.mock`**: as fábricas de mock são movidas para o topo do
   ficheiro — não podem usar variáveis importadas. Daí os stubs estarem
   escritos *dentro* da fábrica e o estado de auth usar `vi.hoisted()`.
2. **Espaços não-quebráveis (NBSP)**: `Intl.NumberFormat("pt-PT")` formata
   "148,00 €" com um NBSP (U+00A0) antes do €. Numa asserção de *textContent*
   (raw), convém normalizar: `.replace(/\u00a0/g, " ")`.
3. **`getByText` só lê nós de texto diretos**: se o texto está partido por
   `<span>` filhos (ex.: `A pagar <span>148,00 €</span>`), um `getByText`
   com o texto completo não encontra o pai. Solução: obter o elemento por um
   pedaço que esteja num único nó de texto e ler `.textContent`.
4. **Selects em portais**: o dropdown do `Select` custom renderiza em
   `document.body` (fora do componente). Usar `within(document.body)` para
   procurar opções (ver `escolherOpcaoSelect` no helper).

---

## 6. O que fica de fora (fase futura)

- Playwright/E2E (testes de browser real, ponta-a-ponta)
- Testes visuais / regressão de pixels
- Coverage thresholds

---

## 7. Nota sobre `.next-root-bak-festas`

Durante o trabalho, o `npm run dev` não arrancava porque
`apps/web/.next/diagnostics/` continha ficheiros criados como **root**
(talvez por um build/run com sudo). A pasta foi movida para fora do projeto:
`~/.next-root-bak-festas`. É só cache de build — pode ser apagada com:
```bash
sudo rm -rf ~/.next-root-bak-festas
```
