"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui";
import { useToast } from "@/hooks/use-toast";
import { useCriarEntradaLivre, useAtualizarEntradaLivre } from "@/hooks/use-entrada-livre";
import { useCacifos } from "@/hooks/use-cacifos";
import { useConfigPreco } from "@/hooks/use-precos";
import ClienteSearchModal, { type ClienteFilho } from "@/components/common/ClienteSearchModal";
import EntradaLivrePagamentoModal from "@/components/entradas-livres/EntradaLivrePagamentoModal";
import { scrollToFirstFormError } from "@/components/form/form-utils";
import type { Cliente } from "@/lib/api/clientes";
import type { EntradaLivre } from "@/lib/api/entradaLivre";
import {
  buildEntradaLivreDefaults,
  buildEntradaPayload,
  entradaLivreFormSchema,
  type EntradaLivreFormData,
} from "./entrada-livre-form.schema";
import PessoasEntradaSection from "./sections/PessoasEntradaSection";
import DuracaoLancheSection from "./sections/DuracaoLancheSection";
import ObservacoesSection from "./sections/ObservacoesSection";
import PagamentoEntradaSection from "./sections/PagamentoEntradaSection";

interface EntradaLivreFormProps {
  entrada?: EntradaLivre | null;
  onClose: () => void;
}

function idadeDeDataNascimento(dataNascimento: string): string {
  if (!dataNascimento) return "";
  const nasc = new Date(dataNascimento);
  const agora = new Date();
  let anos = agora.getFullYear() - nasc.getFullYear();
  const m = agora.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && agora.getDate() < nasc.getDate())) anos--;
  return String(Math.max(0, anos));
}

