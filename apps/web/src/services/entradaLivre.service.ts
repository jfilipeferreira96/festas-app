import prisma from "@festas/db";
import { Prisma } from "@prisma/client";
import type { MetodoPagamento } from "@prisma/client";
import { configuracaoPrecoService } from "@/services/configuracaoPreco.service";
import { cacifoService } from "@/services/cacifo.service";

interface CriancaInput {
  nome: string;
  idade?: number;
  querLanche?: boolean;
}

interface CriarEntradaLivreDTO {
  criancas: CriancaInput[];
  encarregadoNome: string;
  encarregadoTelefone: string;
  encarregadoEmail?: string;
  duracaoMinutos: number;
  custoTotal?: number;
  metodoPagamento?: MetodoPagamento;
  pago?: boolean;
  cacifoId?: string;
  extrasIds?: string[];
  extrasQuantidades?: Record<string, number>;
  observacoes?: string;
  observacoesLesoes?: string;
  // Lanche
  temLanche?: boolean;
  horaLanche?: string;
  // Adultos (encarregados que acompanham e pagam)
  numAdultos?: number;
  valorPago?: number; // Valor recebido no pagamento 1
  // Pagamento dividido (até 2 métodos)
  metodoPagamento2?: MetodoPagamento;
  valorPago2?: number;
  // Meias (compra obrigatória)
  meiasQuantidade?: number;
  meiasPrecoUnit?: number;
}

// ── Helper: encontrar ou criar Cliente a partir do encarregado ──
// Garante que todos os encarregados entram na base de contactos (marketing).
async function findOrCreateCliente(
  nome: string,
  telefone: string,
  email?: string
): Promise<string> {
  // 1. Procurar por email (se fornecido) - email é @unique
  if (email && email.trim()) {
    const byEmail = await prisma.cliente.findFirst({ where: { email: email.trim() } });
    if (byEmail) return byEmail.id;
  }
  // 2. Procurar por telefone
  const byTel = await prisma.cliente.findFirst({ where: { telefone } });
  if (byTel) return byTel.id;
  // 3. Criar novo cliente
  const novo = await prisma.cliente.create({
    data: {
      nome,
      telefone,
      email: email && email.trim() ? email.trim() : null,
    },
  });
  return novo.id;
}

/**
 * Regista as crianças de uma entrada livre como filhos (Aniversariante) do cliente,
 * para que fiquem disponíveis para avisos de aniversário. Evita duplicados por nome.
 * Como a entrada livre só recolhe `idade`, a dataNascimento fica nula (a completar depois).
 */
async function registarCriancasComoAniversariantes(
  clienteId: string,
  criancas: CriancaInput[]
): Promise<void> {
  const nomesValidos = criancas
    .map((c) => c.nome?.trim())
    .filter((n): n is string => !!n && n.length > 0);
  if (nomesValidos.length === 0) return;

  // Nomes já registados como filhos deste cliente
  const existentes = await prisma.aniversariante.findMany({
    where: { clienteId },
    select: { nome: true },
  });
  const nomesExistentes = new Set(existentes.map((a) => a.nome.toLowerCase()));

  const novos = nomesValidos.filter((n) => !nomesExistentes.has(n.toLowerCase()));
  if (novos.length === 0) return;

  await prisma.aniversariante.createMany({
    data: novos.map((nome) => ({ nome, clienteId })),
  });
}

// ── Helper: contar crianças com lanche ──
// O lanche é granular: cada criança tem a sua flag (querLanche).
// Registos antigos sem flag contam como "quer lanche" (retrocompatibilidade).
function contarCriancasComLanche(criancas: CriancaInput[], temLanche: boolean | undefined): number {
  if (!temLanche) return 0;
  return criancas.filter((c) => c.querLanche !== false).length;
}

function quantidadeDeExtra(quantidades: Record<string, number> | undefined, extraId: string) {
  const q = quantidades?.[extraId];
  return Math.max(1, Math.round(q ?? 1));
}

