"use client";

import React, { useState, useCallback } from "react";
import { CreditCard, Wallet, Shield, Percent, CheckCircle2, AlertTriangle, ArrowUpDown } from "lucide-react";
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

type TabId = "pagamento" | "caucao" | "acertos";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ size?: number | string; className?: string }> }[] = [
  { id: "pagamento", label: "Pagamento", icon: CreditCard },
  { id: "caucao", label: "Caução & Desconto", icon: Shield },
  { id: "acertos", label: "Acertos", icon: ArrowUpDown },
];

interface PagamentoModalProps {
  reserva: Reserva;
  onClose: () => void;
}

export default function PagamentoModal({ reserva, onClose }: PagamentoModalProps) {
  const toast = useToast();
  const updatePagamento = useUpdatePagamento();

  const [tab, setTab] = useState<TabId>("pagamento");
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
  const metodoLabel = METODO_PAGAMENTO_OPTIONS.find((o) => o.value === metodoPagamento)?.label;
  const temAvisos = Boolean(
    reserva.notasCacifos || reserva.observacoesLesoes || (reserva.cacifos ?? []).some((c) => c.notas?.trim())
  );

  return (
    <Modal isOpen onClose={onClose} size="lg" title={`Pagamento — ${anvNome}`}>
      <div className="p-5 flex flex-col max-h-[70vh]">

        {/* ── Hero: estado + falta liquidar (sempre visível) ── */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-2.5 min-w-0">
            {pago ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-green-50 border border-accent-green-200 text-accent-green-700 text-xs font-semibold shrink-0">
                <CheckCircle2 size={13} /> Pago
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-orange-50 border border-accent-orange-200 text-accent-orange-700 text-xs font-semibold shrink-0">
                <Wallet size={13} /> Por pagar
              </span>
            )}
            {metodoPagamento !== "NONE" && (
              <span className="text-xs text-text-muted truncate">{metodoLabel}</span>
            )}
          </div>
          {total > 0 && (
            emFalta > 0 ? (
              <span className="text-sm font-bold text-accent-orange-700 shrink-0">
                Falta liquidar {fmtEuro.format(emFalta)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm font-bold text-accent-green-700 shrink-0">
                <CheckCircle2 size={15} /> Liquidado
              </span>
            )
          )}
        </div>

        {/* ── Avisos (sempre visível) ── */}
        {temAvisos && (
          <div className="p-3 mt-3 rounded-lg bg-accent-orange-50 border border-accent-orange-200 space-y-1.5">
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

        {/* ── Tabs ── */}
        <div className="flex gap-1 mt-4 border-b border-border shrink-0" role="tablist">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                  active
                    ? "border-brand-500 text-brand-700"
                    : "border-transparent text-text-muted hover:text-text-primary"
                }`}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* ── Conteúdo da tab activa ── */}
        <div className="flex-1 min-h-0 overflow-y-auto pt-4">
          {tab === "pagamento" && (
            <TabPagamento
              pago={pago} setPago={setPago}
              valorPago={valorPago} setValorPago={setValorPago}
              metodoPagamento={metodoPagamento} setMetodoPagamento={setMetodoPagamento}
              referenciaPagamento={referenciaPagamento} setReferenciaPagamento={setReferenciaPagamento}
              showSplit={showSplit} setShowSplit={setShowSplit}
              metodoPagamento2={metodoPagamento2} setMetodoPagamento2={setMetodoPagamento2}
              valorPago2={valorPago2} setValorPago2={setValorPago2}
            />
          )}
          {tab === "caucao" && (
            <TabCaucaoDesconto
              caucao={caucao} setCaucao={setCaucao}
              valorCaucao={valorCaucao} setValorCaucao={setValorCaucao}
              descontoPercentagem={descontoPercentagem} setDescontoPercentagem={setDescontoPercentagem}
              descontoMotivo={descontoMotivo} setDescontoMotivo={setDescontoMotivo}
            />
          )}
          {tab === "acertos" && (
            <AjustesPagamentoSection
              reservaId={reserva.id}
              numCriancas={reserva.numCriancasConfirmadas ?? reserva.numCriancas}
            />
          )}
        </div>

        {/* ── Footer: resumo + acções ── */}
        <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-border shrink-0">
          <div className="text-xs text-text-muted min-w-0 truncate">
            {total > 0 && (
              <>
                Total <span className="font-semibold text-text-secondary">{fmtEuro.format(total)}</span>
                {caucaoValor > 0 && <> · −{fmtEuro.format(caucaoValor)} caução</>}
                {segundo > 0 && <> · −{fmtEuro.format(segundo)} 2º pag.</>}
              </>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="outline" onClick={onClose} type="button">Cancelar</Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "A guardar..." : "Guardar Pagamento"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// Tab 1 — Pagamento (estado, valor, método, referência, split)
// ════════════════════════════════════════════════════════════════
interface TabPagamentoProps {
  pago: boolean;
  setPago: (v: boolean) => void;
  valorPago: string;
  setValorPago: (v: string) => void;
  metodoPagamento: string;
  setMetodoPagamento: (v: string) => void;
  referenciaPagamento: string;
  setReferenciaPagamento: (v: string) => void;
  showSplit: boolean;
  setShowSplit: (v: boolean) => void;
  metodoPagamento2: string;
  setMetodoPagamento2: (v: string) => void;
  valorPago2: string;
  setValorPago2: (v: string) => void;
}

const TabPagamento = React.memo(function TabPagamento({
  pago, setPago, valorPago, setValorPago, metodoPagamento, setMetodoPagamento,
  referenciaPagamento, setReferenciaPagamento, showSplit, setShowSplit,
  metodoPagamento2, setMetodoPagamento2, valorPago2, setValorPago2,
}: TabPagamentoProps) {
  return (
    <div className="space-y-4">
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
    </div>
  );
});

// ════════════════════════════════════════════════════════════════
// Tab 2 — Caução & Desconto
// ════════════════════════════════════════════════════════════════
interface TabCaucaoDescontoProps {
  caucao: string;
  setCaucao: (v: string) => void;
  valorCaucao: string;
  setValorCaucao: (v: string) => void;
  descontoPercentagem: string;
  setDescontoPercentagem: (v: string) => void;
  descontoMotivo: string;
  setDescontoMotivo: (v: string) => void;
}

const TabCaucaoDesconto = React.memo(function TabCaucaoDesconto({
  caucao, setCaucao, valorCaucao, setValorCaucao,
  descontoPercentagem, setDescontoPercentagem, descontoMotivo, setDescontoMotivo,
}: TabCaucaoDescontoProps) {
  return (
    <div className="space-y-4">
      {/* Caução */}
      <div>
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
        <p className="text-[11px] text-text-muted mt-2">
          Para descontos com nota de auditoria, prefira a tab <span className="font-medium">Acertos</span>.
        </p>
      </div>
    </div>
  );
});
