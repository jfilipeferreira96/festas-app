/**
 * Backfill do ledger de pagamentos (RAW SQL - robusto antes/depois do push).
 *
 * Converte os campos legados de pagamento (valor_pago/valor_pago2 +
 * metodo_pagamento/metodo_pagamento2) em entradas da tabela `pagamento`.
 *
 * ⚠️ ORDEM DE OPERAÇÕES EM PRODUÇÃO:
 *   1. Correr ESTE script ANTES do deploy que remove as colunas
 *      (`npm run db:backfill:pagamentos`).
 *   2. Depois `db:push` com o schema novo (remove as colunas legadas).
 *
 * Idempotente: se as colunas legadas já não existirem (ou não houver
 * registos por migrar), termina sem fazer nada.
 */

import { config } from "dotenv";
import { createPrismaClient } from "../src/mariadb-adapter";

config({ path: "../../apps/web/.env" });

const prisma = createPrismaClient(process.env.DATABASE_URL!);

// Identificadores SQL usados - apenas constantes internas (nunca input)
const COL_V1 = "valor_pago";
const COL_V2 = "valor_pago2";
const COL_M1 = "metodo_pagamento";
const COL_M2 = "metodo_pagamento2";

/** Verifica se uma coluna existe numa tabela (INFORMATION_SCHEMA). */
async function colunaExiste(tabela: string, coluna: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ n: number }>>(
    "SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    tabela,
    coluna
  );
  return Number(rows[0]?.n ?? 0) > 0;
}

async function backfillTabela(
  tabela: "reserva" | "entrada_livre",
  alvoColSql: "reserva_id" | "entrada_livre_id"
): Promise<number> {
  const temV1 = await colunaExiste(tabela, COL_V1);
  const temV2 = await colunaExiste(tabela, COL_V2);
  const temMet1 = await colunaExiste(tabela, COL_M1);
  const temMet2 = await colunaExiste(tabela, COL_M2);

  if (!temV1 && !temV2) {
    console.log(`• ${tabela}: colunas legadas não existem - nada a migrar.`);
    return 0;
  }

  const met1 = temMet1 ? COL_M1 : "NULL";
  const met2 = temMet2 ? COL_M2 : "NULL";
  const v1 = temV1 ? COL_V1 : "NULL";
  const v2 = temV2 ? COL_V2 : "NULL";

  // Registos com pagamento legado que ainda NÃO têm entradas no ledger.
  // Identificadores vêm de constantes internas (seguro); valores por parâmetro.
  const idsLegados = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM \`${tabela}\` t
     WHERE (t.${v1} IS NOT NULL AND t.${v1} > 0)
        OR (t.${v2} IS NOT NULL AND t.${v2} > 0)
     AND NOT EXISTS (SELECT 1 FROM pagamento p WHERE p.${alvoColSql} = t.id)`
  );

  let migrados = 0;
  for (const { id } of idsLegados) {
    const linha = await prisma.$queryRawUnsafe<
      Array<{ v1: string | number | null; m1: string | null; v2: string | number | null; m2: string | null }>
    >(
      `SELECT t.${v1} AS v1, t.${met1} AS m1, t.${v2} AS v2, t.${met2} AS m2
       FROM \`${tabela}\` t WHERE t.id = ?`,
      id
    );
    const l = linha[0];
    if (!l) continue;

    const pagamentos: Array<{ valor: number; metodo: string }> = [];
    if (Number(l.v1 ?? 0) > 0) pagamentos.push({ valor: Number(l.v1), metodo: String(l.m1 ?? "OUTRO") });
    if (Number(l.v2 ?? 0) > 0) pagamentos.push({ valor: Number(l.v2), metodo: String(l.m2 ?? "OUTRO") });
    if (pagamentos.length === 0) continue;

    const soma = Math.round(pagamentos.reduce((s, p) => s + p.valor, 0) * 100) / 100;

    await prisma.$transaction(async (tx) => {
      await tx.pagamento.createMany({
        data: pagamentos.map((p) => ({
          valor: p.valor,
          metodo: p.metodo as never,
          nota: "Migrado",
          [alvoColSql === "reserva_id" ? "reservaId" : "entradaLivreId"]: id,
        })),
      });
      // Normalizar total acordado em registos antigos (só reservas)
      if (tabela === "reserva") {
        await tx.$executeRawUnsafe(
          "UPDATE reserva SET valor_total = COALESCE(valor_total, ?) WHERE id = ?",
          soma,
          id
        );
      }
    });
    migrados += 1;
  }
  return migrados;
}

async function main() {
  const reservas = await backfillTabela("reserva", "reserva_id");
  const entradas = await backfillTabela("entrada_livre", "entrada_livre_id");
  console.log(`✅ Backfill concluído: ${reservas} reservas e ${entradas} entradas livres migradas para o ledger.`);
}

main()
  .catch((err) => {
    console.error("❌ Backfill falhou:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
