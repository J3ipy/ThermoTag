"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowRight, Check, ChevronRight, CircleAlert, Clock3, Compass, LayoutDashboard, MapPin, Package, Radio, ScanLine, ShieldCheck, Thermometer, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NewLoadDialog } from "@/components/new-load-dialog";
import { AdminPanel } from "@/components/admin-panel";
import type { Shipment, Checkin } from "@/lib/model";
import { places } from "@/lib/model";
import { classifyColor } from "@/lib/color";
import { cachedShipments, pendingCheckins, queueCheckin, removeCheckin, saveShipments, type PendingCheckin } from "@/lib/offline";
import { PhotoEvidence } from "@/components/photo-evidence";

const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value));
const timeOnly = (value: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value));
const latest = (s: Shipment) => s.checkins.at(-1);
const isAlert = (s: Shipment) => latest(s)?.status === "alert";
const isDelivered = (s: Shipment) => latest(s)?.stage === "Recebimento";

async function post(path: string, body?: object) {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
  const data = await response.json() as { error?: string; id?: string };
  if (!response.ok) throw Object.assign(new Error(data.error || "Falha ao salvar os dados."), { status: response.status });
  return data;
}

function Brand() {
  return <div className="brand"><span className="brand-mark"><Thermometer size={23} strokeWidth={2.5} /></span><span>THERMO<span className="brand-accent">TAG</span><small>SE</small></span></div>;
}

function Status({ alert, delivered }: { alert?: boolean; delivered?: boolean }) {
  return <span className={`status ${alert ? "status-alert" : delivered ? "status-done" : "status-ok"}`}><i />{alert ? "Alerta térmico" : delivered ? "Entregue" : "Em trânsito"}</span>;
}

function RouteMap({ shipment }: { shipment: Shipment | undefined }) {
  const points = (shipment?.checkins || []).filter((p) => p.latitude !== null && p.longitude !== null);
  const x = (lon: number) => 55 + ((lon + 37.73) / 0.78) * 570;
  const y = (lat: number) => 330 - ((lat + 11.42) / 0.72) * 270;
  const polyline = points.map(p => `${x(p.longitude!)},${y(p.latitude!)}`).join(" ");
  return <div className="map-canvas" role="img" aria-label={points.length ? `Mapa esquemático de ${points.length} registros geográficos da carga ${shipment?.id}` : "Mapa esquemático sem registros geográficos"}>
    <div className="map-top"><span><Compass size={15} /> Sergipe · pontos registrados</span><span className="map-scale">Visão geográfica simplificada</span></div>
    <svg viewBox="0 0 700 390" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs><pattern id="mapGrid" width="46" height="46" patternUnits="userSpaceOnUse"><path d="M 46 0 L 0 0 0 46" fill="none" stroke="#264651" strokeWidth="1" opacity=".33" /></pattern><linearGradient id="sea"><stop stopColor="#12333b"/><stop offset="1" stopColor="#0c2831"/></linearGradient></defs>
      <rect width="700" height="390" fill="url(#sea)"/><rect width="700" height="390" fill="url(#mapGrid)"/>
      <path d="M580 0 C550 90 630 140 600 213 C565 291 625 360 595 390 L700 390 L700 0Z" fill="#17404b" opacity=".75" />
      <path d="M580 0 C550 90 630 140 600 213 C565 291 625 360 595 390" fill="none" stroke="#3e777e" strokeWidth="2" opacity=".7" />
      <text x="632" y="190" fill="#6aa0a4" fontSize="12" transform="rotate(90 632 190)">OCEANO ATLÂNTICO</text>
      <text x="48" y="365" fill="#65858c" fontSize="11" letterSpacing="2">37° O</text><text x="480" y="365" fill="#65858c" fontSize="11" letterSpacing="2">11° S</text>
      {points.length > 1 && <polyline points={polyline} fill="none" stroke="#79d0bb" strokeWidth="3" strokeDasharray="8 7" strokeLinecap="round" />}
      {points.map((p, i) => <g key={p.id}><circle cx={x(p.longitude!)} cy={y(p.latitude!)} r="15" fill={p.status === "alert" ? "#e77a60" : "#4ac3a8"} opacity=".18" /><circle cx={x(p.longitude!)} cy={y(p.latitude!)} r="7" fill={p.status === "alert" ? "#f28c74" : "#66d9bb"} stroke="#0b252c" strokeWidth="2" /><text x={x(p.longitude!) + 13} y={y(p.latitude!) - (i % 2 ? 10 : -23)} fill="#edf9f5" fontSize="12" fontWeight="600" paintOrder="stroke" stroke="#0b252c" strokeWidth="4">{p.place}</text></g>)}
    </svg>
    <div className="map-legend"><span><i className="legend-dot" /> Indicador íntegro</span><span><i className="legend-dot red" /> Indicador ativado</span></div>
  </div>;
}

