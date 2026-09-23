"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { places } from "@/lib/model";

export type LoadDraft = {
  tagId: string; product: string; origin: string; destination: string;
  supplier: string; contractReference: string; threshold: string;
  intactColor: string; activatedColor: string;
};

export function NewLoadDialog({ open, setOpen, value, setValue, onSubmit, busy, createdLoadId, error, onBeginReading }: {
  open: boolean; setOpen: (open: boolean) => void; value: LoadDraft;
  setValue: (value: LoadDraft) => void; onSubmit: (event: FormEvent) => void;
  busy: boolean; createdLoadId: string; error: string; onBeginReading: () => void;
}) {
  const [step, setStep] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const onOpenChange = (next: boolean) => { if (!next) { setStep(0); setConfirmed(false); } setOpen(next); };
  const next = () => {
    if (!formRef.current?.reportValidity()) return;
    setStep(current => current + 1);
  };
  const set = (field: keyof LoadDraft, next: string) => setValue({ ...value, [field]: next });
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogTrigger asChild><button className="button-outline"><Plus size={17}/> Nova carga</button></DialogTrigger>
    <DialogContent className="new-dialog wizard-dialog" aria-describedby={createdLoadId ? undefined : "load-subtitle"}>
      <DialogHeader><DialogTitle>{createdLoadId ? "Registro concluído" : "Cadastrar carga"}</DialogTitle></DialogHeader>
      {createdLoadId ? <div className="wizard-complete" role="status">
        <span className="wizard-check"><Check size={32}/></span>
        <h3>Registro concluído</h3><p>Carga {createdLoadId} cadastrada. Você já pode fazer a primeira leitura digitando o código. Gravar a URL no cartão NFC é opcional.</p>
        <button type="button" className="button-main" onClick={() => { setStep(0); setConfirmed(false); onBeginReading(); }}>Registrar primeira leitura <ArrowRight size={17}/></button>
        <button type="button" className="button-outline" onClick={() => onOpenChange(false)}>Voltar às cargas</button>
      </div> : <>
        <p className="dialog-subtitle" id="load-subtitle">Identifique o lote destinado à alimentação escolar. Você pode adicionar uma etiqueta NFC depois.</p>
        <div className="wizard-progress" aria-label={`Etapa ${step + 1} de 3`}><span>Etapa {step + 1} de 3</span><strong>{["Identificação", "Rota e contrato", "Indicador"][step]}</strong><div className="wizard-track"><i style={{ width: `${(step + 1) / 3 * 100}%` }}/></div></div>
        {error && <p className="wizard-error" role="alert">{error}</p>}
        <form ref={formRef} className="dialog-form wizard-form" onSubmit={event => { event.preventDefault(); if (step === 2) onSubmit(event); else next(); }}>
          {step === 0 && <div className="wizard-fields">
            <label className="field">Código da carga<input required minLength={3} maxLength={50} pattern="[A-Za-z0-9-]+" placeholder="Ex.: TT-SE-001" value={value.tagId} onChange={event => set("tagId", event.target.value.toUpperCase())}/></label>
            <label className="field">Produto ou lote<input required maxLength={100} placeholder="Ex.: Laticínios, lote 204" value={value.product} onChange={event => set("product", event.target.value)}/></label>
          </div>}
          {step === 1 && <div className="wizard-fields">
            <div className="form-row"><label className="field">Origem<input required maxLength={100} list="cities-origin" value={value.origin} onChange={event => set("origin", event.target.value)}/></label><label className="field">Escola ou destino<input required maxLength={100} list="cities-origin" value={value.destination} onChange={event => set("destination", event.target.value)}/></label></div>
            <div className="form-row"><label className="field">Fornecedor ou agricultor familiar<input maxLength={100} placeholder="Ex.: Cooperativa local" value={value.supplier} onChange={event => set("supplier", event.target.value)}/></label><label className="field">Contrato ou pedido<input maxLength={100} placeholder="Ex.: Pedido 2026/42" value={value.contractReference} onChange={event => set("contractReference", event.target.value)}/></label></div>
            <datalist id="cities-origin">{places.map(place => <option key={place} value={place}/>)}</datalist>
          </div>}
          {step === 2 && <div className="wizard-fields">
            <label className="field">Limiar do indicador (°C)<input type="number" min="-50" max="100" step="0.1" required value={value.threshold} onChange={event => set("threshold", event.target.value)}/></label>
            <p className="dialog-help">O limiar pertence ao indicador físico; o celular não mede a temperatura. A câmera sinaliza tons de vermelho, e compara outras cores com a referência íntegra.</p>
            <div className="form-row"><label className="field">Referência íntegra<input type="color" value={value.intactColor} onChange={event => set("intactColor", event.target.value)}/></label><label className="field">Referência ativada<input type="color" value={value.activatedColor} onChange={event => set("activatedColor", event.target.value)}/></label></div>
            <p className="dialog-help">A referência ativada documenta a cor do indicador escolhido. A análise considera a faixa de vermelho; luz e reflexos podem exigir revisão manual.</p>
            <label className="dialog-help wizard-confirm"><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)}/> Conferi as cores com o indicador físico deste lote.</label>
          </div>}
          <div className="wizard-actions">{step > 0 && <button type="button" className="button-outline" onClick={() => setStep(step - 1)}><ArrowLeft size={16}/> Voltar</button>}<button className="button-main" type="submit" disabled={busy}>{busy ? "Cadastrando..." : step === 2 ? "Cadastrar carga" : "Próxima etapa"} {!busy && <ArrowRight size={16}/>}</button></div>
        </form>
      </>}
    </DialogContent>
  </Dialog>;
}