async function calcularCustoExtras(
  itens: { extraId: string; quantidade: number }[],
  numPessoas: number
): Promise<number> {
  if (itens.length === 0) return 0;
  const extrasData = await prisma.extra.findMany({
    where: { id: { in: itens.map((i) => i.extraId) } },
    select: { id: true, precoUnitario: true, baseCobranca: true },
  });
  const porId = new Map(extrasData.map((ex) => [ex.id, ex]));
  return itens.reduce((acc, item) => {
    const ex = porId.get(item.extraId);
    if (!ex) return acc;
    const qtd = ex.baseCobranca === "POR_PESSOA" ? numPessoas : item.quantidade;
    return acc + Number(ex.precoUnitario) * qtd;
  }, 0);
}

export const entradaLivreService = {
  // ── Listar entradas livres ──────────────────────
  async list(filtros?: {
    estado?: string;
    data?: string;
    dataInicio?: string;
    dataFim?: string;
    dataConclusao?: string;
    pesquisa?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filtros?.estado) where.estado = filtros.estado;

    // Filtro por data específica de conclusão (fimReal)
    if (filtros?.dataConclusao) {
      const date = new Date(filtros.dataConclusao + "T00:00:00.000Z");
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.fimReal = { gte: date, lt: nextDay };
    }

    // Filtro por data específica (hoje, amanhã, etc.)
    if (filtros?.data) {
      const date = new Date(filtros.data + "T00:00:00.000Z");
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.inicioEm = { gte: date, lt: nextDay };
    }

    // Filtro por intervalo de datas
    if (!filtros?.data && (filtros?.dataInicio || filtros?.dataFim)) {
      const dateFilter: Record<string, Date> = {};
      if (filtros.dataInicio) dateFilter.gte = new Date(filtros.dataInicio + "T00:00:00.000Z");
      if (filtros.dataFim) dateFilter.lt = new Date(filtros.dataFim + "T00:00:00.000Z");
      where.inicioEm = dateFilter;
    }

    // Pesquisa por nome do encarregado ou nome das crianças (JSON field)
    if (filtros?.pesquisa) {
      const termo = filtros.pesquisa.trim();
      where.OR = [
        { encarregadoNome: { contains: termo } },
        { encarregadoTelefone: { contains: termo } },
      ];
    }

    const entradas = await prisma.entradaLivre.findMany({
      where,
      include: {
        cacifo: { select: { id: true, numero: true, nome: true, estado: true } },
        cliente: { select: { id: true, nome: true, email: true, telefone: true } },
        extras: {
          include: { extra: { select: { id: true, nome: true, precoUnitario: true, baseCobranca: true } } },
        },
      },
      orderBy: { inicioEm: "desc" },
    });

    // Client-side filter for criança names (JSON field - Prisma can't search inside JSON easily)
    let resultado = entradas.map((e: any) => ({
      ...e,
      custoHora: Number(e.custoHora),
      custoTotal: Number(e.custoTotal),
      valorPago: e.valorPago != null ? Number(e.valorPago) : null,
      custoExcesso: e.custoExcesso ? Number(e.custoExcesso) : null,
      custoTotalFinal: e.custoTotalFinal ? Number(e.custoTotalFinal) : null,
    }));

    if (filtros?.pesquisa) {
      const termo = filtros.pesquisa.trim().toLowerCase();
      resultado = resultado.filter((e: any) => {
        const criancasNomes = Array.isArray(e.criancas)
          ? e.criancas.map((c: any) => c.nome || "").join(" ").toLowerCase()
          : "";
        return (
          criancasNomes.includes(termo) ||
          (e.encarregadoNome && e.encarregadoNome.toLowerCase().includes(termo)) ||
          (e.encarregadoTelefone && e.encarregadoTelefone.includes(termo))
        );
      });
    }

    return resultado;
  },

  // ── Obter por ID ────────────────────────────────
  async getById(id: string) {
    const entrada = await prisma.entradaLivre.findUnique({
      where: { id },
      include: {
        cacifo: { select: { id: true, numero: true, nome: true, estado: true } },
        cliente: { select: { id: true, nome: true, email: true, telefone: true } },
        extras: {
          include: { extra: { select: { id: true, nome: true, precoUnitario: true, baseCobranca: true } } },
        },
      },
    });
    if (!entrada) throw new Error("NOT_FOUND");
    
    // Convert Decimal fields to numbers
    return {
      ...entrada,
      custoHora: Number(entrada.custoHora),
      custoTotal: Number(entrada.custoTotal),
      valorPago: entrada.valorPago != null ? Number(entrada.valorPago) : null,
      custoExcesso: entrada.custoExcesso ? Number(entrada.custoExcesso) : null,
      custoTotalFinal: entrada.custoTotalFinal ? Number(entrada.custoTotalFinal) : null,
    };
  },

  // ── Criar entrada livre ─────────────────────────
  async create(data: CriarEntradaLivreDTO) {
    // O estado de pagamento é obrigatório: o utilizador tem de escolher
    // explicitamente "Pago" (true) ou "Não pago" (false).
    if (data.pago === undefined || data.pago === null) {
      throw new Error("PAGAMENTO_OBRIGATORIO");
    }

    const { criancas, duracaoMinutos, extrasIds, cacifoId, custoTotal: custoTotalInput, ...rest } = data;

    // Tarifário global: preço por escalão (1h/2h + hora adicional) - aplica-se a todos os dias.
    const configPreco = await configuracaoPrecoService.getConfig();
    // custoHora mantém-se para registo histórico (linelegado); usa o escalão aplicável.
    const custoHora = Number(configPreco.precoEntrada1h ?? 6);

    // Preço: usa valor manual do utilizador se fornecido, senão calcula a partir
    // do tarifário por escalão × nº de pessoas (crianças + adultos).
    // Se temLanche, adiciona o suplemento de lanche por pessoa.
    const numAdultos = data.numAdultos ?? 0;
    const totalPessoas = criancas.length + numAdultos;
    const custoTempoPorPessoa = await configuracaoPrecoService.calcularPrecoEntrada(duracaoMinutos, new Date());
    const custoTempo = custoTempoPorPessoa * totalPessoas;
    const precoLanche = Number(configPreco.precoLancheEntrada ?? 3);
    const criancasComLanche = contarCriancasComLanche(criancas, data.temLanche);
    const custoLanche = precoLanche * criancasComLanche;

    const extrasItens = (extrasIds ?? []).map((extraId) => ({
      extraId,
      quantidade: quantidadeDeExtra(data.extrasQuantidades, extraId),
    }));
    const custoExtras = await calcularCustoExtras(extrasItens, totalPessoas);

    const custoMeias =
      (data.meiasQuantidade ?? 0) * (data.meiasPrecoUnit ?? Number(configPreco.precoMeias));

    const custoCalculado = custoTempo + custoLanche + custoExtras + custoMeias;

    const custoTotal =
      typeof custoTotalInput === "number" && custoTotalInput >= 0
        ? custoTotalInput
        : custoCalculado;

    const inicioEm = new Date();
    const fimPrevisto = new Date(inicioEm.getTime() + duracaoMinutos * 60 * 1000);

    // Garantir que o encarregado existe como Cliente (base de contactos/marketing)
    const clienteId = await findOrCreateCliente(
      data.encarregadoNome,
      data.encarregadoTelefone,
      data.encarregadoEmail
    );

    // Criar entrada
    const entrada = await prisma.entradaLivre.create({
      data: {
        criancas: criancas as unknown as Prisma.InputJsonValue,
        duracaoMinutos,
        custoHora,
        custoTotal,
        inicioEm,
        fimPrevisto,
        cacifoId: cacifoId || null,
        clienteId,
        ...rest,
      },
      include: {
        cacifo: { select: { id: true, numero: true, nome: true, estado: true } },
        cliente: { select: { id: true, nome: true, email: true, telefone: true } },
        extras: {
          include: { extra: { select: { id: true, nome: true, precoUnitario: true, baseCobranca: true } } },
        },
      },
    });

    // Registar as crianças como filhos (Aniversariante) do cliente, para que
    // fiquem disponíveis para avisos de aniversário. Evita duplicados por nome.
    await registarCriancasComoAniversariantes(clienteId, criancas);

    // Associar extras
    if (extrasItens.length > 0) {
      await prisma.entradaLivreExtra.createMany({
        data: extrasItens.map((item) => ({
          entradaLivreId: entrada.id,
          extraId: item.extraId,
          quantidade: item.quantidade,
        })),
      });
    }

    // Marcar cacifo como ocupado
    if (cacifoId) {
      await prisma.cacifo.update({
        where: { id: cacifoId },
        data: {
          estado: "OCUPADO",
          criancas: criancas.map((c) => c.nome).join(", "),
        },
      });
    }

    return this.getById(entrada.id);
  },

  // ── Concluir entrada livre ──────────────────────
  async concluir(id: string, options?: { custoExcessoManual?: number }) {
    const entrada = await prisma.entradaLivre.findUnique({ where: { id } });
    if (!entrada) throw new Error("NOT_FOUND");
    if (entrada.estado !== "ATIVA") throw new Error("NOT_ACTIVE");

    const fimReal = new Date();
    const inicioEm = new Date(entrada.inicioEm);
    const fimPrevisto = new Date(entrada.fimPrevisto);
    const duracaoRealMs = fimReal.getTime() - inicioEm.getTime();
    const duracaoPrevistaMs = fimPrevisto.getTime() - inicioEm.getTime();

    let excessoMinutos = 0;
    let custoExcesso = 0;

    if (duracaoRealMs > duracaoPrevistaMs) {
      excessoMinutos = Math.floor((duracaoRealMs - duracaoPrevistaMs) / (1000 * 60));
      // Sugere o preço fixo de excesso do tarifário global
      custoExcesso = await configuracaoPrecoService.getPrecoExcesso();
    }

    // Valor manual do utilizador prevalece sobre o sugerido
    if (options?.custoExcessoManual !== undefined) {
      custoExcesso = options.custoExcessoManual;
    }

    const custoTotalFinal = Number(entrada.custoTotal) + custoExcesso;

    const updated = await prisma.entradaLivre.update({
      where: { id },
      data: {
        estado: "CONCLUIDA",
        fimReal,
        excessoMinutos,
        custoExcesso,
        custoTotalFinal,
      },
      include: {
        cacifo: { select: { id: true, numero: true, nome: true, estado: true } },
        cliente: { select: { id: true, nome: true, email: true, telefone: true } },
        extras: {
          include: { extra: { select: { id: true, nome: true, precoUnitario: true, baseCobranca: true } } },
        },
      },
    });

    // Libertar cacifo
    if (entrada.cacifoId) {
      await prisma.cacifo.update({
        where: { id: entrada.cacifoId },
        data: { estado: "LIVRE", criancas: null },
      });
    }

    // Convert Decimal fields to numbers
    return {
      ...updated,
      custoHora: Number(updated.custoHora),
      custoTotal: Number(updated.custoTotal),
      valorPago: updated.valorPago != null ? Number(updated.valorPago) : null,
      custoExcesso: updated.custoExcesso ? Number(updated.custoExcesso) : null,
      custoTotalFinal: updated.custoTotalFinal ? Number(updated.custoTotalFinal) : null,
    };
  },

  // ── Cancelar entrada livre ──────────────────────
  async cancelar(id: string) {
    const entrada = await prisma.entradaLivre.findUnique({ where: { id } });
    if (!entrada) throw new Error("NOT_FOUND");
    if (entrada.estado !== "ATIVA") throw new Error("NOT_ACTIVE");

    const updated = await prisma.entradaLivre.update({
      where: { id },
      data: { estado: "CANCELADA" },
      include: {
        cacifo: { select: { id: true, numero: true, nome: true, estado: true } },
        cliente: { select: { id: true, nome: true, email: true, telefone: true } },
        extras: {
          include: { extra: { select: { id: true, nome: true, precoUnitario: true, baseCobranca: true } } },
        },
      },
    });

    // Libertar cacifo
    if (entrada.cacifoId) {
      await prisma.cacifo.update({
        where: { id: entrada.cacifoId },
        data: { estado: "LIVRE", criancas: null },
      });
    }

    // Convert Decimal fields to numbers
    return {
      ...updated,
      custoHora: Number(updated.custoHora),
      custoTotal: Number(updated.custoTotal),
      valorPago: updated.valorPago != null ? Number(updated.valorPago) : null,
      custoExcesso: updated.custoExcesso ? Number(updated.custoExcesso) : null,
      custoTotalFinal: updated.custoTotalFinal ? Number(updated.custoTotalFinal) : null,
    };
  },

  // ── Atualizar pagamento ─────────────────────────
  async atualizarPagamento(id: string, data: { pago?: boolean; pagoExcesso?: boolean; metodoPagamento?: MetodoPagamento | null; valorPago?: number | null; metodoPagamento2?: MetodoPagamento | null; valorPago2?: number | null }) {
    const entrada = await prisma.entradaLivre.findUnique({ where: { id } });
    if (!entrada) throw new Error("NOT_FOUND");

    // Não é possível marcar como paga sem indicar o método de pagamento.
    // O método pode vir no próprio payload OU já estar guardado na entrada.
    // `null` limpa explicitamente o método (Prisma: null = limpar, undefined = manter).
    const metodoFinal = data.metodoPagamento === null ? null : (data.metodoPagamento ?? entrada.metodoPagamento);
    if (data.pago === true && !metodoFinal) {
      throw new Error("METODO_PAGAMENTO_REQUIRED");
    }

    const updated = await prisma.entradaLivre.update({
      where: { id },
      data,
      include: {
        cacifo: { select: { id: true, numero: true, nome: true, estado: true } },
        cliente: { select: { id: true, nome: true, email: true, telefone: true } },
        extras: {
          include: { extra: { select: { id: true, nome: true, precoUnitario: true, baseCobranca: true } } },
        },
      },
    });

    // Convert Decimal fields to numbers
    return {
      ...updated,
      custoHora: Number(updated.custoHora),
      custoTotal: Number(updated.custoTotal),
      valorPago: updated.valorPago != null ? Number(updated.valorPago) : null,
      custoExcesso: updated.custoExcesso ? Number(updated.custoExcesso) : null,
      custoTotalFinal: updated.custoTotalFinal ? Number(updated.custoTotalFinal) : null,
    };
  },

  // ── Atualizar entrada ───────────────────────────
  async atualizar(
    id: string,
    data: {
      criancas?: CriancaInput[];
      encarregadoNome?: string;
      encarregadoTelefone?: string;
      encarregadoEmail?: string;
      duracaoMinutos?: number;
      custoTotal?: number;
      valorPago?: number; // Valor recebido no pagamento 1
      metodoPagamento?: MetodoPagamento;
      pago?: boolean;
      cacifoId?: string | null;
      extrasIds?: string[];
      extrasQuantidades?: Record<string, number>;
      observacoes?: string;
      observacoesLesoes?: string;
      // Lanche
      temLanche?: boolean;
      // Adultos
      numAdultos?: number;
      // Pagamento dividido (até 2 métodos)
      metodoPagamento2?: MetodoPagamento;
      valorPago2?: number;
      // Meias (compra obrigatória)
      meiasQuantidade?: number;
      meiasPrecoUnit?: number;
    }
  ) {
    const entrada = await prisma.entradaLivre.findUnique({
      where: { id },
      include: {
        extras: { include: { extra: { select: { id: true, precoUnitario: true, baseCobranca: true } } } },
      },
    });
    if (!entrada) throw new Error("NOT_FOUND");

    const {
      criancas,
      duracaoMinutos,
      cacifoId,
      extrasIds,
      extrasQuantidades,
      custoTotal: custoTotalInput,
      ...rest
    } = data;

    // Decisão do custoTotal:
    // - Se o utilizador forneceu um valor manual, esse prevalece.
    // - Senão, recalcula a partir do tarifário se a duração, a composição
    //   de pessoas/lanche, os extras ou as meias mudaram.
    let novoCustoTotal: number | undefined;
    let novoFimPrevisto: Date | undefined;
    if (typeof custoTotalInput === "number" && custoTotalInput >= 0) {
      novoCustoTotal = custoTotalInput;
    }
    if (duracaoMinutos !== undefined && duracaoMinutos !== entrada.duracaoMinutos) {
      const inicioEm = new Date(entrada.inicioEm);
      novoFimPrevisto = new Date(inicioEm.getTime() + duracaoMinutos * 60 * 1000);
    }

    const extrasNovos =
      extrasIds !== undefined
        ? extrasIds.map((extraId) => ({
            extraId,
            quantidade: quantidadeDeExtra(extrasQuantidades, extraId),
          }))
        : entrada.extras.map((e) => ({ extraId: e.extraId, quantidade: e.quantidade }));
    const mapExtrasAtuais = new Map(entrada.extras.map((e) => [e.extraId, e.quantidade]));
    const extrasMudaram =
      extrasNovos.length !== entrada.extras.length ||
      extrasNovos.some((e) => mapExtrasAtuais.get(e.extraId) !== e.quantidade);
    const meiasMudaram =
      data.meiasQuantidade !== undefined && data.meiasQuantidade !== entrada.meiasQuantidade;

    const camposRelevantesFornecidos =
      criancas !== undefined ||
      data.temLanche !== undefined ||
      data.numAdultos !== undefined ||
      duracaoMinutos !== undefined ||
      extrasMudaram ||
      meiasMudaram;

    if (novoCustoTotal === undefined && camposRelevantesFornecidos) {
      const criancasEfetivas = criancas ?? (entrada.criancas as unknown as CriancaInput[]);
      const numAdultosEfetivo = data.numAdultos ?? entrada.numAdultos;
      const temLancheEfetivo = data.temLanche ?? entrada.temLanche;
      const duracaoEfetiva = duracaoMinutos ?? entrada.duracaoMinutos;

      const lancheAntes = contarCriancasComLanche(entrada.criancas as unknown as CriancaInput[], entrada.temLanche);
      const lancheDepois = contarCriancasComLanche(criancasEfetivas, temLancheEfetivo);
      const duracaoMudou = duracaoEfetiva !== entrada.duracaoMinutos;

      if (duracaoMudou || lancheAntes !== lancheDepois || numAdultosEfetivo !== entrada.numAdultos || extrasMudaram || meiasMudaram) {
        const custoTempoPorPessoa = await configuracaoPrecoService.calcularPrecoEntrada(duracaoEfetiva, new Date(entrada.inicioEm));
        const configPreco = await configuracaoPrecoService.getConfig();
        const precoLanche = Number(configPreco.precoLancheEntrada ?? 3);
        const totalPessoas = criancasEfetivas.length + numAdultosEfetivo;
        const custoExtras = await calcularCustoExtras(extrasNovos, totalPessoas);
        const custoMeias =
          Number(data.meiasQuantidade ?? entrada.meiasQuantidade ?? 0) *
          Number(data.meiasPrecoUnit ?? entrada.meiasPrecoUnit ?? configPreco.precoMeias);
        novoCustoTotal =
          custoTempoPorPessoa * totalPessoas + precoLanche * lancheDepois + custoExtras + custoMeias;
      }
    }

    // Reatribuir cacifo se tiver mudado
    if (cacifoId !== undefined) {
      // Libertar cacifo antigo (preservando histórico)
      if (entrada.cacifoId && entrada.cacifoId !== cacifoId) {
        await cacifoService.libertar(entrada.cacifoId);
      }
      // Ocupar novo cacifo
      if (cacifoId && cacifoId !== entrada.cacifoId) {
        await prisma.cacifo.update({
          where: { id: cacifoId },
          data: {
            estado: "OCUPADO",
            criancas: criancas
              ? criancas.map((c) => c.nome).join(", ")
              : entrada.criancas
                ? (entrada.criancas as unknown as Array<{ nome: string }>).map((c) => c.nome).join(", ")
                : null,
          },
        });
      }
    } else if (criancas && entrada.cacifoId) {
      // Apenas atualizar nomes no cacifo ocupado
      await prisma.cacifo.update({
        where: { id: entrada.cacifoId },
        data: { criancas: criancas.map((c) => c.nome).join(", ") },
      });
    }

    // Atualizar extras se fornecidos
    if (extrasIds !== undefined) {
      await prisma.entradaLivreExtra.deleteMany({ where: { entradaLivreId: id } });
      if (extrasNovos.length > 0) {
        await prisma.entradaLivreExtra.createMany({
          data: extrasNovos.map((item) => ({
            entradaLivreId: id,
            extraId: item.extraId,
            quantidade: item.quantidade,
          })),
        });
      }
    }

    const updateData: Record<string, unknown> = { ...rest };
    if (criancas !== undefined) updateData.criancas = criancas as unknown as Prisma.InputJsonValue;
    if (duracaoMinutos !== undefined) updateData.duracaoMinutos = duracaoMinutos;
    if (cacifoId !== undefined) updateData.cacifoId = cacifoId || null;
    if (novoCustoTotal !== undefined) updateData.custoTotal = novoCustoTotal;
    if (novoFimPrevisto !== undefined) updateData.fimPrevisto = novoFimPrevisto;

    const updated = await prisma.entradaLivre.update({
      where: { id },
      data: updateData,
      include: {
        cacifo: { select: { id: true, numero: true, nome: true, estado: true } },
        cliente: { select: { id: true, nome: true, email: true, telefone: true } },
        extras: {
          include: { extra: { select: { id: true, nome: true, precoUnitario: true, baseCobranca: true } } },
        },
      },
    });

    // Convert Decimal fields to numbers
    return {
      ...updated,
      custoHora: Number(updated.custoHora),
      custoTotal: Number(updated.custoTotal),
      valorPago: updated.valorPago != null ? Number(updated.valorPago) : null,
      custoExcesso: updated.custoExcesso ? Number(updated.custoExcesso) : null,
      custoTotalFinal: updated.custoTotalFinal ? Number(updated.custoTotalFinal) : null,
    };
  },

  // ── Eliminar entrada ────────────────────────────
  async eliminar(id: string) {
    const entrada = await prisma.entradaLivre.findUnique({ where: { id } });
    if (!entrada) throw new Error("NOT_FOUND");
    
    // Cannot delete active entries
    if (entrada.estado === "ATIVA") {
      throw new Error("CANNOT_DELETE_ACTIVE");
    }

    // Libertar cacifo se ocupado
    if (entrada.cacifoId) {
      await prisma.cacifo.update({
        where: { id: entrada.cacifoId },
        data: { estado: "LIVRE", criancas: null },
      });
    }

    await prisma.entradaLivre.delete({ where: { id } });
    return { message: "Eliminada com sucesso" };
  },

  // ── Contadores (ativas, hoje, etc.) ─────────────
  async getContadores() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const [ativas, concluidasHoje, totalHoje] = await Promise.all([
      prisma.entradaLivre.count({ where: { estado: "ATIVA" } }),
      prisma.entradaLivre.count({
        where: { estado: "CONCLUIDA", fimReal: { gte: hoje, lt: amanha } },
      }),
      prisma.entradaLivre.count({
        where: { inicioEm: { gte: hoje, lt: amanha } },
      }),
    ]);

    return { ativas, concluidasHoje, totalHoje };
  },
};