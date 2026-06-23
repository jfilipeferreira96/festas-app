import prisma from "@festas/db";
import { Prisma } from "@prisma/client";
import { excecaoCalendarioService } from "@/services/excecaoCalendario.service";

/**
 * Verifica se uma data cai num fim de semana (sábado ou domingo).
 */
function isFimSemana(data: Date): boolean {
  const dia = data.getDay();
  return dia === 0 || dia === 6; // 0 = domingo, 6 = sábado
}

interface MinimoConfig {
  aniversariantes: number;
  minimo: number;
}

export const configuracaoPrecoService = {
  /**
   * Retorna a configuração de preços global (singleton).
   * Cria com valores por defeito se ainda não existir.
   */
  async getConfig() {
    let config = await prisma.configuracaoPreco.findFirst();

    if (!config) {
      config = await prisma.configuracaoPreco.create({ data: {} });
    }

    return config;
  },

  /**
   * Atualiza (ou cria) a configuração de preços global.
   */
  async updateConfig(data: {
    precoCriancaSemana?: number;
    precoCriancaFimSemana?: number;
    precoEntradaHoraSemana?: number;
    precoEntradaHoraFimSemana?: number;
    minimosCriancasPorAniversariante?: MinimoConfig[];
    precoMeias?: number;
    precoExcessoFixo?: number;
    caucaoDefault?: number;
    precoLancheEntrada?: number;
    duracaoDefaultFestaMin?: number;
    duracaoExcessoBlocoMin?: number;
  }) {
    const existing = await prisma.configuracaoPreco.findFirst();

    if (!existing) {
      return prisma.configuracaoPreco.create({
        data: {
          precoCriancaSemana: data.precoCriancaSemana ?? 15,
          precoCriancaFimSemana: data.precoCriancaFimSemana ?? 20,
          precoEntradaHoraSemana: data.precoEntradaHoraSemana ?? 10,
          precoEntradaHoraFimSemana: data.precoEntradaHoraFimSemana ?? 12,
          minimosCriancasPorAniversariante: data.minimosCriancasPorAniversariante as unknown as Prisma.InputJsonValue,
          precoMeias: data.precoMeias ?? 2,
          precoExcessoFixo: data.precoExcessoFixo ?? 5,
          caucaoDefault: data.caucaoDefault ?? 40,
          precoLancheEntrada: data.precoLancheEntrada ?? 3,
          duracaoDefaultFestaMin: data.duracaoDefaultFestaMin ?? 135,
          duracaoExcessoBlocoMin: data.duracaoExcessoBlocoMin ?? 30,
        },
      });
    }

    return prisma.configuracaoPreco.update({
      where: { id: existing.id },
      data: {
        ...(data.precoCriancaSemana !== undefined && { precoCriancaSemana: data.precoCriancaSemana }),
        ...(data.precoCriancaFimSemana !== undefined && { precoCriancaFimSemana: data.precoCriancaFimSemana }),
        ...(data.precoEntradaHoraSemana !== undefined && { precoEntradaHoraSemana: data.precoEntradaHoraSemana }),
        ...(data.precoEntradaHoraFimSemana !== undefined && { precoEntradaHoraFimSemana: data.precoEntradaHoraFimSemana }),
        ...(data.minimosCriancasPorAniversariante !== undefined && {
          minimosCriancasPorAniversariante: data.minimosCriancasPorAniversariante as unknown as Prisma.InputJsonValue,
        }),
        ...(data.precoMeias !== undefined && { precoMeias: data.precoMeias }),
        ...(data.precoExcessoFixo !== undefined && { precoExcessoFixo: data.precoExcessoFixo }),
        ...(data.caucaoDefault !== undefined && { caucaoDefault: data.caucaoDefault }),
        ...(data.precoLancheEntrada !== undefined && { precoLancheEntrada: data.precoLancheEntrada }),
        ...(data.duracaoDefaultFestaMin !== undefined && { duracaoDefaultFestaMin: data.duracaoDefaultFestaMin }),
        ...(data.duracaoExcessoBlocoMin !== undefined && { duracaoExcessoBlocoMin: data.duracaoExcessoBlocoMin }),
      },
    });
  },

  /**
   * Retorna o preço por criança aplicável a uma data.
   * Feriados e fins-de-semana usam tarifa de fim-de-semana.
   */
  async getPrecoCrianca(data: Date): Promise<number> {
    const config = await this.getConfig();
    const feriado = await excecaoCalendarioService.isFeriado(data);
    const aplicarFimSemana = feriado || isFimSemana(data);
    return Number(aplicarFimSemana ? config.precoCriancaFimSemana : config.precoCriancaSemana);
  },

  /**
   * Retorna o mínimo de crianças para um nº de aniversariantes.
   * Usa a tabela configurável minimosCriancasPorAniversariante.
   * Default: 1→10, 2→15, 3→20.
   */
  async getMinimoCriancas(numAniversariantes: number): Promise<number> {
    const config = await this.getConfig();
    const minimos = (config.minimosCriancasPorAniversariante ?? []) as unknown as MinimoConfig[];

    if (minimos.length === 0) {
      // Defaults hard-coded
      if (numAniversariantes >= 3) return 20;
      if (numAniversariantes === 2) return 15;
      return 10;
    }

    // Procurar entrada que melhor corresponde (>= aniversariantes, menor limiar)
    const ordenados = [...minimos].sort((a, b) => a.aniversariantes - b.aniversariantes);
    let minimo = ordenados[0]?.minimo ?? 10;
    for (const m of ordenados) {
      if (numAniversariantes >= m.aniversariantes) {
        minimo = m.minimo;
      }
    }
    return minimo;
  },

  /**
   * Calcula o preço de uma festa.
   *
   * 1. Feriado → tarifa fim-semana; senão fim-semana/semana
   * 2. minimo = minimosCriancasPorAniversariante[numAniv]
   * 3. criancasFaturadas = max(numCriancas, minimo)
   * 4. valor = precoCrianca × criancasFaturadas
   *
   * Retorna { precoCrianca, minimoCriancas, criancasFaturadas, total }
   */
  async calcularPrecoFesta(
    data: Date,
    numCriancas: number,
    numAniversariantes: number
  ): Promise<{
    precoCrianca: number;
    minimoCriancas: number;
    criancasFaturadas: number;
    total: number;
  }> {
    const precoCrianca = await this.getPrecoCrianca(data);
    const minimoCriancas = await this.getMinimoCriancas(numAniversariantes);
    const criancasFaturadas = Math.max(numCriancas, minimoCriancas);
    const total = +(precoCrianca * criancasFaturadas).toFixed(2);

    return { precoCrianca, minimoCriancas, criancasFaturadas, total };
  },

  /**
   * Calcula o custo das meias (compra obrigatória no parque).
   */
  async calcularCustoMeias(quantidade: number): Promise<number> {
    const config = await this.getConfig();
    return +(Number(config.precoMeias) * quantidade).toFixed(2);
  },

  /**
   * Calcula o preço de uma entrada livre para uma determinada duração e data.
   * Feriados e fins-de-semana usam tarifa de fim-de-semana.
   */
  async calcularPrecoEntrada(duracaoMinutos: number, data: Date): Promise<number> {
    const config = await this.getConfig();
    const feriado = await excecaoCalendarioService.isFeriado(data);
    const aplicarFimSemana = feriado || isFimSemana(data);
    const precoHora = Number(aplicarFimSemana ? config.precoEntradaHoraFimSemana : config.precoEntradaHoraSemana);
    return +((precoHora / 60) * duracaoMinutos).toFixed(2);
  },

  /**
   * Retorna o preço fixo de excesso sugerido pelo tarifário global.
   * Usado quando uma festa ou entrada livre ultrapassa o tempo previsto.
   */
  async getPrecoExcesso(): Promise<number> {
    const config = await this.getConfig();
    return Number(config.precoExcessoFixo);
  },

  /**
   * Retorna o valor da caução por defeito (sugerido ao criar reserva).
   */
  async getCaucaoDefault(): Promise<number> {
    const config = await this.getConfig();
    return Number(config.caucaoDefault);
  },
};
