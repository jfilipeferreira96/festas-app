/**
 * Changes seed - dados demo para verificação rápida das alterações
 * dos vídeos 4, 5, 6 e 9 (fecho de caixa, extras, alertas, lanche,
 * festas-acabar / balcão).
 *
 * Complementa o seed-dev (não o substitui): cria apenas os cenários
 * de alerta que faltavam. Seguro correr mais que uma vez (upserts).
 *
 * Cenários criados (todos com ID prefixado "v9-"):
 *   1. Festa EM_CURSO hoje NÃO PAGA        → row vermelha + banner balcão
 *   2. Festa EM_CURSO hoje EXCEDIDA (paga) → row vermelha + banner balcão
 *   3. Entrada ATIVA não paga, lanche por confirmar → row vermelha + card
 *   4. Entrada ATIVA paga, lanche confirmado (TERMINADO)
 *   5. Entrada ATIVA excedida e não paga (duplo alerta)
 *
 * Correr: npm run db:seed:changes
 */

import { config } from "dotenv";
import { createPrismaClient } from "../src/mariadb-adapter";

config({ path: "../../apps/web/.env" });

// Driver adapter (mariadb) - ver packages/db/src/mariadb-adapter.ts
const prisma = createPrismaClient(process.env.DATABASE_URL!);

// ─── Helpers ──────────────────────────────────────────────────
function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function addMin(d: Date, min: number): Date {
  return new Date(d.getTime() + min * 60_000);
}

