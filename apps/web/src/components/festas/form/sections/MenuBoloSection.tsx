"use client";

import { useEffect } from "react";
import { AlertTriangle, Cake, Utensils } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import FieldLabel from "@/components/form/FieldLabel";
import ExtrasQuantidadeStepper from "@/components/shared/extras/ExtrasQuantidadeStepper";
import { formatEuro } from "@/lib/format";
import { BOLO_LABELS } from "@/lib/constants/bolo";
import type { Extra } from "@/lib/api/extras";
import type { FestaFormData } from "../festa-form.schema";

interface MenuBoloSectionProps {
  menuOptions: { value: string; label: string }[];
  menuWarning: string;
  /** Extras de almoço/jantar (por nome) - aparecem por baixo do select Menu. */
  suplementosMenu: Extra[];
  /** Catálogo de bolos = extras activos com subcategoria "Bolos" (Config → Menus & Extras). */
  bolosCatalogo: Extra[];
  /** Total de crianças (confirmadas ?? previstas ?? 1) - base dos suplementos. */
  numPessoas: number;
}

const ESTADOS_BOLO: { value: "PAIS_TRAZEM" | "A_DECIDIR"; label: string }[] = [
  { value: "PAIS_TRAZEM", label: "Pais trazem o bolo" },
  { value: "A_DECIDIR", label: "Ainda vão decidir" },
];

