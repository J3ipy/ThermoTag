"use client";

import { useState } from "react";
import { ArrowRight, CircleAlert, ClipboardList, Clock3, PackageCheck } from "lucide-react";
import type { Shipment } from "@/lib/model";
import type { PendingCheckin } from "@/lib/offline";

type Filter = "all" | "alert" | "unread" | "delivered";

const current = (shipment: Shipment) => shipment.checkins.at(-1);
const hasAlert = (shipment: Shipment) => current(shipment)?.status === "alert";
const delivered = (shipment: Shipment) => current(shipment)?.stage === "Recebimento";

export function AdminPanel({ shipments, pending, loading, busy, onOpenShipment, onLoadDemo }: {
  shipments: Shipment[];
  pending: PendingCheckin[];
  loading: boolean;
  busy: boolean;
  onOpenShipment: (id: string) => void;
  onLoadDemo: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const alerts = shipments.filter(hasAlert);
  const unread = shipments.filter(shipment => !shipment.checkins.length);
  const completed = shipments.filter(delivered);
  const filtered = shipments.filter(shipment => filter === "all" ||
    filter === "alert" && hasAlert(shipment) ||
    filter === "unread" && !shipment.checkins.length ||
    filter === "delivered" && delivered(shipment));

  return <section className="admin-view" aria-label="Painel administrativo ilustrativo">
    <div className="page-heading"><div><p className="eyebrow">VISÃO DE GESTÃO · DEMONSTRAÇÃO</p><h1>Painel administrativo</h1><p>Acompanhe cargas, fornecedores e registros que precisam de atenção.</p></div></div>
    <div className="admin-disclaimer"><ClipboardList size={20}/><p>Visualização ilustrativa dos dados cadastrados no MVP. Este painel não controla acesso nem substitui a análise do fiscal.</p></div>
    <div className="admin-metrics" aria-label="Resumo da operação">
      <div className="admin-metric"><span>Cargas cadastradas</span><strong>{shipments.length}</strong><small>Na operação</small></div>
      <div className="admin-metric warning"><span>Alertas térmicos</span><strong>{alerts.length}</strong><small>Indicam inspeção</small></div>
      <div className="admin-metric"><span>Aguardando leitura</span><strong>{unread.length}</strong><small>Sem primeiro check-in</small></div>
      <div className="admin-metric"><span>Entregas registradas</span><strong>{completed.length}</strong><small>Com recebimento</small></div>
    </div>
    {pending.length > 0 && <div className="admin-offline" role="status"><Clock3 size={19}/><p><strong>{pending.length} registro{pending.length === 1 ? "" : "s"} neste aparelho aguardando sincronização.</strong> Eles podem ainda não aparecer na tabela do servidor.</p></div>}
    <div className="panel admin-table-panel">
      <div className="panel-header"><div><p className="eyebrow">ACOMPANHAMENTO</p><h2>Cargas e contratos</h2></div><label className="admin-filter">Mostrar<select value={filter} onChange={event => setFilter(event.target.value as Filter)}><option value="all">Todas ({shipments.length})</option><option value="alert">Alertas ({alerts.length})</option><option value="unread">Sem leitura ({unread.length})</option><option value="delivered">Entregues ({completed.length})</option></select></label></div>
      {loading ? <p className="admin-empty">Carregando dados...</p> : !shipments.length ? <div className="admin-empty"><p>Não há cargas cadastradas para acompanhar.</p><button type="button" className="button-outline" onClick={onLoadDemo} disabled={busy}>Carregar dados de demonstração</button></div> : !filtered.length ? <p className="admin-empty">Nenhuma carga corresponde ao filtro selecionado.</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Carga</th><th>Fornecedor e contrato</th><th>Destino</th><th>Último registro</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{filtered.map(shipment => { const last = current(shipment); return <tr key={shipment.id}><td><strong>{shipment.id}</strong><small>{shipment.product}{shipment.demo ? " · Demo" : ""}</small></td><td>{shipment.supplier || "Não informado"}<small>{shipment.contractReference || "Sem contrato informado"}</small></td><td>{shipment.destination}</td><td>{last ? <>{last.stage} · {last.place}<small>{last.actor}</small></> : "Aguardando"}</td><td><span className={`admin-badge ${hasAlert(shipment) ? "is-alert" : delivered(shipment) ? "is-done" : ""}`}>{hasAlert(shipment) ? "Alerta térmico" : delivered(shipment) ? "Entregue" : last ? "Em trânsito" : "Sem leitura"}</span></td><td><button type="button" className="admin-link" onClick={() => onOpenShipment(shipment.id)}>Ver histórico <ArrowRight size={15}/></button></td></tr>; })}</tbody></table></div>}
    </div>
    <div className="admin-secondary">
      <section className="panel admin-focus"><div className="panel-header"><div><p className="eyebrow">PRIORIDADE</p><h2>Ocorrências para verificar</h2></div><CircleAlert size={19}/></div>{alerts.length ? <ul>{alerts.slice(0, 4).map(shipment => { const alert = shipment.checkins.find(event => event.status === "alert"); return <li key={shipment.id}><div><strong>{shipment.id}</strong><small>{alert ? `Primeiro alerta em ${alert.place} · ${alert.stage}` : "Alerta registrado"}</small></div><button type="button" className="admin-link" onClick={() => onOpenShipment(shipment.id)}>Abrir <ArrowRight size={15}/></button></li>; })}</ul> : <p className="admin-empty">Nenhum alerta nas cargas cadastradas.</p>}</section>
      <section className="panel admin-focus"><div className="panel-header"><div><p className="eyebrow">PRÓXIMOS PASSOS</p><h2>Sem primeira leitura</h2></div><PackageCheck size={19}/></div>{unread.length ? <ul>{unread.slice(0, 4).map(shipment => <li key={shipment.id}><div><strong>{shipment.id}</strong><small>{shipment.origin} → {shipment.destination}</small></div><button type="button" className="admin-link" onClick={() => onOpenShipment(shipment.id)}>Abrir <ArrowRight size={15}/></button></li>)}</ul> : <p className="admin-empty">Todas as cargas cadastradas já têm ao menos uma leitura.</p>}</section>
    </div>
  </section>;
}