function Passport({ shipment, tagLink, onWriteTag, onCopyLink, tagWriteStatus }: { shipment: Shipment; tagLink: string; onWriteTag: () => void; onCopyLink: () => void; tagWriteStatus: string }) {
  const firstAlert = shipment.checkins.findIndex(p => p.status === "alert");
  const previous = firstAlert > 0 ? shipment.checkins[firstAlert - 1] : null;
  const first = firstAlert >= 0 ? shipment.checkins[firstAlert] : null;
  return <div className="passport">
    <div className="passport-header"><div><p className="eyebrow">PASSAPORTE DIGITAL</p><h2>{shipment.id} {shipment.demo ? <span className="demo-chip">DEMONSTRAÇÃO</span> : null}</h2><p>{shipment.product} · limiar da etiqueta: {shipment.threshold} °C</p>{shipment.supplier && <p>Fornecedor: {shipment.supplier}{shipment.contractReference ? ` · Contrato: ${shipment.contractReference}` : ""}</p>}</div><Status alert={isAlert(shipment)} delivered={isDelivered(shipment)} /></div>
    <div className="passport-route"><div><span>ORIGEM</span><strong>{shipment.origin}</strong></div><ArrowRight size={20}/><div><span>DESTINO</span><strong>{shipment.destination}</strong></div></div>
    <div className="tag-provision"><div><p className="eyebrow">CÓDIGO DA CARGA · NFC OPCIONAL</p><strong>{shipment.tagId}</strong><p>Você pode digitar este código ao registrar a leitura. Se usar NFC, grave a URL na tag para abrir o check-in por aproximação.</p></div><input aria-label="URL opcional para gravar na etiqueta NFC" value={tagLink} readOnly onFocus={e => e.currentTarget.select()} /><div className="tag-actions"><button className="button-main" onClick={onWriteTag} disabled={!tagLink}><Radio size={16}/> Gravar com Android</button><button className="button-outline" onClick={onCopyLink} disabled={!tagLink}>Copiar URL</button></div><small>Para testar com NFC, use uma tag NDEF gravável. A gravação substitui o conteúdo anterior; não bloqueie a tag durante os testes.</small>{tagWriteStatus && <p className="tag-write-status" role="status">{tagWriteStatus}</p>}</div>
    {first && <div className="finding"><CircleAlert size={19} /><div><strong>Possível exposição térmica identificada</strong><p>{previous ? `Entre o último registro normal em ${previous.place} e o primeiro alerta em ${first.place}.` : `Detectada no primeiro registro em ${first.place}; não há trecho anterior para delimitar.`} A leitura delimita um intervalo, não informa a temperatura nem o momento exato.</p></div></div>}
    <div className="timeline-heading"><h3>Histórico de leituras</h3><span>{shipment.checkins.length} registro{shipment.checkins.length === 1 ? "" : "s"}</span></div>
    {shipment.checkins.length ? <ol className="timeline">{shipment.checkins.map((event, index) => <li key={event.id} className={event.status === "alert" ? "timeline-alert" : ""}><span className="timeline-node">{event.status === "alert" ? <CircleAlert size={16}/> : <Check size={15}/>}</span><div className="timeline-content"><div><strong>{event.stage} · {event.place}</strong><time>{dateTime(event.capturedAt || event.recordedAt)}</time></div><p>{event.status === "alert" ? "Indicador ativado" : "Indicador íntegro"} · {event.actor}</p><small>{event.locationSource === "device" ? "GPS do dispositivo" : "Local informado; mapa aproximado"}{event.demo ? " · dado simulado" : ""}{event.capturedAt ? ` · Sincronizado ${dateTime(event.recordedAt)}` : ""}</small>{event.photoKey && <div className="evidence-detail"><a href={`/api/evidence?id=${event.id}`} target="_blank" rel="noopener noreferrer"><img src={`/api/evidence?id=${event.id}`} alt={`Indicador fotografado em ${event.place}`}/></a><span>Cor medida: {event.sampledColor} · análise: {event.colorResult === "normal" ? "íntegro" : event.colorResult === "alert" ? "ativado" : "inconclusiva"}{event.justification ? ` · Justificativa: ${event.justification}` : ""}</span></div>}</div>{index < shipment.checkins.length - 1 && <span className="timeline-line" />}</li>)}</ol> : <div className="empty-small"><Clock3 size={21}/> Aguardando a primeira leitura desta etiqueta.</div>}
    <p className="passport-note"><ShieldCheck size={15}/> O indicador físico deve ser validado para cada produto. Foto e classificação auxiliam a fiscalização; não comprovam a temperatura nem a responsabilidade pela ocorrência.</p>
  </div>;
}

type NDEFRecordLike = { recordType: string; data: DataView; encoding?: string };
type NDEFReaderLike = { scan: (options?: { signal?: AbortSignal }) => Promise<void>; write: (message: {records: {recordType: "url"; data: string}[]}) => Promise<void>; onreading: ((event: { serialNumber: string; message: { records: NDEFRecordLike[] } }) => void) | null; onreadingerror: (() => void) | null };

