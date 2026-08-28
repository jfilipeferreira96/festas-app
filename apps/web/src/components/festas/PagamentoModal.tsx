"use client";

import React, { useState, useCallback } from "react";
import { CreditCard, Wallet, Shield, Percent, Hash, CheckCircle2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import Switch from "@/components/form/switch/Switch";
import Checkbox from "@/components/form/input/Checkbox";
import { useUpdatePagamento } from "@/hooks/use-reservas";
import { useToast } from "@/hooks/use-toast";
import AjustesPagamentoSection from "@/components/shared/AjustesPagamentoSection";
import type { Reserva, MetodoPagamento } from "@/lib/api/reservas";

const METODO_PAGAMENTO_OPTIONS = [
  { value: "NONE", label: "Não definido" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "MULTIBANCO", label: "Multibanco" },
  { value: "MBWAY", label: "MB WAY" },
  { value: "TRANSFERENCIA", label: "Transferência Bancária" },
  { value: "CARTAO", label: "Cartão" },
  { value: "OUTRO", label: "Outro" },
];

const CAUCAO_OPTIONS = [
  { value: "NAO_PAGA", label: "Não paga" },
  { value: "PAGA", label: "Paga" },
  { value: "PAGA_NO_DIA", label: "Paga no dia" },
];

const fmtEuro = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

interface PagamentoModalProps {
  reserva: Reserva;
  onClose: () => void;
}

export default function PagamentoModal({ reserva, onClose }: PagamentoModalProps) {
  const toast = useToast();
  const updatePagamento = useUpdatePagamento();

  const [pago, setPago] = useState(reserva.pago);
  const [metodoPagamento, setMetodoPagamento] = useState(reserva.metodoPagamento ?? "NONE");
  const [valorPago, setValorPago] = useState<string>(reserva.valorPago ? String(reserva.valorPago) : "");
  const [referenciaPagamento, setReferenciaPagamento] = useState(reserva.referenciaPagamento ?? "");
  const [showSplit, setShowSplit] = useState(!!reserva.metodoPagamento2);
  const [metodoPagamento2, setMetodoPagamento2] = useState(reserva.metodoPagamento2 ?? "NONE");
  const [valorPago2, setValorPago2] = useState<string>(reserva.valorPago2 ? String(reserva.valorPago2) : "");
  const [caucao, setCaucao] = useState<string>(reserva.caucao ?? "NAO_PAGA");
  const [valorCaucao, setValorCaucao] = useState<string>(reserva.valorCaucao ? String(reserva.valorCaucao) : "");
  const [descontoPercentagem, setDescontoPercentagem] = useState<string>(reserva.descontoPercentagem ? String(reserva.descontoPercentagem) : "");
  const [descontoMotivo, setDescontoMotivo] = useState(reserva.descontoMotivo ?? "");

  // Cálculo de "falta liquidar"
  const total = Number(valorPago) || 0;
  const caucaoValor = (caucao === "PAGA" || caucao === "PAGA_NO_DIA") ? (Number(valorCaucao) || 0) : 0;
  const segundo = showSplit ? (Number(valorPago2) || 0) : 0;
  const emFalta = Math.max(total - caucaoValor - segundo, 0);

  const handleSave = useCallback(async () => {
    const parseNum = (s: string) => s === "" ? undefined : Number(s);
    // "Não definido" deve LIMPAR o método guardado — null (não undefined),
    // porque undefined = "sem alterações" no Prisma e deixaria o método antigo.
    const parseMetodo = (s: string): MetodoPagamento | null =>
      s === "NONE" || s === "" ? null : s as MetodoPagamento;

    try {
      await updatePagamento.mutateAsync({
        id: reserva.id,
        data: {
          pago,
          metodoPagamento: parseMetodo(metodoPagamento),
          valorPago: parseNum(valorPago),
          referenciaPagamento: referenciaPagamento || undefined,
          metodoPagamento2: showSplit ? parseMetodo(metodoPagamento2) : null,
          valorPago2: showSplit ? parseNum(valorPago2) ?? null : null,
          caucao: caucao || undefined,
          valorCaucao: parseNum(valorCaucao),
          descontoPercentagem: parseNum(descontoPercentagem),
          descontoMotivo: descontoMotivo || undefined,
        },
      });
      toast.success("Pagamento atualizado com sucesso.");
      onClose();
    } catch (err) {
      toast.handleApiError(err, "Erro ao atualizar pagamento.");
    }
  }, [updatePagamento, reserva.id, pago, metodoPagamento, valorPago, referenciaPagamento, showSplit, metodoPagamento2, valorPago2, caucao, valorCaucao, descontoPercentagem, descontoMotivo, toast, onClose]);

  const isLoading = updatePagamento.isPending;
  const anvNome = reserva.aniversariantes?.map(a => a.aniversariante.nome).join(", ") || reserva.cliente?.nome || "—";

  return (
    <Modal isOpen onClose={onClose} size="md" title={`Pagamento — ${anvNome}`}>
      <div className="p-5 flex flex-col max-h-[70vh]">
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto space-y-4">

          {(reserva.notasCacifos || reserva.observacoesLesoes || (reserva.cacifos ?? []).some((c) => c.notas?.trim())) && (
            <div className="p-3 rounded-lg bg-accent-orange-50 border border-accent-orange-200 space-y-1.5">
              <p className="text-[10px] font-semibold text-accent-orange-700 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={12} /> Avisar os pais
              </p>
              {reserva.notasCacifos && (
                <p className="text-xs text-text-secondary whitespace-pre-wrap">
                  <span className="font-medium">Notas cacifos:</span> {reserva.notasCacifos}
                </p>
              )}
              {(reserva.cacifos ?? [])
                .filter((c) => c.notas?.trim())
                .map((c) => (
                  <p key={c.id} className="text-xs text-text-secondary">
                    <span className="font-medium">Cacifo {c.numero}:</span> {c.notas}
                  </p>
                ))}
              {reserva.observacoesLesoes && (
                <p className="text-xs text-text-secondary whitespace-pre-wrap">
                  <span className="font-medium">Lesões / Alergias:</span> {reserva.observacoesLesoes}
                </p>
              )}
            </div>
          )}

          {/* Estado do pagamento */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
            <div className="flex items-center gap-2">
              {pago ? <CheckCircle2 size={18} className="text-accent-green-500" /> : <Wallet size={18} className="text-accent-orange-500" />}
              <span className="text-sm font-medium text-text-primary">
                {pago ? "Pago" : "Por pagar"}
              </span>
            </div>
            <Switch checked={pago} onChange={setPago} />
          </div>

          {/* Valor + Método */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Valor Pago (€)</label>
              <InputField type="number" step={0.01} min={0} value={valorPago} onChange={(e) => setValorPago(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Método</label>
              <Select options={METODO_PAGAMENTO_OPTIONS} value={metodoPagamento} onChange={setMetodoPagamento} placeholder="Seleccionar..." />
            </div>
          </div>

          {/* Referência */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Referência de Pagamento</label>
            <InputField value={referenciaPagamento} onChange={(e) => setReferenciaPagamento(e.target.value)} placeholder="Ex: ref. MBWAY, transferência..." />
          </div>

          {/* Pagamento dividido */}
          <div className="border-t border-border pt-3 space-y-2">
            <Checkbox
              checked={showSplit}
              onChange={setShowSplit}
              label="Dividir pagamento (2º método)"
            />
            {showSplit && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">2º Método</label>
                  <Select options={METODO_PAGAMENTO_OPTIONS} value={metodoPagamento2} onChange={setMetodoPagamento2} placeholder="2º método..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Valor 2º (€)</label>
                  <InputField type="number" step={0.01} min={0} value={valorPago2} onChange={(e) => setValorPago2(e.target.value)} placeholder="0,00" />
                </div>
              </div>
            )}
          </div>

          {/* Caução */}
          <div className="border-t border-border pt-3">
            <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5 mb-2">
              <Shield size={14} className="text-text-muted" /> Caução
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Estado</label>
                <Select options={CAUCAO_OPTIONS} value={caucao} onChange={setCaucao} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Valor (€)</label>
                <InputField type="number" step={0.01} min={0} value={valorCaucao} onChange={(e) => setValorCaucao(e.target.value)} placeholder="0,00" />
              </div>
            </div>
          </div>

          {/* Desconto */}
          <div className="border-t border-border pt-3">
            <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5 mb-2">
              <Percent size={14} className="text-text-muted" /> Desconto
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-medium text-text-secondary mb-1">Percentagem (%)</label>
                <InputField type="number" min={0} max={100} value={descontoPercentagem} onChange={(e) => setDescontoPercentagem(e.target.value)} placeholder="0" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">Motivo</label>
                <InputField value={descontoMotivo} onChange={(e) => setDescontoMotivo(e.target.value)} placeholder="Ex: cliente habitual..." />
              </div>
            </div>
          </div>

          {/* Acertos de pagamento (acrécimos/descontos/redefinições com nota) */}
          <AjustesPagamentoSection
            reservaId={reserva.id}
            numCriancas={reserva.numCriancasConfirmadas ?? reserva.numCriancas}
          />

          {/* Resumo financeiro */}
          {total > 0 && (
            <div className="p-3 rounded-lg bg-accent-orange-50 border border-accent-orange-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-accent-orange-700">Valor Total</span>
                <span className="text-sm font-bold text-accent-orange-700">{fmtEuro.format(total)}</span>
              </div>
              {caucaoValor > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-accent-orange-600">Caução descontada</span>
                  <span className="text-xs text-accent-orange-600">- {fmtEuro.format(caucaoValor)}</span>
                </div>
              )}
              {segundo > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-accent-orange-600">2º pagamento</span>
                  <span className="text-xs text-accent-orange-600">- {fmtEuro.format(segundo)}</span>
                </div>
              )}
              {emFalta > 0 && (
                <div className="flex items-center justify-between pt-1.5 border-t border-accent-orange-200">
                  <span className="text-sm font-bold text-accent-orange-700">Falta liquidar</span>
                  <span className="text-base font-bold text-accent-orange-700">{fmtEuro.format(emFalta)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 mt-6 lg:justify-end shrink-0">
          <Button variant="outline" onClick={onClose} type="button">Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "A guardar..." : "Guardar Pagamento"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
