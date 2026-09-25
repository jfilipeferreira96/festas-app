import { describe, expect, it } from "vitest";
import {
  calcularDataLimite,
  calcularHoraFim,
  formatarDiaMes,
  formatarTelefoneConvite,
  gerarConviteJPEG,
  gerarConvites,
  juntarNomes,
  slugNome,
  tamanhoFonteNome,
} from "@/services/convite.service";

// Datas locais ao meio-dia para não depender do timezone do ambiente.
const data = (ano: number, mes: number, dia: number) => new Date(ano, mes - 1, dia, 12);

describe("ConviteService", () => {
  describe("calcularDataLimite", () => {
    it("subtrai 2 dias à data da festa", () => {
      const limite = calcularDataLimite(data(2026, 6, 12));
      expect(limite.getDate()).toBe(10);
      expect(limite.getMonth()).toBe(5);
      expect(limite.getFullYear()).toBe(2026);
    });

    it("atravessa a viragem de mês", () => {
      const limite = calcularDataLimite(data(2026, 3, 1));
      expect(limite.getFullYear()).toBe(2026);
      expect(limite.getMonth()).toBe(1); // fevereiro
      expect(limite.getDate()).toBe(27);
    });

    it("atravessa a viragem de ano", () => {
      const limite = calcularDataLimite(data(2026, 1, 1));
      expect(limite.getFullYear()).toBe(2025);
      expect(limite.getMonth()).toBe(11); // dezembro
      expect(limite.getDate()).toBe(30);
    });
  });

  describe("calcularHoraFim", () => {
    it("soma a duração ao início (14:00 + 135min = 16:15)", () => {
      expect(calcularHoraFim("14:00", 135)).toBe("16:15");
    });

    it("dá a volta à meia-noite (23:30 + 60min = 00:30)", () => {
      expect(calcularHoraFim("23:30", 60)).toBe("00:30");
    });

    it("mantém o formato HH:MM com zeros", () => {
      expect(calcularHoraFim("00:00", 90)).toBe("01:30");
    });
  });

  describe("formatarDiaMes", () => {
    it("devolve o dia e o mês por extenso com maiúscula", () => {
      expect(formatarDiaMes(data(2026, 6, 12))).toEqual({ dia: "12", mes: "Junho" });
    });

    it("aceita string date-only", () => {
      expect(formatarDiaMes("2026-12-05")).toEqual({ dia: "5", mes: "Dezembro" });
    });
  });

  describe("formatarTelefoneConvite", () => {
    it("envolve o indicativo em parêntesis", () => {
      expect(formatarTelefoneConvite()).toBe("(+351) 927 104 432");
    });
  });

  describe("juntarNomes", () => {
    it("junta dois nomes com 'e'", () => {
      expect(juntarNomes(["Maria", "João"])).toBe("Maria e João");
    });

    it("ignora nomes vazios", () => {
      expect(juntarNomes(["", " Ana "])).toBe("Ana");
    });

    it("devolve vazio sem aniversariantes", () => {
      expect(juntarNomes([])).toBe("");
    });
  });

  describe("tamanhoFonteNome", () => {
    it("mantém o tamanho base para nomes curtos", () => {
      expect(tamanhoFonteNome("Maria")).toBe(64);
    });

    it("encolhe para nomes longos sem descer do mínimo", () => {
      const longo = "Mariana Fernandes e João Pedro Albuquerque";
      const tamanho = tamanhoFonteNome(longo);
      expect(tamanho).toBeLessThan(64);
      expect(tamanho).toBeGreaterThanOrEqual(34);
    });
  });

  describe("gerarConviteJPEG", () => {
    it("produz um JPEG válido (magic bytes FFD8)", async () => {
      const jpeg = await gerarConviteJPEG({
        nomes: ["Maria"],
        dataFesta: "2026-06-12",
        horarioInicio: "14:00",
        duracaoMinutos: 135,
      });
      expect(jpeg.subarray(0, 2).equals(Buffer.from([0xff, 0xd8]))).toBe(true);
      expect(jpeg.length).toBeGreaterThan(100_000);
    });
  });

  describe("slugNome", () => {
    it("normaliza acentos, espaços e capitalização", () => {
      expect(slugNome("Ana Beatriz")).toBe("ana-beatriz");
      expect(slugNome("João Pereira")).toBe("joao-pereira");
      expect(slugNome("  ")).toBe("convite");
    });
  });

  describe("gerarConvites", () => {
    const base = {
      dataFesta: "2026-06-12",
      horarioInicio: "14:00",
      duracaoMinutos: 135,
    };

    it("modo JUNTO (default): um único convite com todos os nomes", async () => {
      const convites = await gerarConvites({ ...base, nomes: ["Maria", "João"] });
      expect(convites).toHaveLength(1);
      expect(convites[0]?.filename).toBe("convite.jpeg");
      expect(convites[0]?.contentType).toBe("image/jpeg");
    });

    it("modo SEPARADO: um convite por criança com nome no ficheiro", async () => {
      const convites = await gerarConvites({
        ...base,
        nomes: ["Maria Silva", "João Pereira"],
        modo: "SEPARADO",
      });
      expect(convites).toHaveLength(2);
      expect(convites[0]?.filename).toBe("convite-maria-silva.jpeg");
      expect(convites[1]?.filename).toBe("convite-joao-pereira.jpeg");
      for (const c of convites) {
        expect(c.content.subarray(0, 2).equals(Buffer.from([0xff, 0xd8]))).toBe(true);
      }
    });

    it("modo SEPARADO com uma só criança devolve um convite normal", async () => {
      const convites = await gerarConvites({ ...base, nomes: ["Maria"], modo: "SEPARADO" });
      expect(convites).toHaveLength(1);
      expect(convites[0]?.filename).toBe("convite.jpeg");
    });
  });
});