export default function EntradaLivreForm({ entrada, onClose }: EntradaLivreFormProps) {
  const isEdit = !!entrada;
  const toast = useToast();
  const criar = useCriarEntradaLivre();
  const atualizar = useAtualizarEntradaLivre();
  const { data: cacifosData } = useCacifos({ estado: "LIVRE" });
  const { data: configPreco } = useConfigPreco();

  const defaultValues = useMemo(() => buildEntradaLivreDefaults(entrada), [entrada]);
  const methods = useForm<EntradaLivreFormData>({
    resolver: zodResolver(entradaLivreFormSchema),
    defaultValues,
  });
  const { control, handleSubmit, watch, setValue, formState: { isSubmitting } } = methods;
  const criancasArray = useFieldArray({ control, name: "criancas" });

  const duracaoMinutos = watch("duracaoMinutos");
  const temLanche = watch("temLanche") ?? false;
  const numAdultos = watch("numAdultos") ?? 0;
  const criancasWatched = watch("criancas");

  const custoTempoPorPessoa = useMemo(() => {
    if (!configPreco) return 0;
    const preco1h = Number(configPreco.precoEntrada1h ?? 6);
    const preco2h = Number(configPreco.precoEntrada2h ?? 10);
    const precoHoraAdicional = Number(configPreco.precoEntradaHoraAdicional ?? 5);
    const dur = duracaoMinutos || 0;
    return dur <= 60 ? preco1h : dur <= 120 ? preco2h : preco2h + Math.ceil((dur - 120) / 60) * precoHoraAdicional;
  }, [configPreco, duracaoMinutos]);

  const custoComponentes = useMemo(() => {
    const comNome = criancasWatched.filter((c) => c.nome.trim());
    const totalPessoas = Math.max(comNome.length + numAdultos, 1);
    const custoTempo = custoTempoPorPessoa * totalPessoas;
    const precoLanche = Number(configPreco?.precoLancheEntrada ?? 3);
    const criancasComLanche = temLanche ? comNome.filter((c) => c.querLanche).length : 0;
    const custoLanche = precoLanche * criancasComLanche;
    return { totalPessoas, criancasComLanche, custoTempo, custoLanche, total: custoTempo + custoLanche };
  }, [custoTempoPorPessoa, criancasWatched, numAdultos, temLanche, configPreco]);

  const custoCalculado = custoComponentes.total;
  const custoFinal = watch("custoTotal") ?? custoCalculado;

  const [custoEdited, setCustoEdited] = useState(false);
  useEffect(() => {
    if (custoEdited) return;
    if (custoCalculado > 0) setValue("custoTotal", Number(custoCalculado.toFixed(2)));
  }, [custoCalculado, setValue, custoEdited]);

  const cacifoAtual = entrada?.cacifo;
  const cacifoOptions = useMemo(() => {
    const livres = Array.isArray(cacifosData) ? cacifosData : [];
    const options = livres.map((c) => ({
      value: c.id,
      label: `#${c.numero}${c.nome ? ` - ${c.nome}` : ""}`,
    }));
    if (cacifoAtual && !options.some((o) => o.value === cacifoAtual.id)) {
      options.unshift({
        value: cacifoAtual.id,
        label: `#${cacifoAtual.numero}${cacifoAtual.nome ? ` - ${cacifoAtual.nome}` : ""}`,
      });
    }
    return [{ value: "", label: "Nenhum" }, ...options];
  }, [cacifosData, cacifoAtual]);

  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);

  const handleClienteSelected = useCallback(
    (cliente: Cliente, filhos: ClienteFilho[]) => {
      setValue("encarregadoNome", cliente.nome, { shouldDirty: true });
      setValue("encarregadoTelefone", cliente.telefone, { shouldDirty: true });
      if (cliente.email) setValue("encarregadoEmail", cliente.email, { shouldDirty: true });
      if (filhos.length > 0) {
        criancasArray.replace(
          filhos.map((filho) => ({
            nome: filho.nome,
            idade: idadeDeDataNascimento(filho.dataNascimento),
            querLanche: true,
          }))
        );
      }
    },
    [setValue, criancasArray]
  );

  const onSubmit = useCallback(
    async (data: EntradaLivreFormData) => {
      const payload = buildEntradaPayload(data, {
        isEdit,
        extrasAtuais: entrada?.extras?.map((e) => e.extraId) ?? [],
      });
      try {
        if (isEdit && entrada) {
          await atualizar.mutateAsync({ id: entrada.id, data: payload });
        } else {
          await criar.mutateAsync(payload);
        }
        toast.success(isEdit ? "Entrada livre atualizada com sucesso." : "Entrada livre criada com sucesso.");
        onClose();
      } catch (err) {
        toast.handleApiError(err, "Erro ao guardar a entrada livre.");
      }
    },
    [isEdit, entrada, atualizar, criar, toast, onClose]
  );

  const onInvalid = useCallback(() => scrollToFirstFormError(), []);
  const isLoading = isSubmitting || criar.isPending || atualizar.isPending;

  return (
    <div className="flex flex-col max-h-[70vh]">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-3 space-y-6">
            <PessoasEntradaSection
              criancas={criancasArray}
              temLanche={temLanche}
              onOpenSearchCliente={() => setShowClienteSearch(true)}
            />
            <DuracaoLancheSection
              custoCalculado={custoCalculado}
              custoTempoPorPessoa={custoTempoPorPessoa}
              precoLancheEntrada={Number(configPreco?.precoLancheEntrada ?? 3)}
              cacifoOptions={cacifoOptions}
              onCustoEditado={() => setCustoEdited(true)}
            />
            <ObservacoesSection />
            <PagamentoEntradaSection
              entrada={entrada}
              custoComponentes={custoComponentes}
              custoFinal={custoFinal}
              precoMeias={Number(configPreco?.precoMeias ?? 1.5)}
              onOpenPagamento={() => setShowPagamentoModal(true)}
            />
          </div>
          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end shrink-0">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "A guardar..." : isEdit ? "Guardar Alterações" : "Criar Entrada"}
            </Button>
          </div>
        </form>
      </FormProvider>

      <ClienteSearchModal
        isOpen={showClienteSearch}
        onClose={() => setShowClienteSearch(false)}
        onSelect={handleClienteSelected}
      />

      {showPagamentoModal && entrada && (
        <EntradaLivrePagamentoModal entrada={entrada} onClose={() => setShowPagamentoModal(false)} />
      )}
    </div>
  );
}
