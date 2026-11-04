/* Aurea Financial — Área do cliente: painel, relatórios e conta */

// ===== Configuração =====
const SUPABASE_URL = "https://eslputtmlufvxhdanczy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-7TaudR-eu2t1e8L6qfgmw_i4cg6Ksa";  // chave publishable (é pública)
const BUCKET = "relatorios";        // uma pasta por cliente (o e-mail dele)
const DATA_FOLDER = "dados";        // dentro da pasta do cliente: exports do QuickBooks (P&L por mês)
const SUMMARY_TABLE = "resumo_mensal";  // opcional: notas do mês e valores manuais

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
  let folder = "", data = {}, others = [];
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
  const cleanName = n => { const b = n.replace(/\.[^.]+$/, ""); return b.replace(/^\d{4}[-_ ]?\d{2}\s*[-_ ]*\s*/, "").replace(/_+/g, " ").trim() || b; };
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
      if (inc != null || despesas != null || net != null) out[k] = { receita: inc, despesas, lucro: net };
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
    let hasData = false;
    items.forEach(f => {
      if (!f.id) { if (f.name.toLowerCase() === DATA_FOLDER) hasData = true; else if (keyFrom(f.name)) monthFolders.push(f.name); return; }
      const k = keyFrom(f.name), file = asFile(f, folder + "/" + f.name);
      if (k) slot(k).files.push(file); else others.push(file);
    });
    await Promise.all(monthFolders.map(async sf => {
      const r = await sb.storage.from(BUCKET).list(folder + "/" + sf, { limit: 200 });
      (r.data || []).filter(f => f.id && f.name !== ".emptyFolderPlaceholder").forEach(f => slot(keyFrom(sf)).files.push(asFile(f, folder + "/" + sf + "/" + f.name)));
    }));
    // Exports do QuickBooks na pasta "dados" (os mais novos têm prioridade)
    if (hasData && window.XLSX) {
      const r = await sb.storage.from(BUCKET).list(folder + "/" + DATA_FOLDER, { limit: 100, sortBy: { column: "updated_at", order: "asc" } });
      const files = (r.data || []).filter(f => f.id && /\.(xlsx|xls|csv)$/i.test(f.name));
      for (const f of files) {
        try {
          const dl = await sb.storage.from(BUCKET).download(folder + "/" + DATA_FOLDER + "/" + f.name);
          if (dl.error) continue;
          const buf = await dl.data.arrayBuffer();
          const wb = /\.csv$/i.test(f.name) ? XLSX.read(new TextDecoder().decode(buf), { type: "string" }) : XLSX.read(buf, { type: "array" });
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
          Object.entries(parsePL(rows)).forEach(([k, v]) => { slot(k).num = v; });
        } catch (e) { /* arquivo ignorado */ }
      }
    }
    // Tabela opcional: nota do mês e valores manuais (usados quando não há export)
    const s = await sb.from(SUMMARY_TABLE).select("mes,receita,despesas,lucro_liquido,observacao");
    if (!s.error) (s.data || []).forEach(r => {
      if (!/^\d{4}-\d{2}$/.test(r.mes)) return;
      const d = slot(r.mes);
      if (r.observacao) d.note = r.observacao;
      if (!d.num && (r.receita != null || r.despesas != null || r.lucro_liquido != null)) {
        const rc = r.receita != null ? +r.receita : null, dp = r.despesas != null ? +r.despesas : null;
        d.num = { receita: rc, despesas: dp, lucro: r.lucro_liquido != null ? +r.lucro_liquido : (rc != null && dp != null ? rc - dp : null) };
      }
    });
  }

  const years = () => [...new Set(Object.keys(data).map(k => k.slice(0, 4)))].sort().reverse();
  const numYears = () => [...new Set(Object.keys(data).filter(k => data[k].num).map(k => k.slice(0, 4)))].sort().reverse();

  // ---------- Navegação ----------
  function go(p) {
    page = p;
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("on", b.dataset.page === p));
    $("app-title").textContent = T({ dash: "nav_dash", reports: "nav_reports", account: "nav_account" }[p]);
    ["dash", "reports", "account"].forEach(x => { if (x !== p) $("p-" + x).hidden = true; });
    if (p === "dash") renderDash(); if (p === "reports") renderReports();
    reveal($("p-" + p));
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
    fp.innerHTML = `<option value="ytd">${T("ytd")}</option>` + mk.slice().reverse().map(k => `<option value="${k}"${k === selPeriod ? " selected" : ""}>${mName(+k.slice(0, 4), +k.slice(5))}</option>`).join("");
    fp.value = selPeriod;

    // KPIs
    let cur, prev = null, sub;
    if (selPeriod === "ytd") {
      cur = mk.reduce((a, k) => { const n = data[k].num; ["receita", "despesas", "lucro"].forEach(f => { if (n[f] != null) a[f] = (a[f] || 0) + n[f]; }); return a; }, {});
      const last = mk[mk.length - 1];
      sub = (mk.length === 1 ? T("month_1") : T("months_in").replace("{n}", mk.length)) + " · " + mName(+selYear, +mk[0].slice(5), "short") + "–" + mName(+selYear, +last.slice(5), "short");
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
      const keys = Object.keys(data).filter(x => data[x].files.length).sort().reverse();
      files = keys.slice(0, 3).flatMap(x => data[x].files.map(f => Object.assign({ month: x }, f))).slice(0, 5);
      title = T("files_latest");
    }
    $("dash-files-t").textContent = title;
    fillFiles($("dash-files"), files, !k);
    $("dash-nofiles").hidden = !!files.length;
  }

  // ---------- Gráfico: receita e despesas (barras) + lucro (linha), um único eixo em US$ ----------
  function renderChart(mk) {
    const box = $("chart"), y = +selYear;
    $("chart-title").textContent = `${T("chart_t")} · ${selYear}`;
    const pts = []; for (let m = 1; m <= 12; m++) { const k = `${selYear}-${String(m).padStart(2, "0")}`; pts.push({ k, m, n: data[k] && data[k].num }); }
    const vals = pts.filter(p => p.n).flatMap(p => [p.n.receita, p.n.despesas, p.n.lucro]).filter(v => v != null);
    const W = Math.max(320, Math.round(box.clientWidth || 800)), H = W < 560 ? 220 : 280, L = 50, R = 6, Tp = 14, B = 28;
    const nice = v => { if (!v) return 0; const p = Math.pow(10, Math.floor(Math.log10(Math.abs(v)))), n = Math.abs(v) / p; const s = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10; return Math.sign(v) * s * p; };
    const vmax = Math.max(0, ...vals), vmin = Math.min(0, ...vals);
    const step = nice((vmax - vmin) / 4) || 1;
    const top = Math.max(step, Math.ceil(vmax / step) * step), bot = Math.floor(vmin / step) * step;
    const yy = v => Tp + (top - v) / (top - bot) * (H - Tp - B);
    const cw = (W - L - R) / 12, bw = Math.max(4, Math.min(16, (cw - 14) / 2));
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${T("chart_t")} ${selYear}">`;
    const ticks = []; for (let t = bot; t <= top + 1e-9; t += step) ticks.push(Math.round(t * 100) / 100);
    ticks.forEach(t => { s += `<line x1="${L}" x2="${W - R}" y1="${yy(t)}" y2="${yy(t)}" class="${Math.abs(t) < 1e-9 ? "base" : "grid"}"/><text x="${L - 8}" y="${yy(t) + 4}" text-anchor="end" class="ax">${short(t)}</text>`; });
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
      tip.innerHTML = `<b>${mTitle(el.dataset.k)}</b><span><i class="lg rev"></i>${T("k_rev")}<em>${money(n.receita)}</em></span><span><i class="lg exp"></i>${T("k_exp")}<em>${money(n.despesas)}</em></span><span><i class="lg net"></i>${T("k_net")}<em>${money(n.lucro)}</em></span>`;
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
    files.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach(f => {
      const li = document.createElement("li");
      li.innerHTML = '<div class="f-main"><span class="f-ico"></span><div><div class="f-name"></div><div class="f-meta"></div></div></div><button class="btn btn-line sm" type="button"></button>';
      li.querySelector(".f-ico").textContent = ext(f.name);
      li.querySelector(".f-name").textContent = cleanName(f.name);
      li.querySelector(".f-meta").textContent = [withMonth && f.month ? mTitle(f.month) : fmtDate(f.date), fmtSize(f.size)].filter(Boolean).join(" · ");
      const btn = li.querySelector("button"); btn.textContent = T("m_open");
      btn.addEventListener("click", () => openFile(f));
      list.append(li);
    });
  }
  async function openFile(f) {
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
    setTimeout(() => { $("viewer").hidden = true; $("viewer-body").innerHTML = ""; }, reduceMotion ? 0 : 250);
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
    $("who").textContent = session.user.email; $("acc-email").textContent = session.user.email;
    $("files-msg").textContent = "";
    try { await loadAll(session.user.email); } catch (e) { $("files-msg").textContent = T("m_err"); }
    go(page);
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
  $("logout").addEventListener("click", async () => { await sb.auth.signOut(); page = "dash"; selYear = repYear = repMonth = null; selPeriod = "ytd"; render(null); });

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

  let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (page === "dash" && !$("v-dash").hidden && numYears().length) renderChart(Object.keys(data).filter(k => k.startsWith(selYear) && data[k].num).sort()); }, 150); });
}