async function main() {
  const now = new Date();
  const hoje = today();

  // ─── BaseCobranca: marcar extras por pessoa em BDs já semeadas ───
  await prisma.extra.updateMany({
    where: { id: { in: ["extra-diversao-brinde", "extra-diversao-boloes", "extra-diversao-prol1h", "extra-diversao-prol30m"] } },
    data: { baseCobranca: "POR_PESSOA" }
      });

  // ─── Dependências mínimas (upsert - funciona com ou sem seed-dev) ───
  await prisma.cliente.upsert({
    where: { id: "cliente-v9-001" },
    update: {},
    create: { id: "cliente-v9-001", nome: "Cliente Demo V9", telefone: "900000000" }
      });
  await prisma.local.upsert({
    where: { id: "local-v9-001" },
    update: {},
    create: { id: "local-v9-001", nome: "Sala Demo V9" }
      });
  await prisma.extra.upsert({
    where: { id: "extra-v9-lanche" },
    update: {},
    create: {
      id: "extra-v9-lanche",
      nome: "Pipocas Extra V9",
      precoUnitario: 2.5,
      categoria: "EXTRA",
      subcategoria: "Extras ao lanche"
      }
      });
  await prisma.extra.upsert({
    where: { id: "extra-v9-normal" },
    update: {},
    create: { id: "extra-v9-normal", nome: "Palhaçada V9", precoUnitario: 40.0, categoria: "EXTRA" }
      });

  // ═══════════════════════════════════════════════════════════
  // 1) Festa EM_CURSO hoje NÃO PAGA
  //    Começou há 45 min, dura 135 min → dentro do tempo, por pagar.
  // ═══════════════════════════════════════════════════════════
  const v9aInicio = addMin(now, -45);
  await prisma.reserva.upsert({
    where: { id: "reserva-v9-001" },
    update: {
      estado: "EM_CURSO",
      inicioEm: v9aInicio,
      fimPrevisto: addMin(v9aInicio, 135),
      fimReal: null,
      pago: false
      },
    create: {
      id: "reserva-v9-001",
      data: hoje,
      horario: "15:00",
      duracaoMinutos: 135,
      numCriancas: 12,
      estado: "EM_CURSO",
      inicioEm: v9aInicio,
      fimPrevisto: addMin(v9aInicio, 135),
      tema: "Piratas",
      bolo: "NOSSO_1KG",
      boloTema: "Bolo de chocolate com barco pirata",
      observacoesLesoes: "Tiago tem braceira no braço esquerdo - evitar piscina de bolas.",
      notasCacifos: "Cacifos 20 e 21: alergia a glúten (separar bolo). Cacifo 22: meias em falta.",
      valorTotal: 0,
      pago: false,
      clienteId: "cliente-v9-001",
      localId: "local-v9-001"
      }
      });
  // Extras: um cumprido, outro não (demo da coluna com checks)
  await prisma.reservaExtra.upsert({
    where: { id: "rext-v9-001-1" },
    update: {},
    create: { id: "rext-v9-001-1", reservaId: "reserva-v9-001", extraId: "extra-v9-normal", quantidade: 1, concluido: true }
      });
  await prisma.reservaExtra.upsert({
    where: { id: "rext-v9-001-2" },
    update: {},
    create: { id: "rext-v9-001-2", reservaId: "reserva-v9-001", extraId: "extra-v9-lanche", quantidade: 12, concluido: false }
      });

  // ═══════════════════════════════════════════════════════════
  // 2) Festa EM_CURSO hoje EXCEDIDA (já passou o fimPrevisto)
  //    Começou há 160 min, dura 135 min → excedeu há 25 min. Paga.
  // ═══════════════════════════════════════════════════════════
  const v9bInicio = addMin(now, -160);
  await prisma.reserva.upsert({
    where: { id: "reserva-v9-002" },
    update: {
      estado: "EM_CURSO",
      inicioEm: v9bInicio,
      fimPrevisto: addMin(v9bInicio, 135),
      fimReal: null
      },
    create: {
      id: "reserva-v9-002",
      data: hoje,
      horario: "12:00",
      duracaoMinutos: 135,
      numCriancas: 10,
      estado: "EM_CURSO",
      inicioEm: v9bInicio,
      fimPrevisto: addMin(v9bInicio, 135),
      tema: "Dinossáurios",
      bolo: "NOSSO_2KG",
      observacoesLesoes: "Sem lesões registadas.",
      notasCacifos: "Cacifos 30-32: saída apenas com os pais.",
      valorTotal: 150,
      pago: true,
      clienteId: "cliente-v9-001",
      localId: "local-v9-001"
      }
      });
  await prisma.reservaExtra.upsert({
    where: { id: "rext-v9-002-1" },
    update: {},
    create: { id: "rext-v9-002-1", reservaId: "reserva-v9-002", extraId: "extra-v9-lanche", quantidade: 10, concluido: false }
      });

  // ═══════════════════════════════════════════════════════════
  // 3) Entrada ATIVA não paga, lanche por confirmar
  //    Termina dentro de 40 min → alerta "por pagar" (não excedida).
  // ═══════════════════════════════════════════════════════════
  const v9e1Inicio = addMin(now, -80);
  await prisma.entradaLivre.upsert({
    where: { id: "entrada-v9-001" },
    update: { estado: "ATIVA", fimReal: null, estadoLanche: "NAO_INICIADO", pago: false },
    create: {
      id: "entrada-v9-001",
      encarregadoNome: "Helena Por-Pagar",
      encarregadoTelefone: "912345678",
      duracaoMinutos: 120,
      custoHora: 10.0,
      custoTotal: 20.0,
      inicioEm: v9e1Inicio,
      fimPrevisto: addMin(v9e1Inicio, 120),
      estado: "ATIVA",
      temLanche: true,
      estadoLanche: "NAO_INICIADO",
      criancas: [{ nome: "Duarte", idade: 6 }, { nome: "Vitória", idade: 4 }],
      pago: false
      }
      });

  // ═══════════════════════════════════════════════════════════
  // 4) Entrada ATIVA paga, lanche JÁ confirmado (TERMINADO)
  // ═══════════════════════════════════════════════════════════
  const v9e2Inicio = addMin(now, -30);
  await prisma.entradaLivre.upsert({
    where: { id: "entrada-v9-002" },
    update: { estado: "ATIVA", fimReal: null, estadoLanche: "TERMINADO", pago: true },
    create: {
      id: "entrada-v9-002",
      encarregadoNome: "Rui Lanche-Ok",
      encarregadoTelefone: "913456789",
      duracaoMinutos: 90,
      custoHora: 10.0,
      custoTotal: 15.0,
      inicioEm: v9e2Inicio,
      fimPrevisto: addMin(v9e2Inicio, 90),
      estado: "ATIVA",
      temLanche: true,
      estadoLanche: "TERMINADO",
      criancas: [{ nome: "Salvador", idade: 5 }],
      pago: true
      }
      });

  // ═══════════════════════════════════════════════════════════
  // 5) Entrada ATIVA excedida E não paga (duplo alerta)
  //    Fim previsto passou há 20 min.
  // ═══════════════════════════════════════════════════════════
  const v9e3Inicio = addMin(now, -110);
  await prisma.entradaLivre.upsert({
    where: { id: "entrada-v9-003" },
    update: { estado: "ATIVA", fimReal: null, pago: false },
    create: {
      id: "entrada-v9-003",
      encarregadoNome: "Marta Excedida",
      encarregadoTelefone: "914567890",
      duracaoMinutos: 90,
      custoHora: 12.0,
      custoTotal: 18.0,
      inicioEm: v9e3Inicio,
      fimPrevisto: addMin(v9e3Inicio, 90),
      estado: "ATIVA",
      temLanche: false,
      criancas: [{ nome: "Álvaro", idade: 7 }, { nome: "Nuno", idade: 3 }],
      pago: false
      }
      });

  // ═══════════════════════════════════════════════════════════
  // 6) LEDGER DE PAGAMENTOS - festas de HOJE com pagamentos para
  //    testar a nova UI (lista, falta pagar, pago derivado).
  // ═══════════════════════════════════════════════════════════

  // 6a) Festa LIQUIDADA: 100€ DINHEIRO + 50€ MBWAY (total 150€)
  const v10aInicio = addMin(now, -30);
  await prisma.reserva.upsert({
    where: { id: "reserva-v10-001" },
    update: { pago: true },
    create: {
      id: "reserva-v10-001",
      data: hoje,
      horario: "15:00",
      duracaoMinutos: 135,
      numCriancas: 12,
      estado: "CONFIRMADO",
      inicioEm: v10aInicio,
      fimPrevisto: addMin(v10aInicio, 135),
      tema: "Bailarinas",
      bolo: "NOSSO_1KG",
      valorTotal: 150,
      pago: true,
      clienteId: "cliente-v9-001",
      localId: "local-v9-001",
      pagamentos: {
        create: [
          { valor: 100, metodo: "DINHEIRO" },
          { valor: 50, metodo: "MBWAY" },
        ],
      },
    },
  });

  // 6b) Festa PARCIALMENTE paga: sinal 50€ MBWAY de 200€ (Falta pagar 150€)
  const v10bInicio = addMin(now, 60);
  await prisma.reserva.upsert({
    where: { id: "reserva-v10-002" },
    update: { pago: false },
    create: {
      id: "reserva-v10-002",
      data: hoje,
      horario: "18:00",
      duracaoMinutos: 135,
      numCriancas: 15,
      estado: "CONFIRMADO",
      inicioEm: v10bInicio,
      fimPrevisto: addMin(v10bInicio, 135),
      tema: "Super-heróis",
      bolo: "PAIS_TRAZEM",
      valorTotal: 200,
      pago: false,
      clienteId: "cliente-v9-001",
      localId: "local-v9-001",
      pagamentos: {
        create: [{ valor: 50, metodo: "MBWAY", nota: "Sinal" }],
      },
    },
  });

  // 6c) Entrada livre HOJE liquidada com 2 métodos (12€ DINHEIRO + 8€ MBWAY)
  const v10cInicio = addMin(now, -45);
  await prisma.entradaLivre.upsert({
    where: { id: "entrada-v10-001" },
    update: { pago: true },
    create: {
      id: "entrada-v10-001",
      encarregadoNome: "Inês Ledger",
      encarregadoTelefone: "916000000",
      duracaoMinutos: 60,
      custoHora: 10.0,
      custoTotal: 20.0,
      inicioEm: v10cInicio,
      fimPrevisto: addMin(v10cInicio, 60),
      estado: "ATIVA",
      temLanche: false,
      criancas: [{ nome: "Alice", idade: 5 }],
      pago: true,
      pagamentos: {
        create: [
          { valor: 12, metodo: "DINHEIRO" },
          { valor: 8, metodo: "MBWAY" },
        ],
      },
    },
  });

  console.log("✅ Seed de alterações (vídeos 4/5/6/9 + ledger v10) aplicado:");
  console.log("   • reserva-v9-001  - festa EM_CURSO hoje NÃO PAGA (extras: 1 ✓ 1 ○)");
  console.log("   • reserva-v9-002  - festa EM_CURSO hoje EXCEDIDA (paga)");
  console.log("   • entrada-v9-001  - entrada ATIVA não paga, lanche por confirmar");
  console.log("   • entrada-v9-002  - entrada ATIVA paga, lanche TERMINADO");
  console.log("   • entrada-v9-003  - entrada ATIVA excedida e não paga");
  console.log("   • reserva-v10-001 - festa HOJE LIQUIDADA (ledger: 100€ + 50€)");
  console.log("   • reserva-v10-002 - festa HOJE com sinal 50€ (Falta pagar 150€)");
  console.log("   • entrada-v10-001 - entrada HOJE liquidada (12€ + 8€)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
