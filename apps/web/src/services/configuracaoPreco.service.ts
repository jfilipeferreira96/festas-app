import prisma from "@festas/db";

/**
 * Verifica se uma data cai num fim de semana (sábado ou domingo).
 */
function isFimSemana(data: Date): boolean {
  const dia = data.getDay();
  return dia === 0 || dia === 6; // 0 = domingo, 6 = sábado
}

export const configuracaoPrecoService = {
  /**
   * Retorna a configuração de preços global (singleton).
   * Cria com valores por defeito se ainda não existir.
   */
  async getConfig() {
    let config = await prisma.configuracaoPreco.findFirst();

    if (!config) {
      config = await prisma.configuracaoPreco.create({
        data: {},
      });
    }

    return config;
  },

  /**
   * Atualiza (ou cria) a configuração de preços global.
   */
  async updateConfig(data: {
    precoFestaSemana?: number;
    precoFestaFimSemana?: number;
    precoEntradaHoraSemana?: number;
    precoEntradaHoraFimSemana?: number;
    precoExcessoFixo?: number;
  }) {
    const existing = await prisma.configuracaoPreco.findFirst();

    if (!existing) {
      return prisma.configuracaoPreco.create({
        data: {
          precoFestaSemana: data.precoFestaSemana ?? 150,
          precoFestaFimSemana: data.precoFestaFimSemana ?? 200,
          precoEntradaHoraSemana: data.precoEntradaHoraSemana ?? 10,
          precoEntradaHoraFimSemana: data.precoEntradaHoraFimSemana ?? 12,
          precoExcessoFixo: data.precoExcessoFixo ?? 5,
        },
      });
    }

    return prisma.configuracaoPreco.update({
      where: { id: existing.id },
      data: {
        ...(data.precoFestaSemana !== undefined && { precoFestaSemana: data.precoFestaSemana }),
        ...(data.precoFestaFimSemana !== undefined && { precoFestaFimSemana: data.precoFestaFimSemana }),
        ...(data.precoEntradaHoraSemana !== undefined && { precoEntradaHoraSemana: data.precoEntradaHoraSemana }),
        ...(data.precoEntradaHoraFimSemana !== undefined && { precoEntradaHoraFimSemana: data.precoEntradaHoraFimSemana }),
        ...(data.precoExcessoFixo !== undefined && { precoExcessoFixo: data.precoExcessoFixo }),
      },
    });
  },

  /**
   * Calcula o preço de uma festa para uma determinada data.
   * Distingue dia de semana vs fim de semana.
   */
  async calcularPrecoFesta(data: Date): Promise<number> {
    const config = await this.getConfig();
    const fimSemana = isFimSemana(data);
    const preco = fimSemana
      ? Number(config.precoFestaFimSemana)
      : Number(config.precoFestaSemana);
    return preco;
  },

  /**
   * Calcula o preço de uma entrada livre para uma determinada duração e data.
   * Distingue dia de semana vs fim de semana.
   */
  async calcularPrecoEntrada(duracaoMinutos: number, data: Date): Promise<number> {
    const config = await this.getConfig();
    const fimSemana = isFimSemana(data);
    const precoHora = fimSemana
      ? Number(config.precoEntradaHoraFimSemana)
      : Number(config.precoEntradaHoraSemana);
    return (precoHora / 60) * duracaoMinutos;
  },

  /**
   * Retorna o preço fixo de excesso sugerido pelo tarifário global.
   * Usado quando uma festa ou entrada livre ultrapassa o tempo previsto.
   */
  async getPrecoExcesso(): Promise<number> {
    const config = await this.getConfig();
    return Number(config.precoExcessoFixo);
  },
};
