/**
 * Esvazia todas as tabelas da BD atual por ordem de dependência de FK
 * (filhos → pais), para os seeds serem idempotentes (re-executáveis).
 *
 * Porque NÃO `TRUNCATE`?
 * - `TRUNCATE` no pai falha (erro 1701) enquanto existir QUALQUER tabela filha
 *   com FK para ele — mesmo vazia — a menos que `FOREIGN_KEY_CHECKS = 0`.
 * - `SET FOREIGN_KEY_CHECKS` é variável de SESSÃO: com o pool do driver adapter
 *   (mariadb), o SET e os TRUNCATEs correm em ligações diferentes.
 *
 * Solução: `DELETE FROM` valida FKs por LINHAS — basta esvaziar os filhos
 * primeiro (ordem topológica), sem qualquer estado de sessão. O contador
 * `AUTO_INCREMENT` é reposto com `ALTER TABLE ... AUTO_INCREMENT = 1`.
 */

type RawRow = Record<string, unknown>;

export interface WipePrismaClient {
  $queryRawUnsafe: (query: string) => Promise<unknown>;
  $executeRawUnsafe: (query: string) => Promise<unknown>;
}

const cell = (row: RawRow, ...keys: string[]): string => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) return String(value);
  }
  return "";
};

export async function wipeDatabase(prisma: WipePrismaClient): Promise<void> {
  console.log("🧹 Wiping existing data...");

  const tableRows = (await prisma.$queryRawUnsafe(
    `SELECT TABLE_NAME, AUTO_INCREMENT FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE';`,
  )) as RawRow[];

  const remaining = new Set<string>();
  const autoInc = new Set<string>();
  for (const row of tableRows) {
    const name = cell(row, "TABLE_NAME", "table_name");
    if (!name) continue;
    remaining.add(name);
    if (cell(row, "AUTO_INCREMENT", "auto_increment") !== "") autoInc.add(name);
  }
  const total = remaining.size;

  // FKs: (filho → pai). O filho tem de ser esvaziado antes do pai.
  const fkRows = (await prisma.$queryRawUnsafe(
    `SELECT TABLE_NAME AS child, REFERENCED_TABLE_NAME AS parent
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL;`,
  )) as RawRow[];

  const childrenOf = new Map<string, Set<string>>();
  for (const row of fkRows) {
    const child = cell(row, "child", "CHILD", "TABLE_NAME", "table_name");
    const parent = cell(row, "parent", "PARENT", "REFERENCED_TABLE_NAME", "referenced_table_name");
    if (!remaining.has(child) || !remaining.has(parent)) continue;
    if (!childrenOf.has(parent)) childrenOf.set(parent, new Set());
    childrenOf.get(parent)!.add(child);
  }

  const wipeTable = async (table: string) => {
    await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\`;`);
    if (autoInc.has(table)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1;`);
    }
    remaining.delete(table);
  };

  // Passadas sucessivas: esvazia primeiro as tabelas sem filhos pendentes (folhas).
  let progress = true;
  while (remaining.size > 0 && progress) {
    progress = false;
    for (const table of [...remaining]) {
      const children = childrenOf.get(table);
      if (children && [...children].some((c) => remaining.has(c))) continue;
      await wipeTable(table);
      progress = true;
    }
  }

  // Ciclos de FK (raro): esvazia o restante sem ordem garantida.
  for (const table of [...remaining]) {
    await wipeTable(table);
  }

  console.log(`  ✓ ${total} tables wiped\n`);
}
