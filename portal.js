/* Aurea Financial — Área do cliente: painel, relatórios e conta */

// ===== Configuração =====
const SUPABASE_URL = "https://eslputtmlufvxhdanczy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-7TaudR-eu2t1e8L6qfgmw_i4cg6Ksa";  // chave publishable (é pública)
const BUCKET = "relatorios";        // uma pasta por cliente (o e-mail dele)
const DATA_FOLDER = "dados";        // dentro da pasta do cliente: exports do QuickBooks (P&L por mês)
const SUMMARY_TABLE = "resumo_mensal";
const PROFILE_TABLE = "perfil_cliente";
const ADMIN_TABLE = "admins";             // e-mails da Aurea que podem ver todas as contas (só leitura)  // nome da empresa e logo que o cliente define em Minha conta  // opcional: notas do mês e valores manuais
const TX_TABLE = "transacoes_mensal";     // quantidade de transações por mês (gravada pela automação mensal)
const PLAN_TABLE = "plano_cliente";       // plano atual do cliente; as faixas vêm da tabela "planos"
const TX_MONTHS = 6, TX_RULE = 3;
const DUV_TABLE = "duvidas";              // dúvidas de transações do mês (aba Pendências), publicadas pelos scripts da Aurea
const REC_MAX = 10 * 1024 * 1024;         // recibo: até 10 MB
const AL_TABLE = "alertas";               // alertas do Painel (sem resposta), publicados pelo script da Aurea         // meses no gráfico; meses seguidos fora da faixa para ajustar o plano

const $ = id => document.getElementById(id);
const T = k => (window.PAGE_DICT[currentLang] || window.PAGE_DICT.pt)[k] || k;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isSmall = () => window.matchMedia("(max-width: 700px)").matches;
const swap = fn => (document.startViewTransition && !reduceMotion) ? document.startViewTransition(fn) : fn();
function reveal(el) { el.hidden = false; if (reduceMotion) return; el.classList.remove("in"); void el.offsetWidth; el.classList.add("in"); }