export default function MenuBoloSection({
  menuOptions,
  menuWarning,
  suplementosMenu,
  bolosCatalogo,
  numPessoas,
}: MenuBoloSectionProps) {
  const { register, setValue, watch } = useFormContext<FestaFormData>();
  const bolo = watch("bolo");
  const boloQuantidade = watch("boloQuantidade");
  const extrasIds = watch("extrasIds");
  const extrasQuantidades = watch("extrasQuantidades");

  const boloExtraSeleccionado = bolosCatalogo.find((e) => extrasIds.includes(e.id));
  const ehEstado = bolo === "PAIS_TRAZEM" || bolo === "A_DECIDIR";
  // Bolo antigo gravado no enum sem correspondência no catálogo (dados de
  // antes da migração) - exibido como chip removível para não se perder.
  const boloLegado =
    bolo && !ehEstado && !boloExtraSeleccionado ? (bolo as string) : null;
  // Quantidade só faz sentido com um bolo escolhido (catálogo ou legado);
  // independe do flag "requerTexto".
  const bloqueiaQuantidade = !boloExtraSeleccionado && !boloLegado;
  // "Permitir texto personalizado" (Config → Menus & Extras) abre o campo
  // Tema do Bolo - é o valor que a cozinha/página de Bolos consome.
  const mostraTema = boloExtraSeleccionado?.requerTexto === true;
  const quantidadeBolo = boloQuantidade ?? 1;

  // Suplementos de menu são SEMPRE cobrados pelo total de crianças (regra do
  // cliente, 23/09/2026): a quantidade gravada acompanha o nº de crianças -
  // sem isto o stepper mostrava "3 € × 10 crianças = 30 €" mas o total só
  // somava 1 unidade (3 €).
  useEffect(() => {
    const seleccionados = suplementosMenu.filter((s) => extrasIds.includes(s.id));
    if (seleccionados.length === 0) return;
    const dessincronizado = seleccionados.some(
      (s) => (extrasQuantidades[s.id] ?? 1) !== numPessoas
    );
    if (!dessincronizado) return;
    setValue(
      "extrasQuantidades",
      {
        ...extrasQuantidades,
        ...Object.fromEntries(seleccionados.map((s) => [s.id, numPessoas])),
      },
      { shouldDirty: true }
    );
  }, [suplementosMenu, extrasIds, extrasQuantidades, numPessoas, setValue]);

  const toggleSuplemento = (id: string) => {
    if (extrasIds.includes(id)) {
      setValue("extrasIds", extrasIds.filter((x) => x !== id), { shouldDirty: true });
      const restantesQuantidades = { ...extrasQuantidades };
      delete restantesQuantidades[id];
      setValue("extrasQuantidades", restantesQuantidades, { shouldDirty: true });
      return;
    }
    setValue("extrasIds", [...extrasIds, id], { shouldDirty: true });
    setValue(
      "extrasQuantidades",
      { ...extrasQuantidades, [id]: numPessoas },
      { shouldDirty: true }
    );
  };

  /** "Pais trazem" / "A decidir": limpa qualquer bolo do catálogo seleccionado. */
  const escolherEstado = (valor: (typeof ESTADOS_BOLO)[number]["value"]) => {
    const idsBolos = bolosCatalogo.map((b) => b.id);
    if (extrasIds.some((id) => idsBolos.includes(id))) {
      setValue(
        "extrasIds",
        extrasIds.filter((id) => !idsBolos.includes(id)),
        { shouldDirty: true }
      );
    }
    setValue("bolo", valor, { shouldDirty: true, shouldValidate: true });
    setValue("boloQuantidade", undefined, { shouldDirty: true });
    setValue("boloTema", "", { shouldDirty: true });
  };

  /** Escolher um bolo do catálogo: entra nos extras (faturação) e deriva o
   *  tipo interno (Reserva.bolo) que alimenta cozinha/e-mail/lanche. */
  const escolherBoloExtra = (extra: Extra) => {
    const idsOutrosBolos = bolosCatalogo.filter((b) => b.id !== extra.id).map((b) => b.id);
    const restantes = extrasIds.filter((id) => !idsOutrosBolos.includes(id));
    if (restantes.includes(extra.id)) {
      // desselecionar
      setValue("extrasIds", restantes.filter((id) => id !== extra.id), { shouldDirty: true });
      setValue("bolo", undefined, { shouldDirty: true });
      setValue("boloQuantidade", undefined, { shouldDirty: true });
      setValue("boloTema", "", { shouldDirty: true });
      return;
    }
    setValue("extrasIds", [...restantes, extra.id], { shouldDirty: true });
    setValue("extrasQuantidades", { ...extrasQuantidades, [extra.id]: 1 }, { shouldDirty: true });
    setValue("bolo", (extra.boloTipo || undefined) as FestaFormData["bolo"], {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("boloQuantidade", 1, { shouldDirty: true });
  };

  const limparBoloLegado = () => {
    setValue("bolo", undefined, { shouldDirty: true });
    setValue("boloQuantidade", undefined, { shouldDirty: true });
    setValue("boloTema", "", { shouldDirty: true });
  };

  const alterarQuantidade = (valor: number) => {
    const qty = Number.isFinite(valor) && valor >= 1 ? Math.floor(valor) : 1;
    setValue("boloQuantidade", qty, { shouldDirty: true });
    if (boloExtraSeleccionado) {
      setValue(
        "extrasQuantidades",
        { ...extrasQuantidades, [boloExtraSeleccionado.id]: qty },
        { shouldDirty: true }
      );
    }
  };

  const chipClasses = (seleccionado: boolean) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors cursor-pointer ${
      seleccionado ? "border-primary-300 bg-primary-50/50" : "border-border hover:border-gray-300"
    }`;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <FieldLabel>Menu</FieldLabel>
          <Select
            options={menuOptions}
            placeholder="Seleccionar menu"
            value={watch("menuId") || "NONE"}
            onChange={(val) => setValue("menuId", val === "NONE" ? "" : val, { shouldDirty: true })}
          />
          {menuWarning && (
            <div className="flex items-center gap-1.5 mt-1">
              <AlertTriangle size={12} className="text-accent-orange shrink-0" />
              <p className="text-[11px] text-accent-orange-700">{menuWarning}</p>
            </div>
          )}
        </div>
      </div>

      {/* Suplementos de menu (Almoço/Jantar): por baixo do Menu, a pedido do
          cliente (19/09/2026). Quantidade sempre = total de crianças. */}
      {suplementosMenu.length > 0 && (
        <div className="space-y-2 pl-3 border-l-2 border-border">
          <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Utensils size={13} className="text-brand-500" /> Almoço / Jantar
          </span>
          <div className="flex flex-wrap gap-3">
            {suplementosMenu.map((item) => {
              const isSelected = extrasIds.includes(item.id);
              return (
                <div key={item.id} className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleSuplemento(item.id)}
                    className={chipClasses(isSelected)}
                  >
                    <span className="text-sm text-text-primary">{item.nome}</span>
                    <span className="text-xs font-medium text-text-secondary">
                      +{formatEuro(Number(item.precoUnitario))}
                    </span>
                  </button>
                  {isSelected && (
                    <ExtrasQuantidadeStepper
                      extra={item}
                      quantidade={numPessoas}
                      numPessoas={numPessoas}
                      quantidadeFixa
                      onChange={() => {}}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bolo: estados + catálogo gerido em Config → Menus & Extras (subcategoria
          "Bolos"). Escolher um bolo fatura-o (extras) e deriva o tipo interno
          (Reserva.bolo) que alimenta cozinha/e-mail/lanche. */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <Cake size={14} className="text-brand-500" /> Bolo de Aniversário
        </span>
        <div className="space-y-3 pl-3 border-l-2 border-border">
          <div className="flex flex-wrap gap-3">
            {ESTADOS_BOLO.map((estado) => (
              <button
                key={estado.value}
                type="button"
                onClick={() => escolherEstado(estado.value)}
                className={chipClasses(bolo === estado.value)}
              >
                <span className="text-sm text-text-primary">{estado.label}</span>
              </button>
            ))}
            {bolosCatalogo.map((boloExtra) => {
              const isSelected = extrasIds.includes(boloExtra.id);
              return (
                <button
                  key={boloExtra.id}
                  type="button"
                  onClick={() => escolherBoloExtra(boloExtra)}
                  className={chipClasses(isSelected)}
                >
                  <span className="text-sm text-text-primary">{boloExtra.nome}</span>
                  <span className="text-xs font-medium text-text-secondary">
                    +{formatEuro(Number(boloExtra.precoUnitario))}
                  </span>
                </button>
              );
            })}
          </div>

          {bolosCatalogo.length === 0 && (
            <p className="text-xs text-text-muted">
              Sem bolos no catálogo - cria-os em Configurações → Menus & Extras
              (subcategoria "Bolos") e define o "Tipo interno (cozinha)".
            </p>
          )}

          {boloLegado && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">
                Bolo (registo antigo): {BOLO_LABELS[boloLegado] ?? boloLegado}
              </span>
              <button
                type="button"
                onClick={limparBoloLegado}
                className="text-xs text-error-500 underline cursor-pointer"
              >
                remover
              </button>
            </div>
          )}

          {/* Tema do Bolo: só quando o extra seleccionado tem
              "Permitir texto personalizado" (ex.: Bolo Artístico). */}
          {mostraTema && (
            <div>
              <FieldLabel>Tema do Bolo</FieldLabel>
              <InputField
                {...register("boloTema")}
                placeholder="Ex: Frozen, Cars, Princesas, cores, mensagem na hóstia..."
              />
            </div>
          )}

          <div className="w-28">
            <FieldLabel>Quantidade</FieldLabel>
            <InputField
              type="number"
              min={1}
              value={quantidadeBolo}
              onChange={(e) => alterarQuantidade(e.target.valueAsNumber)}
              placeholder="1"
              disabled={bloqueiaQuantidade}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
