"use client";

import { useMemo } from "react";
import { AlertTriangle, Plus, Search, Trash2, User, Users } from "lucide-react";
import { useFormContext, type UseFieldArrayReturn } from "react-hook-form";
import InputField from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import DatePicker from "@/components/form/date-picker";
import { calcIdade, toISODate } from "@/lib/format";
import { IDADE_MAX_CRIANCA, IDADE_MIN_CRIANCA, idadeForaIntervalo } from "@/lib/constantes";
import { DATA_NASCIMENTO_DEFAULT, type EntradaLivreFormData } from "../entrada-livre-form.schema";

interface PessoasEntradaSectionProps {
  criancas: UseFieldArrayReturn<EntradaLivreFormData, "criancas", "id">;
  adicionais: UseFieldArrayReturn<EntradaLivreFormData, "encarregadosAdicionais", "id">;
  temLanche: boolean;
  onOpenSearchCliente: () => void;
}

export default function PessoasEntradaSection({
  criancas,
  adicionais,
  temLanche,
  onOpenSearchCliente,
}: PessoasEntradaSectionProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<EntradaLivreFormData>();
  const hoje = useMemo(() => toISODate(new Date()), []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Users size={14} className="text-brand-500" /> Crianças
            <span className="text-error-500">*</span>
          </span>
          <button
            type="button"
            onClick={() => criancas.append({ nome: "", dataNascimento: DATA_NASCIMENTO_DEFAULT, querLanche: true })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
          >
            <Plus size={13} /> Adicionar criança
          </button>
        </div>
        {criancas.fields.map((field, index) => {
          const dataNascimento = watch(`criancas.${index}.dataNascimento`);
          const idade = dataNascimento ? calcIdade(dataNascimento, hoje) : null;
          const idadeAlerta = idade !== null && idadeForaIntervalo(idade);
          return (
            <div key={field.id}>
              <div className="flex items-end gap-3">
                <div className="w-3/5">
                  <InputField
                    {...register(`criancas.${index}.nome`)}
                    placeholder={`Nome da criança ${index + 1}`}
                    error={!!errors.criancas?.[index]?.nome}
                    hint={errors.criancas?.[index]?.nome?.message}
                  />
                </div>
                <div className="w-2/5">
                  <DatePicker
                    id={`crianca-data-${field.id}`}
                    placeholder="Data nascimento"
                    defaultDate={dataNascimento || DATA_NASCIMENTO_DEFAULT}
                    maxDate={hoje}
                    onChange={([date]) => {
                      if (date) {
                        setValue(`criancas.${index}.dataNascimento`, toISODate(date), { shouldDirty: true });
                      }
                    }}
                  />
                </div>
                {idade !== null ? (
                  <span
                    className={`text-sm font-bold whitespace-nowrap py-3 flex items-center gap-1 ${
                      idadeAlerta ? "text-accent-red" : "text-brand-500"
                    }`}
                  >
                    {idade} anos
                    {idadeAlerta && <AlertTriangle size={13} />}
                  </span>
                ) : null}
                {/* Só faz sentido escolher por criança quando há mais de uma:
                    com uma só criança o switch "Inclui lanche?" decide. */}
                {temLanche && criancas.fields.length > 1 && (
                  <div className="pb-3">
                    <Checkbox
                      checked={watch(`criancas.${index}.querLanche`)}
                      onChange={() =>
                        setValue(`criancas.${index}.querLanche`, !watch(`criancas.${index}.querLanche`), {
                          shouldDirty: true,
                        })
                      }
                      label="Lanche"
                    />
                  </div>
                )}
                {criancas.fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => criancas.remove(index)}
                    className="p-2 mb-2 text-text-muted hover:text-accent-red transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {idadeAlerta && (
                <p className="text-[11px] font-medium text-accent-orange-700 mt-1">
                  Atenção: idade fora do intervalo permitido ({IDADE_MIN_CRIANCA}-{IDADE_MAX_CRIANCA} anos) - confirma
                  a data de nascimento. Podes gravar mesmo assim.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <User size={14} className="text-brand-500" /> Encarregado de Educação
            <span className="text-error-500">*</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSearchCliente}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
            >
              <Search size={13} /> Pesquisar Cliente
            </button>
            <button
              type="button"
              onClick={() => adicionais.append({ nome: "", contacto: "", email: "", codigoPostal: "" })}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
            >
              <Plus size={13} /> Adicionar encarregado
            </button>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <InputField
              autoComplete="nope"
              {...register("encarregadoNome")}
              placeholder="Nome do responsável"
              error={!!errors.encarregadoNome}
              hint={errors.encarregadoNome?.message}
            />
          </div>
          <div className="flex-1">
            <InputField
              type="tel"
              autoComplete="nope"
              {...register("encarregadoTelefone")}
              placeholder="Telefone"
              error={!!errors.encarregadoTelefone}
              hint={errors.encarregadoTelefone?.message}
            />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <InputField
              type="email"
              autoComplete="nope"
              {...register("encarregadoEmail")}
              placeholder="Email (opcional)"
              error={!!errors.encarregadoEmail}
              hint={errors.encarregadoEmail?.message}
            />
          </div>
          <div className="w-40">
            <InputField {...register("encarregadoCodigoPostal")} placeholder="Código Postal" />
          </div>
          <div className="flex items-center shrink-0 pb-0.5">
            <Checkbox
              label="Adicionar aos clientes"
              checked={watch("adicionarCliente")}
              onChange={(checked) => setValue("adicionarCliente", checked, { shouldDirty: true })}
            />
          </div>
        </div>
        {adicionais.fields.map((field, index) => (
          <div key={field.id} className="p-3 rounded-lg bg-surface border border-border">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-xs font-bold">
                {index + 2}
              </div>
              <span className="text-xs font-semibold text-text-primary">Encarregado {index + 2}</span>
              <button
                type="button"
                onClick={() => adicionais.remove(index)}
                className="ml-auto p-1 text-text-muted hover:text-accent-red transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <InputField
              {...register(`encarregadosAdicionais.${index}.nome`)}
              placeholder="Nome do encarregado"
            />
            <div className="flex gap-3 mt-2">
              <div className="flex-1">
                <InputField type="tel" {...register(`encarregadosAdicionais.${index}.contacto`)} placeholder="Telefone" />
              </div>
              <div className="flex-1">
                <InputField type="email" {...register(`encarregadosAdicionais.${index}.email`)} placeholder="Email" />
              </div>
              <div className="w-40">
                <InputField {...register(`encarregadosAdicionais.${index}.codigoPostal`)} placeholder="Código Postal" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