function showPre(v) { ["v-loading", "v-setup", "v-login"].forEach(id => $(id).hidden = id !== v); }

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !window.supabase) {
  showPre("v-setup");
} else {
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

  // ---------- Estado ----------
  let folder = "", data = {}, others = [], tx = { meses: {}, plano: null }, duv = [], pdMes = null, pdAberta = {};
  let page = "dash", selYear = null, selPeriod = "ytd", repYear = null, repMonth = null, showTable = false;

  // ---------- Formatação ----------
  const locale = () => currentLang === "en" ? "en-US" : "pt-BR";
  const money = v => v == null || isNaN(v) ? "—" : new Intl.NumberFormat(locale(), { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
  const short = v => { const a = Math.abs(v), s = v < 0 ? "-" : ""; return a >= 1e6 ? s + "$" + (a / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : a >= 1e3 ? s + "$" + (a / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "k" : s + "$" + Math.round(a); };
  const pct = v => (v >= 0 ? "+" : "") + v.toFixed(1).replace(".", currentLang === "en" ? "." : ",") + "%";
  const mName = (y, m, style = "long") => { const s = new Date(y, m - 1, 1).toLocaleDateString(locale(), { month: style }).replace(".", ""); return s.charAt(0).toUpperCase() + s.slice(1); };
  const mTitle = k => { const [y, m] = k.split("-").map(Number); return currentLang === "en" ? `${mName(y, m)} ${y}` : `${mName(y, m)} de ${y}`; };
  const fmtSize = b => !b ? "" : b < 1048576 ? Math.round(b / 1024) + " KB" : (b / 1048576).toFixed(1) + " MB";
  const fmtDate = s => s ? new Date(s).toLocaleDateString(locale(), { day: "2-digit", month: "short", year: "numeric" }) : "";
  const ext = n => (n.split(".").pop() || "").slice(0, 4).toUpperCase();
  const isHtml = n => /\.html?$/i.test(n);   // relatórios interativos da Aurea (ex.: P&L traduzido)
  let viewerUrl = null;                       // endereço temporário do relatório interativo aberto
  // Idioma do relatório: "(traduzido)", " - PT" ou "[PT]" no nome = português; " - EN" ou "[EN]" = inglês; sem marca = inglês (QuickBooks)
  const LANG_PT = /traduzid|[\s_(\[-]PT(-BR)?[\])]?$/i, LANG_EN = /[\s_(\[-]EN[\])]?$/i;
  const fileLang = n => { const b = n.replace(/\.[^.]+$/, "").trim(); return LANG_PT.test(b) ? "pt" : "en"; };
  const FLAGS = {
    en: '<svg viewBox="0 0 19 10" aria-hidden="true"><rect width="19" height="10" fill="#B22234"/><path d="M0 1.15h19M0 2.69h19M0 4.23h19M0 5.77h19M0 7.31h19M0 8.85h19" stroke="#fff" stroke-width=".77"/><rect width="7.6" height="5.38" fill="#3C3B6E"/></svg>',
    pt: '<svg viewBox="0 0 20 14" aria-hidden="true"><rect width="20" height="14" fill="#009C3B"/><path d="M10 1.4L18.4 7 10 12.6 1.6 7z" fill="#FFDF00"/><circle cx="10" cy="7" r="3.4" fill="#002776"/><path d="M6.7 6.3c2.2-.5 4.6-.1 6.6 1.1" stroke="#fff" stroke-width=".6" fill="none"/></svg>'
  };
  const langLabel = l => currentLang === "en" ? (l === "pt" ? "Report in Portuguese" : "Report in English") : (l === "pt" ? "Relatório em português" : "Relatório em inglês");
  const cleanName = n => { const b = n.replace(/\.[^.]+$/, "").replace(/\s*[-_]?\s*\[?(PT(-BR)?|EN)\]?$/i, ""); return b.replace(/^\d{4}[-_ ]?\d{2}\s*[-_ ]*\s*/, "").replace(/_+/g, " ").trim() || b; };
  const keyFrom = n => { const m = n.match(/^(\d{4})[-_ ]?(0[1-9]|1[0-2])(?!\d)/); return m ? `${m[1]}-${m[2]}` : null; };
  const prevKey = k => { let [y, m] = k.split("-").map(Number); m--; if (!m) { m = 12; y--; } return `${y}-${String(m).padStart(2, "0")}`; };
  const slot = k => (data[k] = data[k] || { files: [], num: null, note: null });

  // ---------- Leitura do export do QuickBooks (P&L com colunas por mês) ----------
  const MONTHS = { jan:1, january:1, janeiro:1, feb:2, fev:2, february:2, fevereiro:2, mar:3, march:3, marco:3, "março":3, apr:4, abr:4, april:4, abril:4,
    may:5, mai:5, maio:5, jun:6, june:6, junho:6, jul:7, july:7, julho:7, aug:8, ago:8, august:8, agosto:8, sep:9, sept:9, set:9, september:9, setembro:9,
    oct:10, out:10, october:10, outubro:10, nov:11, november:11, novembro:11, dec:12, dez:12, december:12, dezembro:12 };
  function headerKey(cell) {
    if (cell == null) return null;
    const s = String(cell).toLowerCase();
    if (/total/.test(s)) return null;
    const y = s.match(/(19|20)\d{2}/), w = s.match(/[a-zçã]+/g);
    if (!y || !w) return null;
    const m = w.map(x => MONTHS[x]).find(Boolean);
    return m ? `${y[0]}-${String(m).padStart(2, "0")}` : null;
  }
  const toNum = v => {
    if (v == null || v === "") return null;
    if (typeof v === "number") return v;
    let s = String(v).trim(), neg = /^\(.*\)$/.test(s) || /^-/.test(s);
    s = s.replace(/[^0-9.,]/g, "");
    if (!s) return null;
    if (/,\d{2}$/.test(s) && !/\.\d{2}$/.test(s)) s = s.replace(/\./g, "").replace(",", "."); else s = s.replace(/,/g, "");
    const n = parseFloat(s); return isNaN(n) ? null : (neg ? -n : n);
  };
  function parsePL(rows) {
    let hi = -1, cols = {};
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const c = {}; (rows[i] || []).forEach((cell, j) => { const k = j > 0 ? headerKey(cell) : null; if (k) c[j] = k; });  // coluna 0 = descrições
      if (Object.keys(c).length) { hi = i; cols = c; break; }
    }
    if (hi < 0) return {};
    const find = re => rows.slice(hi + 1).find(r => r && re.test(String(r[0] == null ? "" : r[0]).trim().toLowerCase()));
    const rInc = find(/^total (for )?income$/), rCogs = find(/^total (for )?(cost of goods sold|cost of sales|cogs)$/),
          rExp = find(/^total (for )?expenses$/), rOth = find(/^total (for )?other expenses?$/), rNet = find(/^net (income|profit|earnings)$/);
    const out = {};
    Object.entries(cols).forEach(([j, k]) => {
      const g = r => r ? toNum(r[j]) : null;
      const inc = g(rInc), exp = [g(rCogs), g(rExp), g(rOth)].filter(v => v != null);
      const despesas = exp.length ? exp.reduce((a, b) => a + b, 0) : null;
      let net = g(rNet); if (net == null && inc != null && despesas != null) net = inc - despesas;
      // meses zerados (antes de o cliente começar) são ignorados
      if ([inc, despesas, net].some(v => v != null && Math.abs(v) > 0.004)) out[k] = { receita: inc, despesas, lucro: net };
    });
    return out;
  }

  // ---------- Carregar tudo ----------
  async function loadAll(email) {
    folder = email.toLowerCase(); data = {}; others = [];
    const asFile = (f, path) => ({ path, name: f.name, date: f.created_at || f.updated_at, size: f.metadata && f.metadata.size });
    const root = await sb.storage.from(BUCKET).list(folder, { limit: 1000, sortBy: { column: "name", order: "desc" } });
    if (root.error) throw root.error;
    const items = (root.data || []).filter(f => f.name !== ".emptyFolderPlaceholder");
    const monthFolders = [];
    let dataDir = null;  // nome real da pasta de dados (aceita "dados", "Dados"...)
    items.forEach(f => {
      if (!f.id) { if (f.name.toLowerCase() === DATA_FOLDER) dataDir = f.name; else if (keyFrom(f.name)) monthFolders.push(f.name); return; }
      const k = keyFrom(f.name), file = asFile(f, folder + "/" + f.name);
      if (k) slot(k).files.push(file); else others.push(file);
    });
    await Promise.all(monthFolders.map(async sf => {
      const r = await sb.storage.from(BUCKET).list(folder + "/" + sf, { limit: 200 });
      (r.data || []).filter(f => f.id && f.name !== ".emptyFolderPlaceholder").forEach(f => slot(keyFrom(sf)).files.push(asFile(f, folder + "/" + sf + "/" + f.name)));
    }));
    // Exports do QuickBooks na pasta "dados" (os mais novos têm prioridade)
    if (dataDir && window.XLSX) {
      const r = await sb.storage.from(BUCKET).list(folder + "/" + dataDir, { limit: 100, sortBy: { column: "updated_at", order: "asc" } });
      const files = (r.data || []).filter(f => f.id && /\.(xlsx|xls|csv)$/i.test(f.name));
      for (const f of files) {
        try {
          const dl = await sb.storage.from(BUCKET).download(folder + "/" + dataDir + "/" + f.name);
          if (dl.error) continue;
          const buf = await dl.data.arrayBuffer();
          const wb = /\.csv$/i.test(f.name) ? XLSX.read(new TextDecoder().decode(buf), { type: "string" }) : XLSX.read(buf, { type: "array" });
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
          Object.entries(parsePL(rows)).forEach(([k, v]) => { slot(k).num = v; });
        } catch (e) { /* arquivo ignorado */ }
      }
    }
    // Tabela opcional: nota do mês e valores manuais (usados quando não há export)
    const s = await sb.from(SUMMARY_TABLE).select("mes,receita,despesas,lucro_liquido,observacao").eq("cliente_email", folder);
    if (!s.error) (s.data || []).forEach(r => {
      if (!/^\d{4}-\d{2}$/.test(r.mes)) return;
      const d = slot(r.mes);
      if (r.observacao) d.note = r.observacao;
      if (!d.num && (r.receita != null || r.despesas != null || r.lucro_liquido != null)) {
        const rc = r.receita != null ? +r.receita : null, dp = r.despesas != null ? +r.despesas : null;
        d.num = { receita: rc, despesas: dp, lucro: r.lucro_liquido != null ? +r.lucro_liquido : (rc != null && dp != null ? rc - dp : null) };
      }
    });
    const rt = await sb.from(SUMMARY_TABLE).select("mes,retiradas").eq("cliente_email", folder);
    if (!rt.error) (rt.data || []).forEach(r => { if (/^\d{4}-\d{2}$/.test(r.mes) && r.retiradas != null) slot(r.mes).draw = +r.retiradas; });
    await loadTx();
    await loadDuvidas();
    await loadAlertas();
    await loadInd();
  }

  // Transações por mês + plano atual (se as tabelas ainda não existirem, o cartão mostra o aviso de vazio)
  async function loadTx() {
    tx = { meses: {}, plano: null };
    try {
      const [t, p] = await Promise.all([
        sb.from(TX_TABLE).select("mes,quantidade").eq("cliente_email", folder),
        sb.from(PLAN_TABLE).select("plano, planos(nome,minimo,maximo)").eq("cliente_email", folder).maybeSingle()
      ]);
      if (!t.error) (t.data || []).forEach(r => { if (/^\d{4}-\d{2}$/.test(r.mes) && r.quantidade != null) tx.meses[r.mes] = +r.quantidade; });
      if (!p.error && p.data && p.data.planos) { const f = p.data.planos; tx.plano = { nome: f.nome, min: f.minimo, max: f.maximo }; }
    } catch (e) { /* sem dados de transações */ }
  }

  const years = () => [...new Set(Object.keys(data).map(k => k.slice(0, 4)))].sort().reverse();
  const numYears = () => [...new Set(Object.keys(data).filter(k => data[k].num).map(k => k.slice(0, 4)))].sort().reverse();

  // ---------- Navegação ----------
  function go(p) {
    if (p === "ind" && !parceiro) p = "dash";   // aba só existe para parceiros
    page = p;
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("on", b.dataset.page === p));
    $("app-title").textContent = T({ dash: "nav_dash", reports: "nav_reports", pend: "nav_pend", estella: "al_t", ind: "ind_t", account: "nav_account", config: "nav_config" }[p]);
    ["dash", "reports", "pend", "estella", "ind", "account", "config"].forEach(x => { if (x !== p) $("p-" + x).hidden = true; });
    if (p === "dash") renderDash(); if (p === "reports") renderReports(); if (p === "pend") renderPend(); if (p === "estella") renderAlertas(); if (p === "config") renderCfg(); if (p === "ind") renderInd();
    pendBadge(); alBadge();
    reveal($("p-" + p));
    if (p === "account") renderTx();   // depois de aparecer, para o gráfico medir a largura certa
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }
  document.querySelectorAll(".nav-btn").forEach(b => b.addEventListener("click", () => swap(() => go(b.dataset.page))));
  document.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => swap(() => go(b.dataset.goto))));

  // ---------- Painel ----------
  function renderDash() {
    const ys = numYears();
    $("dash-empty").hidden = !!ys.length; $("dash-body").hidden = !ys.length;
    const fy = $("f-year"), fp = $("f-period");
    if (!ys.length) { fy.parentElement.hidden = fp.parentElement.hidden = true; renderDashFiles(null); return; }
    fy.parentElement.hidden = fp.parentElement.hidden = false;
    if (!selYear || !ys.includes(selYear)) selYear = ys[0];
    fy.innerHTML = ys.map(y => `<option value="${y}"${y === selYear ? " selected" : ""}>${y}</option>`).join("");
    const mk = Object.keys(data).filter(k => k.startsWith(selYear) && data[k].num).sort();
    if (selPeriod !== "ytd" && !mk.includes(selPeriod)) selPeriod = "ytd";
    // Acumulado do ano: do primeiro ao último mês fechado com dados (ex.: Jan–Out)
    const rng = mk.length ? (mk.length === 1 ? mName(+selYear, +mk[0].slice(5), "short") : `${mName(+selYear, +mk[0].slice(5), "short")}–${mName(+selYear, +mk[mk.length - 1].slice(5), "short")}`) : "";
    fp.innerHTML = `<option value="ytd">${T("ytd")}${rng ? ` (${rng})` : ""}</option>` + mk.slice().reverse().map(k => `<option value="${k}"${k === selPeriod ? " selected" : ""}>${mName(+k.slice(0, 4), +k.slice(5))}</option>`).join("");
    fp.value = selPeriod;

    // KPIs
    let cur, prev = null, sub;
    if (selPeriod === "ytd") {
      cur = mk.reduce((a, k) => { const n = data[k].num; ["receita", "despesas", "lucro"].forEach(f => { if (n[f] != null) a[f] = (a[f] || 0) + n[f]; }); return a; }, {});
      const last = mk[mk.length - 1];
      sub = mk.length === 1 ? mTitle(last) : T("months_in").replace("{n}", mk.length) + " · " + mName(+selYear, +mk[0].slice(5), "short") + "–" + mName(+selYear, +last.slice(5), "short");
    } else {
      cur = data[selPeriod].num; prev = data[prevKey(selPeriod)] && data[prevKey(selPeriod)].num; sub = mTitle(selPeriod);
    }
    const margin = cur.receita ? cur.lucro / cur.receita * 100 : null;
    const tiles = [
      ["t_rev", cur.receita, prev && prev.receita, true, "rev"],
      ["t_exp", cur.despesas, prev && prev.despesas, false, "exp"],
      ["t_net", cur.lucro, prev && prev.lucro, true, "net"]
    ];
    $("kpis").innerHTML = "";
    tiles.forEach(([lab, v, p, upGood, cls]) => {
      const t = document.createElement("div"); t.className = "pcard kpi2 " + cls;
      let extra = "";
      if (selPeriod !== "ytd") {
        if (v != null && p != null && p !== 0) {
          const ch = (v - p) / Math.abs(p) * 100, good = ch === 0 ? null : (ch > 0) === upGood;
          extra = `<span class="d ${good == null ? "flat" : good ? "up" : "down"}">${ch > 0 ? "▲" : ch < 0 ? "▼" : "•"} ${pct(ch)} <small>${T("vs_prev")}</small></span>`;
        } else extra = `<span class="d flat">${T("noprev")}</span>`;
      }
      if (cls === "net" && margin != null) extra = `<span class="d flat">${T("margin")}: <b>${pct(margin).replace("+", "")}</b></span>` + extra;
      t.innerHTML = `<span class="kl"><i class="lg ${cls}"></i>${T(lab)}</span><span class="kv${v != null && v < 0 ? " neg" : ""}">${money(v)}</span><span class="ksub">${sub}</span>${extra}`;
      $("kpis").append(t);
    });

    // Nota
    const noteKey = selPeriod !== "ytd" ? selPeriod : mk.slice().reverse().find(k => data[k].note);
    const note = noteKey ? data[noteKey].note : null;
    $("note-card").hidden = !note; $("note-text").textContent = note || "";
    $("note-title").textContent = T("note_t") + (noteKey ? " · " + mName(+noteKey.slice(0, 4), +noteKey.slice(5)) : "");

    renderChart(mk);
    renderTable(mk);
    renderDashFiles(selPeriod !== "ytd" ? selPeriod : null);
  }
  $("f-year").addEventListener("change", e => swap(() => { selYear = e.target.value; selPeriod = "ytd"; renderDash(); }));
  $("f-period").addEventListener("change", e => swap(() => { selPeriod = e.target.value; renderDash(); }));

  function renderDashFiles(k) {
    let files, title;
    if (k) { files = data[k] ? data[k].files : []; title = T("files_t").replace("{p}", mTitle(k)); }
    else {
      // Acumulado do ano: todos os relatórios do último mês fechado
      const ult = Object.keys(data).filter(x => /^\d{4}-\d{2}$/.test(x) && data[x].files.length).sort().pop();
      files = ult ? data[ult].files.map(f => Object.assign({ month: ult }, f)) : [];
      title = ult ? T("files_t").replace("{p}", mTitle(ult)) : T("files_latest");
    }
    $("dash-files-t").textContent = title;
    fillFiles($("dash-files"), files, !k);
    $("dash-nofiles").hidden = !!files.length;
  }

  // ---------- Gráfico: receita e despesas (barras) + lucro (linha), um único eixo em US$ (topo = primeira linha redonda acima do maior valor) ----------
  let chartMode = "all", lastMk = [];   // "all" = receita, despesas e lucro; "net" = só o lucro líquido
  document.querySelectorAll(".cmode-b").forEach(b => b.addEventListener("click", () => {
    if (chartMode === b.dataset.cmode) return; chartMode = b.dataset.cmode; renderChart(lastMk);
  }));
  function renderChart(mk) {
    lastMk = mk;
    // Modos de uma série só: lucro, margem (%) e lucro após as retiradas do dono
    const temDraw = mk.some(k => data[k].draw != null);
    if (chartMode === "after" && !temDraw) chartMode = "all";
    const box = $("chart"), y = +selYear, soLucro = chartMode !== "all", emPct = chartMode === "margin";
    const serie = n => n.receita == null && chartMode !== "net" ? null
      : chartMode === "net" ? n.lucro
      : chartMode === "margin" ? (n.receita && n.lucro != null ? n.lucro / n.receita * 100 : null)
      : null;
    const valor = p => chartMode === "after" ? (p.n.lucro != null && data[p.k].draw != null ? p.n.lucro - data[p.k].draw : null) : serie(p.n);
    const fmtV = v => emPct ? v.toFixed(1).replace(".", currentLang === "en" ? "." : ",") + "%" : short(v);
    $("chart-title").textContent = `${T("chart_t")} · ${selYear}`;
    $("chart-title-net").textContent = `${T("chart_net")} · ${selYear}`;
    $("chart-title-margin").textContent = `${T("chart_margin")} · ${selYear}`;
    $("chart-title-after").textContent = `${T("chart_after")} · ${selYear}`;
    $("chart-title-after").hidden = !temDraw;
    document.querySelectorAll(".cmode-b").forEach(b => { const on = b.dataset.cmode === chartMode; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
    $("chart-legend").hidden = soLucro;
    const pts = []; for (let m = 1; m <= 12; m++) { const k = `${selYear}-${String(m).padStart(2, "0")}`; pts.push({ k, m, n: data[k] && data[k].num }); }
    const vals = pts.filter(p => p.n).flatMap(p => soLucro ? [valor(p)] : [p.n.receita, p.n.despesas, p.n.lucro]).filter(v => v != null);
    const W = Math.max(320, Math.round(box.clientWidth || 800)), H = W < 560 ? 220 : 280, L = 50, R = 6, Tp = 14, B = 28;
    const nice = v => { if (!v) return 0; const p = Math.pow(10, Math.floor(Math.log10(Math.abs(v)))), n = Math.abs(v) / p; const s = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(x => n <= x + 1e-9); return Math.sign(v) * s * p; };
    const vmax = Math.max(0, ...vals), vmin = Math.min(0, ...vals);
    // o topo é a primeira linha redonda acima do maior valor (receita ou despesa), com uma folga mínima de 3%
    // entre 3 e 5 faixas, fica a que deixa o topo mais perto do maior valor
    const opc = [4, 5, 3].map(n => { const st = nice((vmax - vmin) / n) || 1;
      return { st, tp: Math.max(st, Math.ceil(vmax * 1.03 / st) * st), bt: vmin < 0 ? Math.floor(vmin * (soLucro ? 1.15 : 1.03) / st) * st : 0 }; })   // espaço para o valor embaixo das barras negativas
      .sort((a, b) => (a.tp - a.bt) - (b.tp - b.bt))[0];
    const step = opc.st, top = opc.tp, bot = opc.bt;
    const yy = v => Tp + (top - v) / (top - bot) * (H - Tp - B);
    const cw = (W - L - R) / 12, bw = soLucro ? Math.max(8, Math.min(30, cw - 18)) : Math.max(4, Math.min(16, (cw - 14) / 2));
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${T("chart_t")} ${selYear}">`;
    const ticks = []; for (let t = bot; t <= top + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);
    ticks.forEach(t => { s += `<line x1="${L}" x2="${W - R}" y1="${yy(t)}" y2="${yy(t)}" class="${Math.abs(t) < 1e-9 ? "base" : "grid"}"/><text x="${L - 8}" y="${yy(t) + 4}" text-anchor="end" class="ax">${emPct ? Math.round(t) + "%" : short(t)}</text>`; });
    const bar = (x, v, cls) => {
      if (v == null) return "";
      const y0 = yy(0), y1 = yy(v), h = Math.max(1.5, Math.abs(y1 - y0)), r = Math.min(4, h / 2, bw / 2);
      return v >= 0
        ? `<path class="b ${cls}" d="M${x},${y0} V${y0 - h + r} Q${x},${y0 - h} ${x + r},${y0 - h} H${x + bw - r} Q${x + bw},${y0 - h} ${x + bw},${y0 - h + r} V${y0} Z"/>`
        : `<path class="b ${cls}" d="M${x},${y0} V${y0 + h - r} Q${x},${y0 + h} ${x + r},${y0 + h} H${x + bw - r} Q${x + bw},${y0 + h} ${x + bw},${y0 + h - r} V${y0} Z"/>`;
    };
    const line = [];
    pts.forEach((p, i) => {
      const cx = L + cw * i + cw / 2;
      if (selPeriod === p.k) s += `<rect x="${L + cw * i}" y="${Tp}" width="${cw}" height="${H - Tp - B}" class="selband"/>`;
      s += `<text x="${cx}" y="${H - 8}" text-anchor="middle" class="ax${selPeriod === p.k ? " on" : ""}">${cw < 38 ? mName(y, p.m, "short").charAt(0) : mName(y, p.m, "short").slice(0, 3)}</text>`;
      if (!p.n) return;
      if (soLucro) {   // uma série só: uma barra por mês, verde (ou vermelha quando negativa), com o valor em cima
        const v = valor(p); if (v == null) return;
        s += bar(cx - bw / 2, v, "netb" + (v < 0 ? " neg" : ""));
        if (cw >= 38) { const yv = yy(v); s += `<text x="${cx}" y="${v >= 0 ? yv - 6 : yv + 14}" text-anchor="middle" class="vlab">${fmtV(v)}</text>`; }
        return;
      }
      s += bar(cx - bw - 1, p.n.receita, "rev") + bar(cx + 1, p.n.despesas, "exp");
      if (p.n.lucro != null) line.push([cx, yy(p.n.lucro)]);
    });
    if (line.length > 1) s += `<polyline class="net-line" points="${line.map(p => p.join(",")).join(" ")}"/>`;
    line.forEach(([x, yv]) => { s += `<circle class="net-dot" cx="${x}" cy="${yv}" r="4.5"/>`; });
    s += `<line class="cross" id="cross" x1="0" x2="0" y1="${Tp}" y2="${H - B}" visibility="hidden"/>`;
    pts.forEach((p, i) => { if (p.n) s += `<rect class="hit" x="${L + cw * i}" y="${Tp}" width="${cw}" height="${H - Tp - B}" data-k="${p.k}" data-cx="${L + cw * i + cw / 2}" tabindex="0"/>`; });
    s += "</svg>";
    box.innerHTML = s;

    const tip = $("tip"), cross = box.querySelector("#cross"), card = box.closest(".pcard");
    const showTip = el => {
      const n = data[el.dataset.k].num;
      tip.innerHTML = `<b>${mTitle(el.dataset.k)}</b><span><i class="lg rev"></i>${T("k_rev")}<em>${money(n.receita)}</em></span><span><i class="lg exp"></i>${T("k_exp")}<em>${money(n.despesas)}</em></span><span><i class="lg net"></i>${T("k_net")}<em>${money(n.lucro)}</em></span>`
        + (n.receita && n.lucro != null ? `<span>${T("margin")}<em>${(n.lucro / n.receita * 100).toFixed(1).replace(".", currentLang === "en" ? "." : ",")}%</em></span>` : "")
        + (data[el.dataset.k].draw != null && n.lucro != null ? `<span>${T("k_draw")}<em>${money(-data[el.dataset.k].draw)}</em></span><span>${T("k_after")}<em>${money(n.lucro - data[el.dataset.k].draw)}</em></span>` : "");
      tip.hidden = false;
      const br = el.getBoundingClientRect(), cr = card.getBoundingClientRect();
      let left = br.left - cr.left + br.width + 6; if (left + tip.offsetWidth > cr.width - 8) left = br.left - cr.left - tip.offsetWidth - 6;
      tip.style.left = Math.max(8, left) + "px"; tip.style.top = (br.top - cr.top) + "px";
      cross.setAttribute("x1", el.dataset.cx); cross.setAttribute("x2", el.dataset.cx); cross.setAttribute("visibility", "visible");
    };
    const hide = () => { tip.hidden = true; cross.setAttribute("visibility", "hidden"); };
    box.querySelectorAll(".hit").forEach(h => {
      h.addEventListener("mouseenter", () => showTip(h)); h.addEventListener("focus", () => showTip(h)); h.addEventListener("blur", hide);
      const pick = () => swap(() => { selPeriod = h.dataset.k; renderDash(); });
      h.addEventListener("click", pick); h.addEventListener("keydown", e => { if (e.key === "Enter") pick(); });
    });
    box.addEventListener("mouseleave", hide);
  }

  // Tabela (alternativa acessível ao gráfico)
  function renderTable(mk) {
    $("tbl-toggle").textContent = T(showTable ? "hide_table" : "show_table");
    $("tbl").hidden = !showTable;
    if (!showTable) return;
    const rows = mk.map(k => { const n = data[k].num; return `<tr${k === selPeriod ? ' class="on"' : ""}><td>${mName(+k.slice(0, 4), +k.slice(5))}</td><td>${money(n.receita)}</td><td>${money(n.despesas)}</td><td class="${n.lucro < 0 ? "neg" : ""}">${money(n.lucro)}</td></tr>`; }).join("");
    $("tbl").innerHTML = `<table><thead><tr><th>${T("th_month")}</th><th>${T("k_rev")}</th><th>${T("k_exp")}</th><th>${T("k_net")}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  $("tbl-toggle").addEventListener("click", () => { showTable = !showTable; renderTable(Object.keys(data).filter(k => k.startsWith(selYear) && data[k].num).sort()); });

  // ---------- Minha conta: transações por mês e faixa do plano ----------
  const nFmt = n => new Intl.NumberFormat(locale()).format(n);
  const lastClosed = () => { const d = new Date(); return prevKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
  const txSide = q => !tx.plano || q == null ? 0 : (tx.plano.max != null && q > tx.plano.max) ? 1 : (tx.plano.min > 0 && q < tx.plano.min) ? -1 : 0;
  function renderTx() {
    const ks = []; for (let k = lastClosed(), i = 0; i < TX_MONTHS; i++, k = prevKey(k)) ks.unshift(k);
    const has = ks.some(k => tx.meses[k] != null), pl = tx.plano;
    // Sem plano e sem contagem (ex.: Export, que soma na Extreme): o cartão nem aparece
    $("tx-card").hidden = !has && !pl && !Object.keys(tx.meses).length;
    $("tx-empty").hidden = has;
    ["tx-chart", "tx-legend"].forEach(id => $(id).hidden = !has);
    $("tx-status").hidden = !has || !pl;
    $("tx-lg-lim").hidden = !pl; $("tx-legend").querySelector(".tx-out").parentElement.hidden = !pl;

    // Plano e faixa
    $("tx-plan").hidden = !pl;
    if (pl) {
      $("tx-plan-name").textContent = pl.nome;
      $("tx-plan-range").textContent = (pl.max == null ? T("tx_from") : pl.min > 0 ? T("tx_range") : T("tx_upto")).replace("{a}", nFmt(pl.min)).replace("{b}", nFmt(pl.max));
    }
    if (!has) { $("tx-chart").innerHTML = ""; return; }

    // Meses seguidos fora da faixa, do mês mais recente com dados para trás
    if (pl) {
      let i = ks.length - 1; while (i >= 0 && tx.meses[ks[i]] == null) i--;
      const side = txSide(tx.meses[ks[i]]); let n = 0;
      if (side) while (i >= 0 && tx.meses[ks[i]] != null && txSide(tx.meses[ks[i]]) === side) { n++; i--; }
      const st = $("tx-status");
      st.classList.toggle("ok", !side); st.classList.toggle("alert", n >= TX_RULE);
      $("tx-dots").hidden = !side;
      $("tx-dots").innerHTML = Array.from({ length: TX_RULE }, (_, j) => `<i class="${j < n ? "on" : ""}"></i>`).join("");
      $("tx-status-text").textContent = !side ? T("tx_ok") : T(side > 0 ? (n >= TX_RULE ? "tx_up3" : "tx_up") : (n >= TX_RULE ? "tx_down3" : "tx_down")).replace("{n}", n);
    }

    // Gráfico de barras com as linhas da faixa
    const box = $("tx-chart");
    const W = Math.max(280, Math.round(box.clientWidth || 520)), H = W < 420 ? 210 : 240, L = 6, R = pl ? 62 : 6, Tp = 24, B = 28;
    const vals = ks.map(k => tx.meses[k]).filter(v => v != null);
    const ref = pl ? [pl.min > 0 ? pl.min : 0, pl.max != null ? pl.max : 0] : [];
    const top = Math.max(10, ...vals, ...ref) * 1.15;
    const yy = v => Tp + (1 - v / top) * (H - Tp - B);
    const cw = (W - L - R) / ks.length, bw = Math.min(46, cw * 0.58);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${T("tx_aria")}">`, labels = "";
    s += `<line class="base" x1="${L}" x2="${W - R}" y1="${yy(0)}" y2="${yy(0)}"/>`;
    ks.forEach((k, i) => {
      const [y, m] = k.split("-").map(Number), cx = L + cw * i + cw / 2, q = tx.meses[k];
      const lab = mName(y, m, "short").slice(0, 3) + (m === 1 || i === 0 ? ` ${String(y).slice(2)}` : "");
      s += `<text class="ax" x="${cx}" y="${H - 8}" text-anchor="middle">${lab}</text>`;
      if (q == null) { s += `<g><title>${mTitle(k)}: ${T("tx_none")}</title><text class="tx-na" x="${cx}" y="${yy(0) - 8}" text-anchor="middle">—</text></g>`; return; }
      const y0 = yy(0), h = Math.max(2, y0 - yy(q)), r = Math.min(5, h / 2, bw / 2), x = cx - bw / 2;
      const cls = txSide(q) ? "out" : "in";
      s += `<g><title>${mTitle(k)}: ${q === 1 ? T("tx_n1") : T("tx_n").replace("{n}", nFmt(q))}</title>`
        + `<path class="tb ${cls}" d="M${x},${y0} V${y0 - h + r} Q${x},${y0 - h} ${x + r},${y0 - h} H${x + bw - r} Q${x + bw},${y0 - h} ${x + bw},${y0 - h + r} V${y0} Z"/>`
        + `</g>`;
      labels += `<text class="tv ${cls}" x="${cx}" y="${y0 - h - 7}" text-anchor="middle">${nFmt(q)}</text>`;  // números por cima das linhas
    });
    if (pl) {
      const lim = (v, key) => `<line class="tx-lim" x1="${L}" x2="${W - R + 4}" y1="${yy(v)}" y2="${yy(v)}"/><text class="tx-lim-t" x="${W - R + 8}" y="${yy(v) + 4}">${T(key).replace("{n}", nFmt(v))}</text>`;
      if (pl.max != null) s += lim(pl.max, "tx_max");
      if (pl.min > 0) s += lim(pl.min, "tx_min");
    }
    box.innerHTML = s + labels + "</svg>";
  }

  // ---------- Alertas do Painel (avisos sem resposta) ----------
  let alertas = [], alTodos = [], alVerVistos = false;
  async function loadAlertas() {
    alTodos = []; alertas = [];
    const sel = "id,chave,nivel,titulo,texto,valor,vence_em,ativo_ate,criado_em,visto_em,resolvido_em";
    const busca = campos => sb.from(AL_TABLE).select(campos).eq("cliente_email", folder).is("resolvido_em", null).order("criado_em", { ascending: false });
    try {
      let r = await busca(sel + ",tipo");
      if (r.error) r = await busca(sel);   // coluna "tipo" ainda não criada
      if (!r.error) alTodos = (r.data || []).filter(a => !a.ativo_ate || a.ativo_ate >= hojeISO());
    } catch (e) { /* tabela ainda não criada */ }
    await loadCfg();
    alFiltrar();
  }

  // ---------- Configurações (preferências do cliente: geral, avisos, Estella e relatórios) ----------
  const CFG_TABLE = "cliente_config";
  const CFG_PADRAO = {
    idioma: null, painel: "all",
    aviso_pend_portal: true, aviso_pend_whats: false, aviso_pend_email: false, aviso_rel_portal: true, aviso_rel_whats: false, aviso_rel_email: false, pend_lembrete: 0,
    contato2: false, contato2_nome: null, contato2_email: null, contato2_whats: null,
    resumo: "mensal", contas: true, contas_dias: 7, invoices: true, impostos: true, retirada: false, retirada_limite: null,
    relatorios: "juntos"
  };
  // Cada cartão salva só os próprios campos
  const CFG_CARDS = {
    geral: ["idioma", "painel"],
    avisos: ["aviso_pend_portal", "aviso_pend_whats", "aviso_pend_email", "aviso_rel_portal", "aviso_rel_whats", "aviso_rel_email", "pend_lembrete", "contato2", "contato2_nome", "contato2_email", "contato2_whats"],
    estella: ["resumo", "contas", "contas_dias", "invoices", "impostos", "retirada", "retirada_limite"],
    rel: ["relatorios"]
  };
  let cfg = Object.assign({}, CFG_PADRAO), cfgEd = Object.assign({}, CFG_PADRAO), cfgSalvo = false, cfgOk = false, cfgEm = null, cfgMsg = {};
  async function loadCfg() {
    cfg = Object.assign({}, CFG_PADRAO); cfgSalvo = false; cfgOk = false; cfgEm = null; cfgMsg = {};
    try {
      const r = await sb.from(CFG_TABLE).select("*").eq("cliente_email", folder).maybeSingle();
      if (!r.error) { cfgOk = true; if (r.data) { cfgSalvo = true; cfgEm = r.data.atualizado_em; for (const k in CFG_PADRAO) if (r.data[k] != null) cfg[k] = r.data[k]; } }
    } catch (e) { /* tabela ainda não criada */ }
    if (cfg.retirada_limite != null) cfg.retirada_limite = Number(cfg.retirada_limite);
    cfgEd = Object.assign({}, cfg);
    chartMode = cfg.painel || "all";
    // Idioma salvo na conta vale em qualquer aparelho (o admin vendo um cliente não muda de idioma)
    if (!somenteLeitura() && cfg.idioma && cfg.idioma !== currentLang && typeof setLang === "function") { setLang(cfg.idioma); markLang(); }
  }
  // Recado com tipo desligado pelo cliente não aparece. Conta a vencer só aparece dentro da antecedência escolhida.
  function alVisivel(a) {
    switch (a.tipo) {
      case "resumo": return cfg.resumo !== "nenhum";
      case "conta": return cfg.contas && (a.vence_em == null || alDias(a) <= cfg.contas_dias);
      case "invoice": return cfg.invoices;
      case "imposto": return cfg.impostos;
      case "retirada": return cfg.retirada;
      default: return true;
    }
  }
  function alFiltrar() { alertas = alTodos.filter(alVisivel); }
  const cfgMudou = c => CFG_CARDS[c].some(k => (cfgEd[k] ?? null) !== (cfg[k] ?? null));
  const ICO_CFG = {
    geral: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="7" cy="18" r="2" fill="currentColor"/>',
    avisos: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" stroke-linejoin="round"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    estella: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5l-5.4 3 1.2-6L3.3 9.3l6.1-.7z" stroke-linejoin="round"/>',
    rel: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7"/>'
  };
  function renderCfg() {
    const box = $("cfg-wrap"), ro = somenteLeitura();
    box.hidden = !cfgOk; $("cfg-adm").hidden = !ro;
    if (ro) $("cfg-adm").textContent = `${T("es_adm")} ${cfgSalvo && cfgEm ? T("es_upd").replace("{d}", dataLonga(cfgEm.slice(0, 10))) : T("es_def")}`;
    if (!cfgOk) return;
    const dis = ro ? " disabled" : "";
    const seg = (campo, vals) => `<div class="es-seg" role="group">${vals.map(([v, t]) => `<button type="button" data-escampo="${campo}" data-esv="${v}" aria-pressed="${String(cfgEd[campo]) === String(v)}"${dis}>${t}</button>`).join("")}</div>`;
    const sw = (campo, rot) => `<button type="button" class="es-sw" role="switch" aria-checked="${!!cfgEd[campo]}" aria-label="${rot}" data-essw="${campo}"${dis}></button>`;
    const linha = (rot, desc, ctrl, extra) => `<div class="es-row"><div class="es-lbl"><b>${rot}</b>${desc ? `<small>${desc}</small>` : ""}</div>${ctrl}${extra || ""}</div>`;
    const txt = (campo, rot, tipo, ph, max) => `<label class="es-field"><span>${rot}</span><input type="${tipo}" data-estxt="${campo}" maxlength="${max}" value="${escH(cfgEd[campo] || "")}" placeholder="${ph}"${dis}></label>`;
    // Portal, WhatsApp e E-mail: o cliente marca um, dois ou os três
    const canais = base => `<div class="es-seg es-multi" role="group">${[["portal", "Portal"], ["whats", "WhatsApp"], ["email", T("cf_c_email")]].map(([v, t]) => `<button type="button" data-escanal="${base}_${v}" aria-pressed="${!!cfgEd[base + "_" + v]}"${dis}><i aria-hidden="true"></i>${t}</button>`).join("")}</div>`;
    const card = (id, corpo) => `<div class="pcard es-cfg" data-cfgcard="${id}">
      <h2><svg viewBox="0 0 24 24" aria-hidden="true">${ICO_CFG[id]}</svg>${T("cf_t_" + id)}</h2><p class="es-sub">${T("cf_s_" + id)}</p>${corpo}
      ${ro ? "" : `<div class="es-foot"><button type="button" class="es-save" data-cfgsave="${id}"${cfgMudou(id) ? "" : " disabled"}>${T("es_save")}</button><span class="es-msg${cfgMsg[id] && cfgMsg[id].e ? " err" : ""}" role="status">${cfgMsg[id] ? T(cfgMsg[id].k) : ""}</span></div>`}</div>`;
    const lim = cfgEd.retirada_limite != null && !isNaN(cfgEd.retirada_limite) ? String(cfgEd.retirada_limite) : "";
    const idiomaAtual = cfgEd.idioma || currentLang;
    box.innerHTML =
      card("geral",
        linha(T("cf_idioma"), T("cf_idioma_d"), `<div class="es-seg" role="group">${[["pt", "Português"], ["en", "English"]].map(([v, t]) => `<button type="button" data-escampo="idioma" data-esv="${v}" aria-pressed="${idiomaAtual === v}"${dis}>${t}</button>`).join("")}</div>`)
        + linha(T("cf_painel"), T("cf_painel_d"), seg("painel", [["all", T("cf_p_all")], ["net", T("cf_p_net")], ["margin", T("cf_p_margin")], ["after", T("cf_p_after")]])))
      + card("avisos",
        linha(T("cf_av_pend"), T("cf_av_pend_d"), canais("aviso_pend"))
        + linha(T("cf_av_rel"), T("cf_av_rel_d"), canais("aviso_rel"))
        + linha(T("cf_lemb"), T("cf_lemb_d"), seg("pend_lembrete", [[0, T("cf_lemb_0")], [1, T("cf_lemb_n1")], [2, T("cf_lemb_n").replace("{n}", 2)], [3, T("cf_lemb_n").replace("{n}", 3)]]))
        + linha(T("cf_c2"), T("cf_c2_d"), sw("contato2", T("cf_c2")),
            cfgEd.contato2 ? `<div class="es-sub2 es-fields">${txt("contato2_nome", T("cf_c2_nome"), "text", "", 80)}${txt("contato2_email", T("cf_c2_email"), "email", "nome@empresa.com", 120)}${txt("contato2_whats", "WhatsApp", "tel", "+1 555 123 4567", 30)}</div>` : ""))
      + card("estella",
        linha(T("es_resumo"), T("es_resumo_d"), seg("resumo", [["semanal", T("es_sem")], ["mensal", T("es_men")], ["nenhum", T("es_nen")]]))
        + linha(T("es_contas"), T("es_contas_d"), sw("contas", T("es_contas")), cfgEd.contas ? `<div class="es-sub2">${T("es_dias")} ${seg("contas_dias", [3, 7, 14].map(n => [n, T("es_dias_n").replace("{n}", n)]))} ${T("es_dias_s")}</div>` : "")
        + linha(T("es_inv"), T("es_inv_d"), sw("invoices", T("es_inv")))
        + linha(T("es_imp"), T("es_imp_d"), sw("impostos", T("es_imp")))
        + linha(T("es_ret"), T("es_ret_d"), sw("retirada", T("es_ret")), cfgEd.retirada ? `<div class="es-sub2">${T("es_ret_v")} <label class="es-money"><span>US$</span><input type="text" inputmode="decimal" id="es-lim" value="${escH(lim)}" placeholder="8,000" aria-label="${T("es_ret_v")}"${dis}></label></div>` : ""))
      + card("rel",
        linha(T("cf_rel"), T("cf_rel_d"), seg("relatorios", [["traduzido", T("cf_r_pt")], ["original", T("cf_r_en")], ["juntos", T("cf_r_all")]])));
  }
  const cfgNum = s => { const t = String(s || "").replace(/[^0-9.,]/g, ""); if (!t) return null;
    const n = Number(t.replace(/,(?=\d{3}(\D|$))/g, "").replace(",", ".")); return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : NaN; };
  function cfgValidar(c) {
    if (c === "estella" && cfgEd.retirada && !(cfgEd.retirada_limite > 0)) return "es_e_lim";
    if (c === "avisos" && cfgEd.contato2) {
      const nome = (cfgEd.contato2_nome || "").trim(), em = (cfgEd.contato2_email || "").trim(), wa = (cfgEd.contato2_whats || "").replace(/\D/g, "");
      if (!nome) return "cf_e_nome";
      if (!em && !wa) return "cf_e_contato";
      if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return "cf_e_email";
      if (cfgEd.contato2_whats && (wa.length < 8 || wa.length > 15)) return "cf_e_whats";
    }
    return null;
  }
  $("cfg-wrap").addEventListener("click", async e => {
    if (somenteLeitura()) return;
    const b = e.target.closest("button"); if (!b) return;
    const d = b.dataset, cardEl = b.closest("[data-cfgcard]"), c = cardEl && cardEl.dataset.cfgcard;
    if (d.escampo) { cfgEd[d.escampo] = ["contas_dias", "pend_lembrete"].includes(d.escampo) ? Number(d.esv) : d.esv; delete cfgMsg[c]; renderCfg(); return; }
    if (d.escanal) {   // não deixa desmarcar o último canal
      const base = d.escanal.replace(/_(portal|whats|email)$/, "");
      const outros = ["portal", "whats", "email"].map(v => base + "_" + v).filter(k => k !== d.escanal);
      if (cfgEd[d.escanal] && !outros.some(k => cfgEd[k])) { cfgMsg[c] = { k: "cf_e_canal", e: true }; renderCfg(); return; }
      cfgEd[d.escanal] = !cfgEd[d.escanal]; delete cfgMsg[c]; renderCfg(); return;
    }
    if (d.essw) { cfgEd[d.essw] = !cfgEd[d.essw]; delete cfgMsg[c]; renderCfg(); const f = d.essw === "retirada" ? $("es-lim") : d.essw === "contato2" ? document.querySelector('[data-estxt="contato2_nome"]') : null; if (f && cfgEd[d.essw]) f.focus(); return; }
    if (!d.cfgsave) return;
    const erro = cfgValidar(c);
    if (erro) { cfgMsg[c] = { k: erro, e: true }; renderCfg(); return; }
    b.disabled = true; const m = cardEl.querySelector(".es-msg"); if (m) { m.textContent = T("es_saving"); m.classList.remove("err"); }
    const linhaDb = { cliente_email: folder };
    CFG_CARDS[c].forEach(k => { let v = cfgEd[k]; if (typeof v === "string") v = v.trim() || null; linhaDb[k] = v; });
    if (c === "estella" && !(linhaDb.retirada_limite > 0)) linhaDb.retirada_limite = null;
    if (c === "avisos" && !linhaDb.contato2) { linhaDb.contato2_nome = linhaDb.contato2_email = linhaDb.contato2_whats = null; }
    if (c === "geral" && !linhaDb.idioma) linhaDb.idioma = currentLang;
    const { data: row, error } = await sb.from(CFG_TABLE).upsert(linhaDb, { onConflict: "cliente_email" }).select("atualizado_em").single();
    if (error) { cfgMsg[c] = { k: /limite/.test(error.message || "") ? "es_e_lim" : "es_e", e: true }; renderCfg(); return; }
    CFG_CARDS[c].forEach(k => { cfg[k] = linhaDb[k]; cfgEd[k] = linhaDb[k]; });
    cfgSalvo = true; cfgEm = row && row.atualizado_em; cfgMsg[c] = { k: "es_saved" };
    if (c === "estella") { alFiltrar(); alBadge(); }
    if (c === "geral") { chartMode = cfg.painel; if (cfg.idioma !== currentLang && typeof setLang === "function") { setLang(cfg.idioma); relang(); return; } }
    renderCfg();
  });
  $("cfg-wrap").addEventListener("input", e => {
    const t = e.target, cardEl = t.closest("[data-cfgcard]"); if (!cardEl) return;
    const c = cardEl.dataset.cfgcard;
    if (t.id === "es-lim") cfgEd.retirada_limite = cfgNum(t.value);
    else if (t.dataset.estxt) cfgEd[t.dataset.estxt] = t.value;
    else return;
    const s = cardEl.querySelector(".es-save"); if (s) s.disabled = !cfgMudou(c);
    const m = cardEl.querySelector(".es-msg"); if (m) { m.textContent = ""; m.classList.remove("err"); }
    delete cfgMsg[c];
  });
  // Vermelho = alerta: nível "atencao" ou vencimento a 3 dias ou menos (ou vencido). Amarelo = recado.
  const alDias = a => a.vence_em ? Math.round((Date.parse(a.vence_em + "T12:00:00") - Date.parse(hojeISO() + "T12:00:00")) / 864e5) : null;
  const alVermelho = a => a.nivel !== "info" || (a.vence_em != null && alDias(a) <= 3);
  const alPrazo = a => { const n = alDias(a); if (n == null) return "";
    const t = n < 0 ? T("al_dp").replace("{n}", -n) : n === 0 ? T("al_d0") : n === 1 ? T("al_d1") : T("al_dn").replace("{n}", n);
    return `<span class="al-due">${t} · ${dataCurta(a.vence_em)}</span>`; };
  const alOrdem = (x, y) => (alVermelho(y) - alVermelho(x)) || ((x.vence_em || "9999") < (y.vence_em || "9999") ? -1 : (x.vence_em || "9999") > (y.vence_em || "9999") ? 1 : 0) || (y.criado_em || "").localeCompare(x.criado_em || "");
  function alItem(a, ro) {
    const dt = a.visto_em ? new Date(a.visto_em).toLocaleDateString(locale(), { day: "2-digit", month: "2-digit" }) : "";
    const lado = ro
      ? `<small>${a.visto_em ? T("al_cli_seen").replace("{d}", dt) : T("al_cli_new")}</small>`
      : (a.visto_em ? `<small>${T("al_seen_on").replace("{d}", dt)}</small>` : `<button type="button" data-alok="${a.id}">${T("al_ok")}</button>`);
    return `<div class="al-item ${alVermelho(a) ? "red" : "yellow"} ${a.visto_em ? "seen" : ""}">
      <div class="al-body"><b>${escH(a.titulo)}</b>${a.texto ? `<p>${escH(a.texto)}</p>` : ""}${alPrazo(a)}</div>
      <div class="al-side">${a.valor != null ? `<span class="al-val">${a.valor < 0 ? "-" : ""}${money2(a.valor)}</span>` : ""}${lado}</div></div>`;
  }
  // Números no menu: vermelho = alertas não vistos, amarelo = recados não vistos (não aparecem no modo admin)
  function alBadge() {
    const ro = somenteLeitura(), nv = alertas.filter(a => !a.visto_em), nr = nv.filter(alVermelho).length, ny = nv.length - nr;
    const r = $("nav-al-red"), y = $("nav-al-yel");
    r.hidden = !nr; r.textContent = nr; r.title = T("al_red_t").replace("{n}", nr);
    y.hidden = !ny; y.textContent = ny; y.title = T("al_yel_t").replace("{n}", ny);
  }
  function renderAlertas() {
    const ro = somenteLeitura(), card = $("al-card");
    $("al-adm").hidden = !ro; $("al-empty").hidden = !!alertas.length;
    // na visão do admin, todos ficam na lista principal, com a informação de visto
    const lista = alertas.slice().sort(alOrdem);
    const novos = lista.filter(a => ro || !a.visto_em), vistos = ro ? [] : lista.filter(a => a.visto_em);
    card.hidden = !alertas.length;
    if (!alertas.length) return;
    const naoVistos = alertas.filter(a => !a.visto_em), nr = naoVistos.filter(alVermelho).length, ny = naoVistos.length - nr;
    const red = $("al-n-red"), yel = $("al-n-yel");
    red.hidden = !nr; red.textContent = nr; red.title = T("al_red_t").replace("{n}", nr);
    yel.hidden = !ny; yel.textContent = ny; yel.title = T("al_yel_t").replace("{n}", ny);
    $("al-list").innerHTML = novos.map(a => alItem(a, ro)).join("");
    $("al-list").hidden = !novos.length;
    $("al-more").hidden = !vistos.length;
    $("al-more").textContent = alVerVistos ? T("al_hide") : T("al_seen_n").replace("{n}", vistos.length);
    $("al-seen").hidden = !vistos.length || !alVerVistos;
    $("al-seen").innerHTML = vistos.map(a => alItem(a, ro)).join("");
  }
  $("al-card").addEventListener("click", async e => {
    if (e.target.closest("#al-more")) { alVerVistos = !alVerVistos; renderAlertas(); return; }
    const b = e.target.closest("[data-alok]"); if (!b || somenteLeitura()) return;
    const a = alertas.find(x => x.id === b.dataset.alok); if (!a) return;
    b.disabled = true;
    const { data: row, error } = await sb.from(AL_TABLE).update({ visto_em: new Date().toISOString() }).eq("id", a.id).select("visto_em").single();
    if (error) { b.disabled = false; b.textContent = T("al_e"); return; }
    a.visto_em = row.visto_em; renderAlertas(); alBadge();
  });

  // ---------- Pendências: dúvidas de transações do mês ----------
  async function loadDuvidas() {
    duv = [];
    try {
      const r = await sb.from(DUV_TABLE)
        .select("id,mes,conta,data_transacao,descricao,valor,pergunta,palpite,opcoes,pede_recibo,prazo,resposta,resposta_texto,recibo_path,respondido_em,status")
        .eq("cliente_email", folder).order("data_transacao", { ascending: true });
      if (!r.error) duv = r.data || [];
    } catch (e) { /* tabela ainda não criada */ }
    const meses = pdMeses();
    if (!meses.includes(pdMes)) pdMes = meses.find(m => pdAbertas(m).length) || meses[0] || null;
  }
  const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const pdVencida = x => hojeISO() > x.prazo;
  const pdFechada = x => pdVencida(x) || !["pendente", "respondida"].includes(x.status);
  const pdRespondida = x => !!x.resposta && (!x.pede_recibo || !!x.recibo_path);
  const pdMeses = () => [...new Set(duv.map(x => x.mes))].sort().reverse();
  const pdAbertas = m => duv.filter(x => (!m || x.mes === m) && !pdFechada(x) && !pdRespondida(x));
  const dataCurta = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(locale(), { day: "2-digit", month: "short" }).replace(".", ""); };
  const dataLonga = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(locale(), { day: "2-digit", month: "2-digit", year: "numeric" }); };
  const money2 = v => new Intl.NumberFormat(locale(), { style: "currency", currency: "USD" }).format(Math.abs(v));
  const escH = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const somenteLeitura = () => document.body.classList.contains("admin-view");

  // ---------- Indicações (só quem é parceiro: parceiros.email = login do portal) ----------
  let parceiro = null, indicacoes = [];
  const IND_COLS = "id,parceiro_slug,nome,criado_em,status,servico_fechado,data_fechamento,credito_valor,credito_aplicado_em";
  async function loadInd() {
    parceiro = null; indicacoes = [];
    try {
      if (somenteLeitura()) {   // admin vendo a conta do cliente: lê direto (RLS de admin)
        const p = await sb.from("parceiros").select("slug,nome,empresa").eq("email", folder).eq("ativo", true);
        if (!p.error && p.data && p.data.length) {
          parceiro = p.data[0];
          const r = await sb.from("indicacoes").select(IND_COLS).in("parceiro_slug", p.data.map(x => x.slug)).order("criado_em", { ascending: false });
          if (!r.error) indicacoes = r.data || [];
        }
      } else {
        const p = await sb.rpc("meu_parceiro");
        if (!p.error && p.data && p.data.length) {
          parceiro = p.data[0];
          const r = await sb.rpc("minhas_indicacoes");
          if (!r.error) indicacoes = r.data || [];
        }
      }
    } catch (e) { /* programa ainda não instalado */ }
    $("nav-ind").hidden = !parceiro;
  }
  // Link curto aureafi.com/indicacao/<slug>/ (cada parceiro tem a pasta indicacao/<slug>/index.html no site)
  const indUrl = () => parceiro ? `https://aureafi.com/indicacao/${encodeURIComponent(parceiro.slug)}/` : "";
  function renderInd() {
    if (!parceiro) return;
    $("ind-adm").hidden = !somenteLeitura();
    const u = indUrl();
    $("ind-url").value = u;
    $("ind-wa").href = "https://wa.me/?text=" + encodeURIComponent(T("ind_wa_msg").replace("{u}", u));
    $("ind-ok").hidden = true;
    // Crédito: ganho no mês em que o indicado fecha; usado na fatura do mês seguinte (zera todo mês).
    // Se o painel tiver a data em que o crédito foi aplicado, vale essa data.
    const mesHoje = hojeISO().slice(0, 7);
    const proxMes = m => { let [y, mm] = m.split("-").map(Number); mm++; if (mm > 12) { mm = 1; y++; } return `${y}-${String(mm).padStart(2, "0")}`; };
    const nomeMes = m => { const [y, mm] = m.split("-").map(Number); return new Date(y, mm - 1, 1).toLocaleDateString(locale(), { month: "long", year: "numeric" }); };
    const mesCurto = m => { const [y, mm] = m.split("-").map(Number); return new Date(y, mm - 1, 1).toLocaleDateString(locale(), { month: "short", year: "numeric" }).replace(".", "").replace(" de ", "/"); };
    const credito = i => {
      if (i.status !== "ativa" || i.credito_valor == null) return null;
      const ganho = (i.data_fechamento || i.credito_aplicado_em || i.criado_em || "").slice(0, 7);
      const uso = i.credito_aplicado_em ? i.credito_aplicado_em.slice(0, 7) : proxMes(ganho);
      return { valor: +i.credito_valor, ganho, uso, usado: !!i.credito_aplicado_em || uso <= mesHoje };
    };
    const n = indicacoes.length, at = indicacoes.filter(i => i.status === "ativa"), cs = indicacoes.map(credito).filter(Boolean);
    const prox = cs.filter(c => !c.usado).reduce((a, c) => a + c.valor, 0), usado = cs.filter(c => c.usado).reduce((a, c) => a + c.valor, 0);
    $("ind-sum").innerHTML = n ? `<span><b>${n}</b>${T(n === 1 ? "ind_n1" : "ind_n")}</span><span><b>${at.length}</b>${T(at.length === 1 ? "ind_at1" : "ind_at")}</span>`
      + `<span class="next"><b>${money2(prox)}</b>${T("ind_cr")}</span>` + (usado ? `<span class="used"><b>${money2(usado)}</b>${T("ind_used")}</span>` : "") : "";
    // Crédito por mês: o mês atual em destaque, os anteriores em cinza (já usados)
    const meses = {};
    cs.forEach(c => { const m = meses[c.ganho] || (meses[c.ganho] = { valor: 0, uso: c.uso, usado: true }); m.valor += c.valor; m.usado = m.usado && c.usado; });
    const ks = Object.keys(meses).sort().reverse();
    $("ind-hist").hidden = !ks.length;
    $("ind-meses").innerHTML = ks.map(k => { const m = meses[k];
      return `<div class="ind-mes${m.usado ? " used" : ""}"><b>${nomeMes(k)} · ${money2(m.valor)}</b><span>${T(m.usado ? "ind_m_used" : "ind_m_next").replace("{m}", nomeMes(m.uso))}</span></div>`; }).join("");
    $("ind-empty").hidden = !!n;
    const serv = { bookkeeping: "ind_bk", auditoria: "ind_au", tax: "ind_tx" };
    $("ind-list").innerHTML = indicacoes.map(i => {
      const d = (i.criado_em || "").slice(0, 10), st = ["pendente", "ativa", "perdida"].includes(i.status) ? i.status : "pendente";
      const sv = i.status === "ativa" && serv[i.servico_fechado] ? " · " + T(serv[i.servico_fechado]) : "";
      const c = credito(i);
      const cr = c ? `${money2(c.valor)}<small>${c.usado ? T("ind_ap").replace("{m}", mesCurto(c.uso)) : T("ind_ap_no")}</small>` : "";
      return `<div class="ind-row"><div><b>${escH(i.nome)}</b><small>${d ? T("ind_on").replace("{d}", dataCurta(d)) : ""}${sv}</small></div>
        <span class="ind-st ${st}">${T("ind_" + st)}</span><div class="ind-cr${c && c.usado ? " used" : ""}">${cr}</div></div>`;
    }).join("");
  }
  $("ind-copy").addEventListener("click", async () => {
    const u = indUrl(); if (!u) return;
    try { await navigator.clipboard.writeText(u); } catch (e) { $("ind-url").select(); try { document.execCommand("copy"); } catch (x) {} }
    $("ind-ok").hidden = false;
  });

  function pendBadge() {
    const abertas = pdAbertas(null), n = abertas.length, nb = $("nav-pend-n");
    nb.hidden = !n; nb.textContent = n;
    const al = $("pend-alert");
    al.hidden = !n || somenteLeitura();
    if (n) {
      const prazo = abertas.map(x => x.prazo).sort()[0];
      $("pend-alert-t").textContent = n === 1 ? T("pa_t1") : T("pa_tn").replace("{n}", n);
      $("pend-alert-d").textContent = " " + T("pa_d").replace("{d}", dataLonga(prazo));
    }
  }

  function renderPend() {
    const meses = pdMeses(), ro = somenteLeitura();
    $("pend-adm").hidden = !ro;
    $("pd-empty").hidden = !!meses.length;
    $("pd-head").hidden = !meses.length;
    $("pd-months").hidden = meses.length < 2;
    if (!meses.length) { $("pd-list").innerHTML = ""; return; }
    $("pd-months").innerHTML = meses.map(m => { const a = pdAbertas(m).length; return `<button type="button" data-pdmes="${m}" class="${m === pdMes ? "on" : ""}">${mTitle(m)}${a ? `<i>${a}</i>` : ""}</button>`; }).join("");

    const itens = duv.filter(x => x.mes === pdMes);
    const total = itens.length, feitas = itens.filter(pdRespondida).length, faltam = total - feitas;
    const abertas = itens.filter(x => !pdFechada(x) && !pdRespondida(x)), vencido = itens.every(pdFechada);
    // prazo do topo: o mais próximo entre as que faltam; sem nenhuma faltando, o último do mês
    const prazo = (abertas.length ? abertas.map(x => x.prazo).sort()[0] : itens.map(x => x.prazo).sort().slice(-1)[0]);
    pdVariosPrazos = new Set(itens.filter(x => !pdFechada(x)).map(x => x.prazo)).size > 1;
    $("pd-count").textContent = (faltam === 0 || vencido ? T("pd_answered").replace("{a}", feitas) : T("pd_left").replace("{a}", faltam)).replace("{n}", total);
    $("pd-prazo").textContent = "· " + T(vencido ? "pd_prazo_fim" : "pd_prazo").replace("{d}", dataLonga(prazo));
    $("pd-bar").style.width = (total ? Math.round(feitas / total * 100) : 0) + "%";
    $("pd-done").hidden = !(faltam === 0 || vencido);
    $("pd-done").textContent = vencido ? T("pd_closed") : T("pd_done");
    $("pd-help").hidden = vencido || faltam === 0 || ro;

    // sem resposta primeiro (por data); respondidas no fim, em cinza
    const ord = itens.slice().sort((a, b) => (pdRespondida(a) - pdRespondida(b)) || a.data_transacao.localeCompare(b.data_transacao));
    $("pd-list").innerHTML = ord.map(x => pdCard(x, ro)).join("");
  }

  let pdVariosPrazos = false;
  function pdCard(x, ro) {
    const fechada = pdFechada(x), resp = pdRespondida(x), editando = !!pdAberta[x.id] && !fechada && !ro;
    const opcoes = (Array.isArray(x.opcoes) ? x.opcoes : []).filter(o => o !== x.palpite);
    const respTxt = x.resposta === "confirmado" ? T("pd_yes_ans").replace("{p}", x.palpite || "") : x.resposta === "outro" ? x.resposta_texto : x.resposta;
    let corpo = "";
    // Explicação opcional junto com um botão (o texto do "Outro" já é a própria resposta)
    const nota = x.resposta && x.resposta !== "outro" ? (x.resposta_texto || "") : "";
    if (x.resposta && pdAberta[x.id] === "nota" && !fechada && !ro) {
      corpo = `<div class="pd-ans"><span>${T("pd_your")}: <b>${escH(respTxt)}</b></span></div>
        <div class="pd-other"><textarea maxlength="500" id="pdt-${x.id}" placeholder="${T("pd_note_ph")}">${escH(nota)}</textarea>
        <div class="row"><button type="button" class="sv" data-pdnotesave="${x.id}">${T("pd_save")}</button><button type="button" class="cc" data-pdcancel="${x.id}">${T("pd_cancel")}</button></div></div>`;
    } else if (x.resposta && !editando && pdAberta[x.id] !== "outro") {
      corpo = `<div class="pd-ans"><span>${T("pd_your")}: <b>${escH(respTxt)}</b></span>${!fechada && !ro ? `<button type="button" class="ed" data-pdedit="${x.id}">${T("pd_edit")}</button>` : ""}</div>`
        + (nota ? `<div class="pd-note"><small>${T("pd_note_lbl")}</small>${escH(nota)}</div>` : "")
        + (x.resposta !== "outro" && !fechada && !ro ? `<button type="button" class="pd-noteb" data-pdnote="${x.id}">${T(nota ? "pd_note_edit" : "pd_note_add")}</button>` : "");
    } else if (fechada || ro) {
      corpo = `<span class="pd-est">${T(fechada ? "pd_est" : "pd_noans")}</span>`;
    } else if (pdAberta[x.id] === "outro") {
      corpo = `<div class="pd-other"><textarea maxlength="500" id="pdt-${x.id}" placeholder="${T("pd_other_ph")}">${escH(x.resposta === "outro" ? x.resposta_texto : "")}</textarea>
        <div class="row"><button type="button" class="sv" data-pdsave="${x.id}">${T("pd_save")}</button><button type="button" class="cc" data-pdcancel="${x.id}">${T("pd_cancel")}</button></div></div>`;
    } else {
      corpo = `<div class="pd-btns">
        ${x.palpite ? `<button type="button" class="yes" data-pdans="${x.id}" data-v="confirmado">${T("pd_yes")}</button>` : ""}
        ${opcoes.map(o => `<button type="button" data-pdans="${x.id}" data-v="${escH(o)}">${escH(o)}</button>`).join("")}
        <button type="button" data-pdother="${x.id}">${T("pd_other")}</button>
        ${x.resposta ? `<button type="button" data-pdcancel="${x.id}">${T("pd_cancel")}</button>` : ""}</div>`;
    }
    let rec = "";
    if (x.recibo_path) rec = `<div class="pd-rec"><span class="ok">${T("pd_rec_ok")}</span> <a href="#" data-pdview="${x.id}">${T("pd_rec_view")}</a>${!fechada && !ro ? ` <button type="button" data-pdrec="${x.id}">${T("pd_rec_change")}</button>` : ""}</div>`;
    else if (!fechada && !ro && !(resp && !x.pede_recibo)) rec = `<div class="pd-rec${x.pede_recibo ? " req" : ""}"><button type="button" data-pdrec="${x.id}">${T(x.pede_recibo ? "pd_rec_req" : "pd_rec")}</button></div>`;
    const falta = x.resposta && x.pede_recibo && !x.recibo_path && !fechada ? `<p class="pd-warn">${T("pd_rec_missing")}</p>` : "";
    return `<div class="pd-card${resp ? " done" : ""}" id="pd-${x.id}">
      <div class="pd-top"><span>${dataCurta(x.data_transacao)} · ${escH(x.conta)}${pdVariosPrazos && !fechada && !resp ? `<br><b class="pd-due">${T("pd_due").replace("{d}", dataCurta(x.prazo))}</b>` : ""}</span>
        <span class="pd-val">${x.valor < 0 ? "-" : "+"}${money2(x.valor)}<small>${T(x.valor < 0 ? "pd_out" : "pd_in")}</small></span></div>
      <div class="pd-desc">${escH(x.descricao)}</div>
      <p class="pd-q">${escH(x.pergunta)}</p>
      ${x.palpite && !(x.resposta && (!editando || pdAberta[x.id] === "nota")) ? `<div class="pd-guess">${T("pd_guess")}: <b>${escH(x.palpite)}</b></div>` : ""}
      ${corpo}${rec}${falta}<p class="pd-msg" id="pdm-${x.id}" role="status"></p>
    </div>`;
  }

  // Aviso por e-mail para a Aurea quando o cliente responde a última dúvida aberta do mês.
  // Discreto: só o cliente, o mês e a quantidade (as respostas ficam no portal). Não bloqueia nada se falhar.
  function pdAvisarAurea(mes) {
    const chave = (typeof WEB3FORMS_KEY !== "undefined") ? WEB3FORMS_KEY : "";
    if (!chave || somenteLeitura()) return;
    const itens = duv.filter(d => d.mes === mes), nome = perfil.nome || folder;
    const comRecibo = itens.filter(d => d.recibo_path).length;
    fetch("https://api.web3forms.com/submit", {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: chave, from_name: "Aurea portal",
        subject: `Aurea Financial ✧ Pendências respondidas: ${nome} (${mes})`,
        message: `${nome} respondeu todas as pendências abertas de ${mes} no portal.\n\n`
          + `Cliente: ${nome}\nLogin: ${folder}\nDúvidas do mês: ${itens.length} (com recibo: ${comRecibo})\n\n`
          + `Para ver as respostas: https://aureafi.com/portal.html (Ver como cliente) ou, no Mac, python3 ler_respostas.py <cliente> ${mes}`
      })
    }).catch(() => {});
  }

  async function pdSalvar(id, campos) {
    const x = duv.find(d => d.id === id); if (!x) return;
    const abertasAntes = pdAbertas(x.mes).length;
    const msg = $("pdm-" + id); if (msg) msg.textContent = T("pd_saving");
    document.querySelectorAll(`#pd-${CSS.escape(id)} button`).forEach(b => b.disabled = true);
    const { data: row, error } = await sb.from(DUV_TABLE).update(campos).eq("id", id)
      .select("id,mes,conta,data_transacao,descricao,valor,pergunta,palpite,opcoes,pede_recibo,prazo,resposta,resposta_texto,recibo_path,respondido_em,status").single();
    if (error) {
      renderPend();
      const m = $("pdm-" + id); if (m) m.textContent = /prazo|fechada/.test(error.message || "") ? T("pd_e_prazo") : T("pd_e_save");
      return false;
    }
    Object.assign(x, row); delete pdAberta[id];
    renderPend(); pendBadge();
    if (abertasAntes > 0 && pdAbertas(x.mes).length === 0) pdAvisarAurea(x.mes);
    return true;
  }

  let pdRecId = null;
  $("p-pend").addEventListener("click", async e => {
    const b = e.target.closest("button, a"); if (!b) return;
    const d = b.dataset;
    if (d.pdmes) { pdMes = d.pdmes; pdAberta = {}; renderPend(); return; }
    if (d.pdview) {
      e.preventDefault();
      const x = duv.find(z => z.id === d.pdview); if (!x || !x.recibo_path) return;
      const w = window.open("about:blank", "_blank");   // abre antes do await para o celular não bloquear
      const { data: s } = await sb.storage.from(BUCKET).createSignedUrl(x.recibo_path, 600);
      if (w) { if (s && s.signedUrl) w.location.href = s.signedUrl; else w.close(); }
      return;
    }
    if (somenteLeitura()) return;
    if (d.pdans) {   // troca a resposta e mantém a explicação que já existia (se a anterior era "Outro", o texto vira explicação)
      pdSalvar(d.pdans, { resposta: d.v }); return;
    }
    if (d.pdnote) { pdAberta[d.pdnote] = "nota"; renderPend(); const t = $("pdt-" + d.pdnote); if (t) t.focus(); return; }
    if (d.pdnotesave) {
      const t = ($("pdt-" + d.pdnotesave).value || "").trim();
      pdSalvar(d.pdnotesave, { resposta_texto: t ? t.slice(0, 500) : null }); return;
    }
    if (d.pdother) { pdAberta[d.pdother] = "outro"; renderPend(); const t = $("pdt-" + d.pdother); if (t) t.focus(); return; }
    if (d.pdedit) { pdAberta[d.pdedit] = true; renderPend(); return; }
    if (d.pdcancel) { delete pdAberta[d.pdcancel]; renderPend(); return; }
    if (d.pdsave) {
      const t = ($("pdt-" + d.pdsave).value || "").trim();
      if (!t) { $("pdt-" + d.pdsave).focus(); return; }
      pdSalvar(d.pdsave, { resposta: "outro", resposta_texto: t.slice(0, 500) }); return;
    }
    if (d.pdrec) { pdRecId = d.pdrec; $("pd-file").value = ""; $("pd-file").click(); }
  });
  $("pd-file").addEventListener("change", async e => {
    const f = e.target.files[0], id = pdRecId; e.target.value = ""; pdRecId = null;
    if (!f || !id) return;
    const x = duv.find(z => z.id === id), msg = $("pdm-" + id);
    let ext = (f.name.split(".").pop() || "").toLowerCase();
    if (ext === "jpeg") ext = "jpg";
    if (!["jpg", "png", "heic", "heif", "pdf"].includes(ext)) { if (msg) msg.textContent = T("pd_e_type"); return; }
    if (f.size > REC_MAX) { if (msg) msg.textContent = T("pd_e_big"); return; }
    if (msg) msg.textContent = T("pd_rec_sending");
    const path = `${folder}/recibos/${x.mes}/${id}.${ext}`;
    const tipo = f.type || (ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "jpg" ? "image/jpeg" : "image/heic");
    const up = await sb.storage.from(BUCKET).upload(path, f, { upsert: true, contentType: tipo, cacheControl: "60" });
    if (up.error) { if (msg) msg.textContent = T("pd_e_up"); return; }
    pdSalvar(id, { recibo_path: path });
  });

  // ---------- Relatórios ----------
  function renderReports() {
    const ys = years().filter(y => Object.keys(data).some(k => k.startsWith(y) && data[k].files.length));
    $("rep-empty").hidden = !!(ys.length || others.length);
    if (!repYear || !ys.includes(repYear)) repYear = ys[0];
    $("years").innerHTML = ""; $("years").hidden = ys.length < 2;
    ys.forEach(y => { const b = document.createElement("button"); b.type = "button"; b.className = "year" + (y === repYear ? " on" : ""); b.textContent = y; b.onclick = () => swap(() => { repYear = y; repMonth = null; renderReports(); }); $("years").append(b); });
    const mg = $("months"); mg.innerHTML = ""; mg.hidden = !ys.length;
    if (ys.length) for (let m = 1; m <= 12; m++) {
      const k = `${repYear}-${String(m).padStart(2, "0")}`, d = data[k], n = d ? d.files.length : 0;
      const b = document.createElement("button"); b.type = "button"; b.className = "month" + (k === repMonth ? " on" : "");
      b.innerHTML = `<span class="mn"></span><span class="mf"></span>`;
      b.querySelector(".mn").textContent = mName(+repYear, m);
      b.querySelector(".mf").textContent = !n ? T("no_data") : n === 1 ? T("n_docs1") : T("n_docs").replace("{n}", n);
      if (!n) b.disabled = true; else b.onclick = () => { repMonth = k; renderReports(); reveal($("month-files")); $("month-files").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" }); };
      mg.append(b);
    }
    if (!repMonth || !data[repMonth] || !data[repMonth].files.length) {
      const last = Object.keys(data).filter(k => k.startsWith(repYear || "") && data[k].files.length).sort().pop();
      repMonth = last || null;
      mg.querySelectorAll(".month").forEach((b, i) => b.classList.toggle("on", `${repYear}-${String(i + 1).padStart(2, "0")}` === repMonth));
    }
    $("month-files").hidden = !repMonth;
    if (repMonth) { $("mf-title").textContent = mTitle(repMonth); fillFiles($("mf-list"), data[repMonth].files, false); }
    $("others").hidden = !others.length; fillFiles($("others-list"), others, false);
  }

  // ---------- Lista de arquivos + visualizador ----------
  function fillFiles(list, files, withMonth) {
    list.innerHTML = "";
    const pref = cfg.relatorios === "traduzido" ? "pt" : cfg.relatorios === "original" ? "en" : null;
    const ordem = f => pref && fileLang(f.name) !== pref ? 1 : 0;
    files.slice().sort((a, b) => (ordem(a) - ordem(b)) || a.name.localeCompare(b.name)).forEach(f => {
      const li = document.createElement("li");
      li.innerHTML = '<div class="f-main"><span class="f-ico"></span><div><div class="f-name"></div><div class="f-meta"></div></div></div><div class="f-act"><span class="f-lang" role="img"></span><button class="btn btn-line sm" type="button"></button></div>';
      const lg = fileLang(f.name), fl = li.querySelector(".f-lang");
      fl.innerHTML = FLAGS[lg]; fl.setAttribute("aria-label", langLabel(lg)); fl.title = langLabel(lg);
      li.querySelector(".f-ico").textContent = isHtml(f.name) ? "WEB" : ext(f.name);
      li.querySelector(".f-name").textContent = cleanName(f.name);
      li.querySelector(".f-meta").textContent = [withMonth && f.month ? mTitle(f.month) : fmtDate(f.date), fmtSize(f.size)].filter(Boolean).join(" · ");
      const btn = li.querySelector("button"); btn.textContent = T("m_open");
      btn.addEventListener("click", () => openFile(f));
      list.append(li);
    });
  }
  // Relatório interativo: baixa o arquivo e mostra dentro do visualizador, isolado do portal
  async function openHtml(f) {
    const { data: blob, error } = await sb.storage.from(BUCKET).download(f.path);
    if (error || !blob) { $("files-msg").textContent = T("m_err"); return; }
    const html = await blob.text();
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    viewerUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    $("viewer-name").textContent = cleanName(f.name);
    $("viewer-new").hidden = true;
    const dl = $("viewer-dl"); dl.href = viewerUrl; dl.setAttribute("download", f.name);
    $("viewer-body").innerHTML = `<iframe sandbox="allow-scripts allow-popups" src="${viewerUrl}" title=""></iframe>`;
    // envia ao relatório o nome e a logo definidos em Minha conta (o relatório só aceita texto e imagem)
    const fr = $("viewer-body").querySelector("iframe");
    fr.addEventListener("load", () => { if (perfil.nome || logoData) fr.contentWindow.postMessage({ tipo: "aurea-perfil", nome: perfil.nome || null, logo: logoData || null }, "*"); });
    $("viewer").hidden = false; document.body.classList.add("modal-open");
    requestAnimationFrame(() => $("viewer").classList.add("open"));
  }
  async function openFile(f) {
    if (isHtml(f.name)) return openHtml(f);
    $("viewer-new").hidden = false; $("viewer-dl").removeAttribute("download");
    const e = ext(f.name), previewable = ["PDF", "PNG", "JPG", "JPEG", "GIF", "WEBP"].includes(e);
    if (!previewable || isSmall()) {
      const w = window.open("", "_blank");
      const { data: s, error } = await sb.storage.from(BUCKET).createSignedUrl(f.path, 600);
      if (error || !s) { if (w) w.close(); $("files-msg").textContent = T("m_err"); return; }
      if (w) w.location = s.signedUrl; else location.href = s.signedUrl;
      return;
    }
    const [v, dl] = await Promise.all([
      sb.storage.from(BUCKET).createSignedUrl(f.path, 600),
      sb.storage.from(BUCKET).createSignedUrl(f.path, 600, { download: f.name })
    ]);
    if (v.error || !v.data) { $("files-msg").textContent = T("m_err"); return; }
    $("viewer-name").textContent = cleanName(f.name);
    $("viewer-new").href = v.data.signedUrl;
    $("viewer-dl").href = dl.data ? dl.data.signedUrl : v.data.signedUrl;
    $("viewer-body").innerHTML = e === "PDF" ? `<iframe src="${v.data.signedUrl}#view=FitH" title=""></iframe>` : `<img src="${v.data.signedUrl}" alt="">`;
    $("viewer").hidden = false; document.body.classList.add("modal-open");
    requestAnimationFrame(() => $("viewer").classList.add("open"));
  }
  function closeViewer() {
    $("viewer").classList.remove("open"); document.body.classList.remove("modal-open");
    setTimeout(() => { $("viewer").hidden = true; $("viewer-body").innerHTML = ""; if (viewerUrl) { URL.revokeObjectURL(viewerUrl); viewerUrl = null; } }, reduceMotion ? 0 : 250);
  }
  document.querySelectorAll("[data-close-viewer]").forEach(b => b.addEventListener("click", closeViewer));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("viewer").hidden) closeViewer(); });

  // ---------- Sessão ----------
  async function render(session) {
    if (!session) {
      document.body.classList.remove("app-mode"); $("v-dash").hidden = true; $("pre-login").hidden = false; showPre("v-login"); return;
    }
    document.body.classList.add("app-mode");
    $("pre-login").hidden = true; $("v-dash").hidden = false;
    $("files-msg").textContent = "";
    // Modo administrador: a Aurea escolhe a conta do cliente para conferir (só leitura)
    let admin = false;
    try { const { data: a } = await sb.from(ADMIN_TABLE).select("email").eq("email", session.user.email.toLowerCase()).maybeSingle(); admin = !!a; } catch (e) { admin = false; }
    document.body.classList.toggle("admin-view", admin);
    $("admin-bar").hidden = !admin; $("co-card").hidden = $("pw-card").hidden = admin; $("adm-note").hidden = !admin;
    if (admin) return iniciarAdmin();
    await abrirConta(session.user.email);
  }
  async function abrirConta(email) {
    $("acc-email").textContent = email;
    loadPerfil(email);
    try { await loadAll(email); } catch (e) { $("files-msg").textContent = T("m_err"); }
    go(page);
  }
  async function iniciarAdmin() {
    const r = await sb.storage.from(BUCKET).list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });
    const contas = (r.data || []).filter(f => !f.id && f.name.includes("@")).map(f => f.name);
    const sel = $("admin-sel");
    if (!contas.length) { sel.innerHTML = ""; $("files-msg").textContent = T("adm_none"); return; }
    sel.innerHTML = contas.map(c => `<option value="${c}">${c}</option>`).join("");
    let ult = null; try { ult = localStorage.getItem("aurea_admin_conta"); } catch (e) {}
    sel.value = contas.includes(ult) ? ult : contas[0];
    await verComoCliente(sel.value);
  }
  async function verComoCliente(email) {
    try { localStorage.setItem("aurea_admin_conta", email); } catch (e) {}
    $("adm-note").textContent = T("adm_note").replace("{e}", email);
    $("files-msg").textContent = "";
    await abrirConta(email);
  }
  sb.auth.getSession().then(({ data: d }) => render(d.session));

  $("login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("l-email").value.trim(), password = $("l-pass").value, msg = $("login-msg");
    msg.className = "msg";
    if (!email || !password) { msg.textContent = T("m_fill"); return; }
    const btn = e.target.querySelector("button"); btn.disabled = true; msg.textContent = T("m_wait"); msg.classList.add("ok");
    const { data: d, error } = await sb.auth.signInWithPassword({ email, password });
    btn.disabled = false;
    if (error) { msg.className = "msg"; msg.textContent = T("m_bad"); return; }
    msg.textContent = ""; $("l-pass").value = "";
    swap(() => render(d.session));
  });
  $("admin-sel").addEventListener("change", e => swap(() => { selYear = repYear = repMonth = null; selPeriod = "ytd"; return verComoCliente(e.target.value); }));
  $("logout").addEventListener("click", async () => { document.body.classList.remove("admin-view"); $("admin-bar").hidden = true; perfil = { nome: null, logo: null }; pendLogo = null; tirarLogo = false; setLogoUrl(null); await sb.auth.signOut(); page = "dash"; selYear = repYear = repMonth = null; selPeriod = "ytd"; render(null); });

  // ---------- Sua empresa: nome e logo no canto superior direito ----------
  let perfil = { nome: null, logo: null }, logoUrl = null, logoData = null, pendLogo = null, tirarLogo = false, emailAtual = "";
  const paraData = blob => new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => ok(null); fr.readAsDataURL(blob); });
  const logoPath = () => emailAtual + "/perfil/logo.png";
  function setLogoUrl(u) { if (logoUrl) URL.revokeObjectURL(logoUrl); logoUrl = u; if (!u) logoData = null; }
  function paintWho() {
    $("who-name").textContent = perfil.nome || emailAtual;
    $("who").title = emailAtual;
    $("who-logo").hidden = !logoUrl; if (logoUrl) $("who-logo").src = logoUrl;
    $("who").classList.toggle("has-logo", !!logoUrl);
  }
  function paintForm(previewUrl, soImagem) {
    if (!soImagem) $("co-name").value = perfil.nome || "";
    const u = previewUrl !== undefined ? previewUrl : logoUrl;
    $("co-prev").innerHTML = u ? `<img src="${u}" alt="">` : `<span>${T("co_none")}</span>`;
    $("co-rm").hidden = !u;
  }
  async function loadPerfil(email) {
    emailAtual = email.toLowerCase(); perfil = { nome: null, logo: null }; setLogoUrl(null); paintWho();
    try {
      const { data: row } = await sb.from(PROFILE_TABLE).select("nome_empresa, logo_path").eq("cliente_email", emailAtual).maybeSingle();
      if (row) {
        perfil = { nome: row.nome_empresa, logo: row.logo_path };
        if (row.logo_path) { const dl = await sb.storage.from(BUCKET).download(row.logo_path); if (!dl.error) { setLogoUrl(URL.createObjectURL(dl.data)); logoData = await paraData(dl.data); } }
      }
    } catch (e) { /* sem perfil: mostra o e-mail */ }
    paintWho(); paintForm();
  }
  // Reduz a imagem (até 600 x 200 px) e converte para PNG antes de enviar
  function reduzir(file) {
    return new Promise((ok, fail) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 600 / img.width, 200 / img.height), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob(b => b ? ok(b) : fail(new Error("png")), "image/png");
      };
      img.onerror = () => { URL.revokeObjectURL(u); fail(new Error("img")); };
      img.src = u;
    });
  }
  $("co-file").addEventListener("change", async e => {
    const f = e.target.files[0], msg = $("co-msg"); msg.className = "msg"; msg.textContent = ""; e.target.value = "";
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { msg.textContent = T("m_cotype"); return; }
    if (f.size > 5 * 1024 * 1024) { msg.textContent = T("m_cobig"); return; }
    try { pendLogo = await reduzir(f); tirarLogo = false; paintForm(URL.createObjectURL(pendLogo), true); }
    catch (err) { msg.textContent = T("m_cotype"); }
  });
  $("co-rm").addEventListener("click", () => { pendLogo = null; tirarLogo = true; paintForm(null, true); });
  $("co-form").addEventListener("submit", async e => {
    e.preventDefault();
    const msg = $("co-msg"), btn = e.target.querySelector("button[type=submit]"); msg.className = "msg"; msg.textContent = "";
    const nome = $("co-name").value.trim().slice(0, 80) || null;
    btn.disabled = true;
    try {
      let logo = perfil.logo;
      if (pendLogo) {
        const up = await sb.storage.from(BUCKET).upload(logoPath(), pendLogo, { upsert: true, contentType: "image/png", cacheControl: "60" });
        if (up.error) throw up.error; logo = logoPath();
      } else if (tirarLogo && perfil.logo) {
        await sb.storage.from(BUCKET).remove([perfil.logo]); logo = null;
      }
      const { error } = await sb.from(PROFILE_TABLE).upsert({ cliente_email: emailAtual, nome_empresa: nome, logo_path: logo, atualizado_em: new Date().toISOString() }, { onConflict: "cliente_email" });
      if (error) throw error;
      if (pendLogo) { setLogoUrl(URL.createObjectURL(pendLogo)); logoData = await paraData(pendLogo); } else if (tirarLogo) setLogoUrl(null);
      perfil = { nome, logo }; pendLogo = null; tirarLogo = false;
      paintWho(); paintForm(); msg.classList.add("ok"); msg.textContent = T("m_cook");
    } catch (err) { msg.textContent = T("m_coerr"); }
    btn.disabled = false;
  });

  $("pw-form").addEventListener("submit", async e => {
    e.preventDefault();
    const a = $("p-new").value, b = $("p-conf").value, msg = $("pw-msg"); msg.className = "msg";
    if (a.length < 8) { msg.textContent = T("m_short"); return; }
    if (a !== b) { msg.textContent = T("m_diff"); return; }
    const { error } = await sb.auth.updateUser({ password: a });
    if (error) { msg.textContent = T("m_pwerr"); return; }
    msg.classList.add("ok"); msg.textContent = T("m_pwok"); e.target.reset();
  });

  // ---------- Idioma (botões do menu lateral e do cabeçalho) ----------
  const markLang = () => document.querySelectorAll("[data-setlang]").forEach(b => b.classList.toggle("on", b.dataset.setlang === currentLang));
  const relang = () => { markLang(); if (!$("v-dash").hidden) go(page); };
  document.querySelectorAll("[data-setlang]").forEach(b => b.addEventListener("click", () => { setLang(b.dataset.setlang); relang(); }));
  document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", relang));
  markLang();

  let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => {
    if ($("v-dash").hidden) return;
    if (page === "dash" && numYears().length) renderChart(Object.keys(data).filter(k => k.startsWith(selYear) && data[k].num).sort());
    if (page === "account") renderTx();
  }, 150); });
}