export default function Home() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState("painel");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createdLoadId, setCreatedLoadId] = useState("");
  const [readingOpen, setReadingOpen] = useState(false);
  const [readingStep, setReadingStep] = useState(0);
  const [readingSavedOffline, setReadingSavedOffline] = useState(false);
  const [readingError, setReadingError] = useState("");
  const readingFormRef = useRef<HTMLFormElement>(null);
  const [newLoad, setNewLoad] = useState({ tagId: "", product: "", origin: "Estância", destination: "Aracaju", supplier: "", contractReference: "", threshold: "8", intactColor: "#eeeeee", activatedColor: "#b3261e" });
  const [form, setForm] = useState({ tagId: "", stage: "Checkpoint", place: "São Cristóvão", actor: "", status: "normal" as "normal" | "alert" });
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoMessage, setGeoMessage] = useState("Localização não capturada; o local informado será registrado.");
  const [scanStatus, setScanStatus] = useState("");
  const [webNfcAvailable, setWebNfcAvailable] = useState(false);
  const [tagWriteStatus, setTagWriteStatus] = useState("");
  const [origin, setOrigin] = useState("");
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState<PendingCheckin[]>([]);
  const [photo, setPhoto] = useState("");
  const [sampledColor, setSampledColor] = useState("");
  const [justification, setJustification] = useState("");
  const syncLock = useRef(false);
  const handledLink = useRef(false);
  const handleLoadDialogOpen = (open: boolean) => { if (open) setCreatedLoadId(""); setDialogOpen(open); };
  const openReading = useCallback(() => { setTab("leitura"); setReadingStep(0); setReadingError(""); setReadingOpen(true); }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/shipments", { cache: "no-store" });
      const data = await response.json() as { error?: string; shipments: Shipment[] };
      if (!response.ok) throw new Error(data.error || "Dados indisponíveis.");
      setShipments(data.shipments);
      void saveShipments(data.shipments).catch(() => {});
      setSelectedId(current => current || data.shipments[0]?.id || "");
      setError("");
    } catch (e) {
      try {
        const saved = await cachedShipments<Shipment[]>();
        if (saved) { setShipments(saved); setSelectedId(current => current || saved[0]?.id || ""); setError(""); }
        else setError((e as Error).message);
      } catch { setError((e as Error).message); }
    }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => { setWebNfcAvailable("NDEFReader" in window); }, []);
  useEffect(() => {
    setOnline(navigator.onLine);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    void pendingCheckins().then(setPending).catch(() => setError("O armazenamento offline não está disponível neste navegador."));
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  useEffect(() => {
    if (loading || handledLink.current) return;
    handledLink.current = true;
    const code = new URLSearchParams(window.location.search).get("tag")?.trim().toUpperCase();
    if (!code || !/^[A-Z0-9-]{3,50}$/.test(code)) return;
    const matched = shipments.find(s => s.tagId === code);
    setForm(f => ({ ...f, tagId: code, stage: matched?.checkins.length ? "Checkpoint" : "Expedição", place: matched?.checkins.length ? f.place : (matched?.origin || f.place) }));
    openReading();
    setScanStatus(matched ? `Etiqueta ${code} identificada. Confira o indicador físico e registre.` : `Etiqueta ${code} não cadastrada. Cadastre a carga antes do check-in.`);
    if (matched) setSelectedId(matched.id);
  }, [loading, shipments, openReading]);

  const selected = shipments.find(s => s.id === selectedId) || shipments[0];
  const formShipment = shipments.find(s => s.tagId === form.tagId.trim().toUpperCase());
  const colorResult = sampledColor && formShipment?.intactColor && formShipment.activatedColor ? classifyColor(sampledColor, formShipment.intactColor, formShipment.activatedColor) : "uncertain";
  const tagLink = selected && origin ? `${origin}/?tag=${encodeURIComponent(selected.tagId)}` : "";
  const active = shipments.filter(s => !isDelivered(s)).length;
  const alerts = shipments.filter(isAlert).length;
  const readings = shipments.reduce((sum, s) => sum + s.checkins.length, 0);
  const feed = useMemo(() => shipments.flatMap(s => s.checkins.map(event => ({ ...event, loadId: s.id, demoLoad: s.demo }))).sort((a,b) => b.recordedAt.localeCompare(a.recordedAt)).slice(0,6), [shipments]);

  const submit = async (path: string, body: object, after?: (data: {id?:string}) => void) => {
    setBusy(true); setError(""); setNotice("");
    try { const data = await post(path, body); await refresh(); after?.(data); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const loadDemo = () => void submit("/api/demo", {}, data => { setSelectedId(data.id || "SE-02931"); setNotice("Percurso simulado carregado. Os registros estão identificados como demonstração."); });
  const createLoad = (e: React.FormEvent) => { e.preventDefault(); void submit("/api/shipments", { ...newLoad, threshold: Number(newLoad.threshold) }, data => { setSelectedId(data.id || ""); setCreatedLoadId(data.id || newLoad.tagId.toUpperCase()); setForm(f => ({ ...f, tagId: newLoad.tagId.toUpperCase(), stage: "Expedição", place: newLoad.origin })); setNotice("Carga cadastrada. Grave a URL na tag e depois registre a primeira leitura."); }); };
  const syncPending = useCallback(async () => {
    if (syncLock.current || !navigator.onLine) return;
    syncLock.current = true;
    try {
      const entries = (await pendingCheckins()).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
      for (const entry of entries) {
        try { await post("/api/checkins", entry); }
        catch (problem) {
          if (problem instanceof TypeError || [502, 503, 504].includes((problem as {status?:number}).status || 0)) break;
          setError(`Registro ${entry.tagId} pendente: ${String((problem as Error).message)} Corrija a situação antes de sincronizar.`);
          break;
        }
        await removeCheckin(entry.id);
      }
      setPending(await pendingCheckins());
      await refresh();
    } catch { setError("Não foi possível sincronizar. Os registros continuam salvos neste aparelho."); }
    finally { syncLock.current = false; }
  }, [refresh]);
  useEffect(() => {
    if (online && pending.length) void syncPending();
  }, [online, pending.length, syncPending]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (navigator.onLine) void syncPending(); }, 30000);
    return () => window.clearInterval(timer);
  }, [syncPending]);
  const saveReading = async (e: React.FormEvent) => {
    e.preventDefault(); setReadingError(""); setError(""); setNotice("");
    if (!formShipment) { setReadingError("Cadastre a etiqueta antes de registrar uma leitura."); return; }
    if (pending.some(item => item.tagId === formShipment.tagId && item.stage === "Recebimento")) { setReadingError("Já existe um recebimento desta carga aguardando sincronização."); return; }
    if (form.status === "normal" && pending.some(item => item.tagId === formShipment.tagId && item.status === "alert")) { setReadingError("Há um alerta aguardando sincronização; o indicador não pode voltar ao estado normal."); return; }
    if (!photo || !sampledColor) { setReadingError("Tire uma foto e toque na área colorida do indicador."); return; }
    if (colorResult !== form.status && !justification.trim()) { setReadingError("A cor está inconclusiva ou difere da condição escolhida. Informe uma justificativa."); return; }
    const entry: PendingCheckin = { ...form, tagId: form.tagId.trim().toUpperCase(), latitude: location?.latitude ?? null, longitude: location?.longitude ?? null, id: crypto.randomUUID(), photo, sampledColor, justification: justification.trim(), capturedAt: new Date().toISOString() };
    setBusy(true);
    try {
      if (navigator.onLine) {
        try { await post("/api/checkins", entry); await refresh(); setReadingSavedOffline(false); setNotice("Check-in e foto registrados no servidor."); }
        catch (problem) { if (!(problem instanceof TypeError) && ![502, 503, 504].includes((problem as {status?:number}).status || 0)) throw problem; await queueCheckin(entry); setPending(await pendingCheckins()); setReadingSavedOffline(true); setNotice("Sem conexão com o servidor. Registro e foto salvos neste aparelho para sincronizar."); }
      } else { await queueCheckin(entry); setPending(await pendingCheckins()); setReadingSavedOffline(true); setNotice("Registro e foto salvos neste aparelho. Serão enviados quando houver conexão."); }
      setPhoto(""); setSampledColor(""); setJustification(""); setLocation(null);
      setSelectedId(formShipment.id); setReadingStep(3);
    } catch (problem) { setReadingError((problem as Error).message); }
    finally { setBusy(false); }
  };
  const getLocation = () => {
    if (!navigator.geolocation) { setGeoMessage("Este navegador não oferece geolocalização. Informe o local."); return; }
    setLocation(null);
    setGeoMessage("Obtendo localização...");
    navigator.geolocation.getCurrentPosition(p => { setLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude }); setGeoMessage(`GPS capturado · ${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`); }, error => {
      if (error.code === error.PERMISSION_DENIED) setGeoMessage("Localização bloqueada. No iPhone, permita a localização para o Safari e para este site nos Ajustes; ou informe o local manualmente.");
      else if (error.code === error.TIMEOUT) setGeoMessage("O GPS demorou a responder. Tente novamente em local aberto ou informe o local manualmente.");
      else setGeoMessage("Não foi possível obter o GPS. Informe o local manualmente.");
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 });
  };
  const scanNfc = async () => {
    const Reader = (window as unknown as { NDEFReader?: new () => NDEFReaderLike }).NDEFReader;
    if (!Reader) { setScanStatus("O botão de leitura NFC requer Chrome no Android. No iPhone, aproxime a tag gravada com URL para abrir esta página; ou digite o código."); return; }
    try {
      const reader = new Reader();
      const abort = new AbortController();
      setScanStatus("Aproxime a etiqueta NFC do celular...");
      await reader.scan({ signal: abort.signal });
      reader.onreadingerror = () => setScanStatus("Não foi possível ler a etiqueta. Tente novamente ou digite o código.");
      reader.onreading = event => {
        let code = "";
        for (const record of event.message.records) {
          if (record.recordType === "text" || record.recordType === "url") {
            const value = new TextDecoder(record.encoding || "utf-8").decode(record.data);
            try {
              const url = new URL(value);
              if (url.origin === window.location.origin) code = url.searchParams.get("tag")?.trim().toUpperCase() || "";
            } catch {
              if (record.recordType === "text") code = value.trim().toUpperCase();
            }
            if (/^[A-Z0-9-]{3,50}$/.test(code)) break;
            code = "";
          }
        }
        code ||= event.serialNumber?.toUpperCase().replace(/[^A-Z0-9-]/g, "") || "";
        setForm(f => ({ ...f, tagId: code }));
        setScanStatus(!code ? "Etiqueta detectada sem código. Digite o código impresso." : shipments.some(s => s.tagId === code) ? `Etiqueta lida: ${code}. Confirme o indicador visual e registre.` : `Código ${code} lido, mas ainda não cadastrado. Cadastre a carga antes do check-in.`);
        abort.abort();
      };
    } catch { setScanStatus("Leitura NFC cancelada ou indisponível. Digite o código da etiqueta."); }
  };
  const writeTag = async () => {
    const Reader = (window as unknown as { NDEFReader?: new () => NDEFReaderLike }).NDEFReader;
    if (!Reader) { setTagWriteStatus("Gravação pelo site requer Chrome no Android. Copie a URL e use um aplicativo gravador de tags NDEF no iPhone."); return; }
    if (!tagLink) return;
    setTagWriteStatus("Aproxime a tag NFC gravável do Android para escrever a URL...");
    try { await new Reader().write({ records: [{ recordType: "url", data: tagLink }] }); setTagWriteStatus("URL gravada. Afaste o celular e aproxime novamente a tag para conferir a leitura."); }
    catch { setTagWriteStatus("Não foi possível gravar. Confira se NFC está ativo e se a tag aceita gravação NDEF."); }
  };
  const copyTagLink = async () => {
    try { await navigator.clipboard.writeText(tagLink); setTagWriteStatus("URL copiada. Grave-a na tag como registro NDEF do tipo URL."); }
    catch { setTagWriteStatus("Selecione e copie a URL no campo acima para gravá-la como registro NDEF do tipo URL."); }
  };

  return <div className="app-shell">
    <aside className="sidebar"><Brand/><p className="sidebar-kicker">CENTRAL LOGÍSTICA</p><nav aria-label="Navegação principal"><button className={tab === "painel" ? "nav-item selected" : "nav-item"} onClick={() => setTab("painel")}><Activity size={19}/> Visão geral</button><button className={tab === "leitura" ? "nav-item selected" : "nav-item"} onClick={() => openReading()}><ScanLine size={19}/> Registrar leitura</button><button className={tab === "cargas" ? "nav-item selected" : "nav-item"} onClick={() => setTab("cargas")}><Package size={19}/> Passaportes</button><button className={tab === "admin" ? "nav-item selected" : "nav-item"} onClick={() => setTab("admin")}><LayoutDashboard size={19}/> Administração</button></nav><div className="sidebar-bottom"><span className="signal"><i/> Sistema operacional</span><p>Protótipo de rastreabilidade<br/>da cadeia de frio · Sergipe</p></div></aside>
    <main className="main"><header className="topbar"><div className="mobile-brand"><Brand/></div><div className="topbar-context"><span className="live-dot"/> CENTRAL DE OPERAÇÕES <span className="topbar-separator">/</span> SERGIPE</div><div className="topbar-right"><span className="topbar-date">{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date())}</span><span className="avatar">SE</span></div></header>
      <div className="content">
        <div className="sync-strip" role="status">{online ? "Conectado" : "Sem conexão · registros salvos no aparelho"} · {pending.length} pendente{pending.length === 1 ? "" : "s"}{pending.length > 0 && <button type="button" onClick={() => void syncPending()} disabled={!online}>Sincronizar agora</button>}</div>
        {error && <div className="feedback error" role="alert"><CircleAlert size={17}/>{error}<button onClick={() => setError("")} aria-label="Fechar aviso"><X size={16}/></button></div>}
        {notice && <div className="feedback success" role="status"><Check size={17}/>{notice}<button onClick={() => setNotice("")} aria-label="Fechar aviso"><X size={16}/></button></div>}
        <Tabs value={tab} onValueChange={value => value === "leitura" ? openReading() : setTab(value)}><TabsList className="mobile-tabs"><TabsTrigger value="painel">Painel</TabsTrigger><TabsTrigger value="leitura">Leitura</TabsTrigger><TabsTrigger value="cargas">Cargas</TabsTrigger><TabsTrigger value="admin">Admin</TabsTrigger></TabsList>
          <TabsContent value="painel"><div className="page-heading"><div><p className="eyebrow">PAINEL DE MONITORAMENTO</p><h1>Visão geral da operação</h1><p>Acompanhe as entregas de alimentos perecíveis para a alimentação escolar.</p></div><button className="button-main" onClick={() => openReading()}><ScanLine size={18}/> Nova leitura</button></div>
            {loading ? <div className="loading">Carregando cargas...</div> : shipments.length === 0 ? <div className="empty-state"><div className="empty-icon"><Radio size={30}/></div><h2>Pronto para monitorar a primeira carga</h2><p>Cadastre uma etiqueta ou carregue o percurso simulado para conhecer o painel.</p><div className="empty-actions"><NewLoadDialog open={dialogOpen} setOpen={handleLoadDialogOpen} value={newLoad} setValue={setNewLoad} onSubmit={createLoad} busy={busy} createdLoadId={createdLoadId} error={error} onBeginReading={() => { setDialogOpen(false); openReading(); }}/><button className="button-outline" onClick={loadDemo} disabled={busy}>Carregar demonstração</button></div></div> : <>
              <div className="metrics"><Metric icon={<Package size={20}/>} label="Cargas cadastradas" value={shipments.length} detail={`${active} em andamento`}/><Metric icon={<ScanLine size={20}/>} label="Leituras registradas" value={readings} detail="Em todas as etapas"/><Metric icon={<CircleAlert size={20}/>} label="Cargas com alerta" value={alerts} detail="Indicador ativado" warn/></div>
              <div className="dashboard-grid"><section className="panel map-panel"><div className="panel-header"><div><p className="eyebrow">INTELIGÊNCIA TERRITORIAL</p><h2>Trajeto da carga</h2></div><select aria-label="Selecionar carga no mapa" value={selected?.id || ""} onChange={e => setSelectedId(e.target.value)}>{shipments.map(s => <option value={s.id} key={s.id}>{s.id}{s.demo ? " · demo" : ""}</option>)}</select></div><RouteMap shipment={selected}/><p className="map-caption">Pontos com GPS ou centro aproximado da cidade informada. A linha não representa o caminho percorrido.</p></section>
                <section className="panel feed-panel"><div className="panel-header"><div><p className="eyebrow">ATIVIDADE RECENTE</p><h2>Últimas leituras</h2></div><span className="panel-count">{feed.length}</span></div><div className="feed-list">{feed.length ? feed.map(event => <button key={event.id} className="feed-item" onClick={() => { setSelectedId(event.loadId); setTab("cargas"); }}><span className={`feed-icon ${event.status === "alert" ? "alert" : ""}`}>{event.status === "alert" ? <CircleAlert size={18}/> : <Check size={18}/>}</span><span className="feed-copy"><strong>{event.status === "alert" ? "Alerta em " : "Leitura em "}{event.place}</strong><small>{event.loadId} · {event.stage}{event.demoLoad ? " · demo" : ""}</small></span><time>{timeOnly(event.recordedAt)}</time></button>) : <p className="muted-inset">Ainda não há leituras registradas.</p>}</div></section></div>
              <section className="panel loads-panel"><div className="panel-header"><div><p className="eyebrow">OPERAÇÃO</p><h2>Cargas monitoradas</h2></div><NewLoadDialog open={dialogOpen} setOpen={handleLoadDialogOpen} value={newLoad} setValue={setNewLoad} onSubmit={createLoad} busy={busy} createdLoadId={createdLoadId} error={error} onBeginReading={() => { setDialogOpen(false); openReading(); }}/></div><div className="load-table-wrap"><table className="load-table"><thead><tr><th>CARGA</th><th>ROTA</th><th>ÚLTIMA LEITURA</th><th>CONDIÇÃO</th><th></th></tr></thead><tbody>{shipments.map(s => <tr key={s.id} onClick={() => { setSelectedId(s.id); setTab("cargas"); }}><td><strong>{s.id}</strong>{s.demo ? <small className="table-demo">DEMO</small> : null}<small>{s.product}</small></td><td>{s.origin} <ArrowRight size={13} className="inline-arrow"/> {s.destination}</td><td>{latest(s) ? dateTime(latest(s)!.recordedAt) : "Aguardando"}</td><td><Status alert={isAlert(s)} delivered={isDelivered(s)}/></td><td><ChevronRight size={17}/></td></tr>)}</tbody></table></div></section>
            </>}
          </TabsContent>
          <TabsContent value="leitura">
            <div className="page-heading"><div><p className="eyebrow">CHECK-IN DE CARGA</p><h1>Registrar leitura</h1><p>Registre cada etapa da entrega com foto do indicador.</p></div></div>
            <div className="panel wizard-entry"><ScanLine size={30}/><h2>Registrar checkpoint</h2><p>Identifique a carga, informe o local e fotografe o indicador. Você verá o progresso até concluir.</p><button type="button" className="button-main" onClick={() => { setReadingStep(0); setReadingError(""); setReadingOpen(true); }}>Iniciar registro <ArrowRight size={17}/></button></div>
            <Dialog open={readingOpen} onOpenChange={open => { setReadingOpen(open); if (!open) setReadingError(""); }}>
              <DialogContent className="wizard-dialog reading-dialog" aria-describedby="reading-description">
                <DialogHeader><DialogTitle>{readingStep === 3 ? "Registro concluído" : "Registrar leitura"}</DialogTitle></DialogHeader>
                {readingStep === 3 ? <div className="wizard-complete" role="status"><span className="wizard-check"><Check size={32}/></span><h3>Registro concluído</h3><p>{readingSavedOffline ? "Registro e foto salvos neste aparelho. A sincronização acontecerá quando houver conexão." : "Check-in e foto registrados no servidor."}</p><button type="button" className="button-main" onClick={() => { setReadingOpen(false); setTab("cargas"); }}>Ver passaporte <ArrowRight size={17}/></button><button type="button" className="button-outline" onClick={() => { setReadingStep(0); setReadingError(""); setReadingOpen(false); }}>Fechar</button></div> : <>
                  <p className="dialog-subtitle" id="reading-description">Identifique a carga, registre o ponto e fotografe o indicador térmico.</p>
                  <div className="wizard-progress" aria-label={`Etapa ${readingStep + 1} de 3`}><span>Etapa {readingStep + 1} de 3</span><strong>{["Identificação", "Ponto de passagem", "Foto e condição"][readingStep]}</strong><div className="wizard-track"><i style={{ width: `${(readingStep + 1) / 3 * 100}%` }}/></div></div>
                  {readingError && <p className="wizard-error" role="alert">{readingError}</p>}
                  <form ref={readingFormRef} className="wizard-form" onSubmit={event => { event.preventDefault(); if (readingStep === 2) void saveReading(event); else if (readingFormRef.current?.reportValidity()) { if (readingStep === 0 && !formShipment) { setReadingError("Cadastre a etiqueta antes de registrar uma leitura."); return; } setReadingError(""); setReadingStep(readingStep + 1); } }}>
                    {readingStep === 0 && <div className="wizard-fields">
                      {webNfcAvailable ? <button type="button" className="scan-button" onClick={() => void scanNfc()}><ScanLine size={27}/><span><strong>Escanear etiqueta NFC</strong><small>Aproxime o celular da tag, se tiver uma</small></span><ArrowRight size={19}/></button> : <p className="helper-note">A etiqueta NFC é opcional: digite o código da carga cadastrada abaixo. No iPhone, também é possível aproximar uma tag com a URL gravada e abrir a notificação.</p>}
                      <p className="helper-note">Sem cartão NFC? Informe o código da carga cadastrada para continuar.</p>
                      {scanStatus && <p className="helper-note" role="status">{scanStatus}</p>}
                      <label className="field">Código da carga<input required placeholder="Ex.: TT-SE-02931" value={form.tagId} onChange={event => setForm({ ...form, tagId: event.target.value.toUpperCase() })} list="tag-options"/><datalist id="tag-options">{shipments.map(shipment => <option key={shipment.id} value={shipment.tagId}>{shipment.id}</option>)}</datalist></label>
                    </div>}
                    {readingStep === 1 && <div className="wizard-fields"><div className="form-row"><label className="field">Etapa<select value={form.stage} onChange={event => setForm({ ...form, stage: event.target.value })}><option>Expedição</option><option>Checkpoint</option><option>Recebimento</option></select></label><label className="field">Localidade<input required list="place-options" value={form.place} onChange={event => setForm({ ...form, place: event.target.value })}/><datalist id="place-options">{places.map(place => <option value={place} key={place}/>)}</datalist></label></div><label className="field">Responsável pela leitura<input required maxLength={100} placeholder="Nome de quem conferiu a carga" value={form.actor} onChange={event => setForm({ ...form, actor: event.target.value })}/></label><div className="geo-row"><div><MapPin size={18}/><span>{geoMessage}</span></div><button type="button" onClick={getLocation}>Capturar GPS</button></div></div>}
                    {readingStep === 2 && <div className="wizard-fields"><PhotoEvidence photo={photo} sample={sampledColor} onChange={(nextPhoto, sample) => { setPhoto(nextPhoto); setSampledColor(sample); if (sample && formShipment?.intactColor && formShipment.activatedColor) { const result = classifyColor(sample, formShipment.intactColor, formShipment.activatedColor); if (result !== "uncertain") setForm(current => ({ ...current, status: result })); } }}/><p className="helper-note">{sampledColor ? colorResult === "uncertain" ? "Análise inconclusiva: fotografe com outra luz ou justifique sua avaliação." : `Análise da cor: indicador ${colorResult === "normal" ? "íntegro" : "ativado"}. Confirme a condição abaixo.` : "Toque na área colorida da foto. Tons de vermelho sinalizam alerta."}</p><p className="field-caption">Condição registrada</p><div className="condition-choices"><label className={`condition ${form.status === "normal" ? "picked" : ""}`}><input type="radio" name="condition" checked={form.status === "normal"} onChange={() => setForm({ ...form, status: "normal" })}/><span className="choice-symbol good"><Check size={18}/></span><span><strong>Indicador íntegro</strong><small>Cor original, sem ativação</small></span></label><label className={`condition danger ${form.status === "alert" ? "picked" : ""}`}><input type="radio" name="condition" checked={form.status === "alert"} onChange={() => setForm({ ...form, status: "alert" })}/><span className="choice-symbol hot"><CircleAlert size={18}/></span><span><strong>Indicador ativado</strong><small>Mudança irreversível de cor</small></span></label></div><label className="field">Justificativa (obrigatória se a análise for inconclusiva ou diferente do registro)<textarea maxLength={300} value={justification} onChange={event => setJustification(event.target.value)} placeholder="Explique a inspeção visual e eventual divergência" /></label><p className="dialog-help">A foto e a cor são anexadas ao passaporte. A cor pode variar com a iluminação; confira o indicador físico.</p></div>}
                    <div className="wizard-actions">{readingStep > 0 && <button type="button" className="button-outline" onClick={() => { setReadingStep(readingStep - 1); setReadingError(""); }}><ArrowRight className="wizard-back" size={16}/> Voltar</button>}<button type="submit" className="button-main" disabled={busy}>{busy ? "Salvando..." : readingStep === 2 ? online ? "Concluir registro" : "Guardar offline" : "Próxima etapa"}{!busy && <ArrowRight size={17}/>}</button></div>
                  </form>
                </>}
              </DialogContent>
            </Dialog>
          </TabsContent>
          <TabsContent value="cargas"><div className="page-heading"><div><p className="eyebrow">RASTREABILIDADE</p><h1>Passaportes das cargas</h1><p>Consulte o histórico e prepare a etiqueta NFC da carga.</p></div><NewLoadDialog open={dialogOpen} setOpen={handleLoadDialogOpen} value={newLoad} setValue={setNewLoad} onSubmit={createLoad} busy={busy} createdLoadId={createdLoadId} error={error} onBeginReading={() => { setDialogOpen(false); openReading(); }}/></div>{shipments.length ? <div className="passport-layout"><div className="shipment-list" aria-label="Selecionar carga">{shipments.map(s => <button key={s.id} className={`shipment-choice ${selected?.id === s.id ? "active" : ""}`} onClick={() => { setSelectedId(s.id); setTagWriteStatus(""); }}><span className="shipment-choice-top"><strong>{s.id}</strong><ChevronRight size={17}/></span><span>{s.product}</span><small>{s.origin} → {s.destination}</small><Status alert={isAlert(s)} delivered={isDelivered(s)}/>{Boolean(s.demo) && <em>Dados de demonstração</em>}</button>)}</div>{selected && <div className="panel passport-panel"><Passport shipment={selected} tagLink={tagLink} onWriteTag={() => void writeTag()} onCopyLink={() => void copyTagLink()} tagWriteStatus={tagWriteStatus}/></div>}</div> : <div className="empty-state"><Package size={35}/><h2>Sem cargas cadastradas</h2><p>Cadastre uma carga para gerar seu passaporte digital.</p><NewLoadDialog open={dialogOpen} setOpen={handleLoadDialogOpen} value={newLoad} setValue={setNewLoad} onSubmit={createLoad} busy={busy} createdLoadId={createdLoadId} error={error} onBeginReading={() => { setDialogOpen(false); openReading(); }}/></div>}</TabsContent>
          <TabsContent value="admin"><AdminPanel shipments={shipments} pending={pending} loading={loading} busy={busy} onOpenShipment={id => { setSelectedId(id); setTab("cargas"); }} onLoadDemo={loadDemo}/></TabsContent>
        </Tabs><footer>THERMOTAG SE <span>·</span> Protótipo para validação operacional <span>·</span> Horários exibidos em Brasília</footer>
      </div>
    </main>
  </div>;
}

function Metric({ icon, label, value, detail, warn }: { icon: React.ReactNode; label: string; value: number; detail: string; warn?: boolean }) { return <div className={`metric ${warn ? "metric-warn" : ""}`}><span className="metric-icon">{icon}</span><div className="metric-text"><span>{label}</span><strong>{value.toString().padStart(2,"0")}</strong><small>{detail}</small></div></div>; }
