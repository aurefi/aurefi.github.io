/* Aurea Financial — Área do cliente (login, meses, resumo e relatórios) */

// ===== Configuração do Supabase (Project Settings → API Keys) =====
const SUPABASE_URL = "https://eslputtmlufvxhdanczy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-7TaudR-eu2t1e8L6qfgmw_i4cg6Ksa";  // chave publishable (é pública, pode ficar no site)
const BUCKET = "relatorios";       // pastas dos clientes (uma por e-mail)
const SUMMARY_TABLE = "resumo_mensal";

const $ = id => document.getElementById(id);
const T = k => (window.PAGE_DICT[currentLang] || window.PAGE_DICT.pt)[k] || k;
const views = ["v-loading", "v-setup", "v-login", "v-dash"];
const show = v => views.forEach(id => { $(id).hidden = id !== v; });
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isSmall = () => window.matchMedia("(max-width: 700px)").matches;

// Transição suave entre telas
function swap(fn) {
  if (document.startViewTransition && !reduceMotion) document.startViewTransition(fn);
  else fn();
}
function reveal(el) {
  el.hidden = false;
  if (reduceMotion) return;
  el.classList.remove("in"); void el.offsetWidth; el.classList.add("in");
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !window.supabase) {
  show("v-setup");
} else {
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  // ---------- Estado ----------
  let folder = "";
  let data = {};          // { "2026-10": { files:[{path,name,date,size}], sum:{...} } }
  let others = [];        // arquivos sem mês no nome
  let year = null, month = null;

  // ---------- Formatação ----------
  const locale = () => currentLang === "en" ? "en-US" : "pt-BR";
  const money = v => v == null ? "—" : new Intl.NumberFormat(locale(), { style:"currency", currency:"USD", maximumFractionDigits:0 }).format(v);
  const moneyShort = v => {
    if (v == null) return "";
    const a = Math.abs(v), s = v < 0 ? "-" : "";
    if (a >= 1e6) return s + "$" + (a / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (a >= 1e3) return s + "$" + (a / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "k";
    return s + "$" + Math.round(a);
  };
  const pct = v => (v >= 0 ? "+" : "") + v.toFixed(1).replace(".", currentLang === "en" ? "." : ",") + "%";
  const monthName = (y, m, style = "long") => {
    const s = new Date(y, m - 1, 1).toLocaleDateString(locale(), { month: style });
    return s.charAt(0).toUpperCase() + s.slice(1).replace(".", "");
  };
  const monthTitle = key => { const [y, m] = key.split("-").map(Number); return currentLang === "en" ? `${monthName(y, m)} ${y}` : `${monthName(y, m)} de ${y}`; };
  const fmtSize = b => !b ? "" : b < 1048576 ? Math.round(b / 1024) + " KB" : (b / 1048576).toFixed(1) + " MB";
  const fmtDate = s => s ? new Date(s).toLocaleDateString(locale(), { day:"2-digit", month:"short", year:"numeric" }) : "";
  const ext = n => (n.split(".").pop() || "").slice(0, 4).toUpperCase();
  const cleanName = n => {
    const base = n.replace(/\.[^.]+$/, "");
    const c = base.replace(/^\d{4}[-_ ]?\d{2}\s*[-_ ]*\s*/, "").replace(/[_]+/g, " ").trim();
    return c || base;
  };
  const keyFrom = n => {
    const m = n.match(/^(\d{4})[-_ ]?(0[1-9]|1[0-2])(?!\d)/);
    return m ? `${m[1]}-${m[2]}` : null;
  };
  const prevKey = k => { let [y, m] = k.split("-").map(Number); m--; if (!m) { m = 12; y--; } return `${y}-${String(m).padStart(2, "0")}`; };
  const nextKey = k => { let [y, m] = k.split("-").map(Number); m++; if (m > 12) { m = 1; y++; } return `${y}-${String(m).padStart(2, "0")}`; };
  const net = s => s ? (s.lucro_liquido != null ? Number(s.lucro_liquido) : (s.receita != null && s.despesas != null ? Number(s.receita) - Number(s.despesas) : null)) : null;

  // ---------- Carregar dados ----------
  async function loadAll(email) {
    folder = email.toLowerCase();
    data = {}; others = [];
    const slot = k => (data[k] = data[k] || { files: [], sum: null });
    const asFile = (f, path) => ({ path, name: f.name, date: f.created_at || f.updated_at, size: f.metadata && f.metadata.size });

    const root = await sb.storage.from(BUCKET).list(folder, { limit: 1000, sortBy: { column: "name", order: "desc" } });
    if (root.error) throw root.error;
    const items = (root.data || []).filter(f => f.name !== ".emptyFolderPlaceholder");
    const subfolders = [];
    items.forEach(f => {
      if (!f.id) { if (keyFrom(f.name)) subfolders.push(f.name); return; }  // pasta
      const k = keyFrom(f.name), file = asFile(f, folder + "/" + f.name);
      if (k) slot(k).files.push(file); else others.push(file);
    });
    // Pastas por mês (ex.: 2026-10/) também funcionam
    await Promise.all(subfolders.map(async sf => {
      const r = await sb.storage.from(BUCKET).list(folder + "/" + sf, { limit: 200, sortBy: { column: "name", order: "asc" } });
      (r.data || []).filter(f => f.id && f.name !== ".emptyFolderPlaceholder")
        .forEach(f => slot(keyFrom(sf)).files.push(asFile(f, folder + "/" + sf + "/" + f.name)));
    }));
    // Resumo mensal (tabela opcional)
    const s = await sb.from(SUMMARY_TABLE).select("mes,receita,despesas,lucro_liquido,saldo_caixa,observacao");
    if (!s.error) (s.data || []).forEach(r => { if (/^\d{4}-\d{2}$/.test(r.mes)) slot(r.mes).sum = r; });
  }

  const years = () => [...new Set(Object.keys(data).map(k => k.slice(0, 4)))].sort().reverse();

  // ---------- Visão do ano ----------
  function renderYear() {
    const ys = years();
    $("empty").hidden = !!(ys.length || others.length);
    if (!ys.length && !others.length) { $("year-view").hidden = true; return; }
    if (!year || !ys.includes(year)) year = ys[0] || String(new Date().getFullYear());

    // Abas de ano
    const yt = $("years"); yt.innerHTML = "";
    ys.forEach(y => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "year" + (y === year ? " on" : ""); b.textContent = y;
      b.setAttribute("role", "tab"); b.setAttribute("aria-selected", y === year);
      b.addEventListener("click", () => { if (y !== year) swap(() => { year = y; renderYear(); }); });
      yt.append(b);
    });
    yt.hidden = ys.length < 2;

    // Botões dos meses
    const mg = $("months"); mg.innerHTML = "";
    for (let m = 1; m <= 12; m++) {
      const k = `${year}-${String(m).padStart(2, "0")}`, d = data[k];
      const b = document.createElement("button");
      b.type = "button"; b.className = "month";
      const n = d ? net(d.sum) : null;
      const files = d ? d.files.length : 0;
      b.innerHTML = '<span class="mn"></span><span class="mv"></span><span class="mf"></span>';
      b.querySelector(".mn").textContent = monthName(+year, m);
      if (!d) { b.disabled = true; b.querySelector(".mf").textContent = T("no_data"); }
      else {
        if (n != null) { const v = b.querySelector(".mv"); v.textContent = money(n); v.classList.add(n < 0 ? "neg" : "pos"); }
        b.querySelector(".mf").textContent = !files ? "" : files === 1 ? T("n_docs1") : T("n_docs").replace("{n}", files);
        b.addEventListener("click", () => openMonth(k));
      }
      mg.append(b);
    }

    // Outros documentos
    $("others").hidden = !others.length;
    fillFiles($("others-list"), others, false);

    $("month-view").hidden = true;
    reveal($("year-view"));
    renderChart();  // depois de aparecer, para medir a largura certa
  }
  let rz;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (!$("year-view").hidden) renderChart(); }, 150); });

  // ---------- Gráfico: lucro por mês ----------
  function renderChart() {
    const pts = [];
    for (let m = 1; m <= 12; m++) {
      const k = `${year}-${String(m).padStart(2, "0")}`, n = data[k] ? net(data[k].sum) : null;
      pts.push({ k, m, n });
    }
    const has = pts.filter(p => p.n != null);
    $("chart-card").hidden = !has.length;
    if (!has.length) return;
    $("chart-title").textContent = `${T("chart_t")} · ${year}`;

    const W = Math.max(300, Math.round($("chart").clientWidth || 720)), H = W < 500 ? 200 : 240, L = 48, R = 4, Tp = 12, B = 26;
    const max = Math.max(0, ...has.map(p => p.n)), min = Math.min(0, ...has.map(p => p.n));
    const span = (max - min) || 1;
    const nice = v => { const p = Math.pow(10, Math.floor(Math.log10(Math.abs(v) || 1))); return Math.ceil(v / p) * p; };
    const top = max > 0 ? nice(max) : 0, bot = min < 0 ? -nice(-min) : 0;
    const y = v => Tp + (top - v) / ((top - bot) || span) * (H - Tp - B);
    const cw = (W - L - R) / 12, bw = Math.min(28, cw * 0.56);
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${T("chart_t")} ${year}">`;
    // grade recessiva
    const ticks = [top, bot !== 0 ? bot : top / 2, 0].filter((v, i, a) => a.indexOf(v) === i);
    ticks.forEach(t => {
      svg += `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" class="${t === 0 ? "base" : "grid"}"/>`;
      svg += `<text x="${L - 8}" y="${y(t) + 4}" text-anchor="end" class="ax">${moneyShort(t)}</text>`;
    });
    pts.forEach((p, i) => {
      const cx = L + cw * i + cw / 2;
      svg += `<text x="${cx}" y="${H - 6}" text-anchor="middle" class="ax">${monthName(+year, p.m, "short").slice(0, 3)}</text>`;
      if (p.n == null) return;
      const y0 = y(0), y1 = y(p.n), h = Math.max(2, Math.abs(y1 - y0)), r = Math.min(4, h / 2), x = cx - bw / 2;
      const d = p.n >= 0
        ? `M${x},${y0} V${y0 - h + r} Q${x},${y0 - h} ${x + r},${y0 - h} H${x + bw - r} Q${x + bw},${y0 - h} ${x + bw},${y0 - h + r} V${y0} Z`
        : `M${x},${y0} V${y0 + h - r} Q${x},${y0 + h} ${x + r},${y0 + h} H${x + bw - r} Q${x + bw},${y0 + h} ${x + bw},${y0 + h - r} V${y0} Z`;
      svg += `<path d="${d}" class="bar ${p.n < 0 ? "neg" : "pos"}"/>`;
      svg += `<rect x="${L + cw * i}" y="${Tp}" width="${cw}" height="${H - Tp - B}" class="hit" data-k="${p.k}" tabindex="0"/>`;
    });
    svg += "</svg>";
    const box = $("chart"); box.innerHTML = svg;

    const tip = $("tip");
    const showTip = (el, k) => {
      const s = data[k].sum, n = net(s);
      tip.innerHTML = `<b>${monthTitle(k)}</b>` +
        (s.receita != null ? `<span>${T("k_rev")}<em>${money(s.receita)}</em></span>` : "") +
        (s.despesas != null ? `<span>${T("k_exp")}<em>${money(s.despesas)}</em></span>` : "") +
        `<span>${T("k_net")}<em>${money(n)}</em></span>`;
      tip.hidden = false;
      const br = el.getBoundingClientRect(), cr = $("chart-card").getBoundingClientRect();
      let left = br.left - cr.left + br.width / 2 - tip.offsetWidth / 2;
      left = Math.max(8, Math.min(left, cr.width - tip.offsetWidth - 8));
      tip.style.left = left + "px"; tip.style.top = (br.top - cr.top + 8) + "px";
      box.querySelectorAll(".hit").forEach(h => h.classList.toggle("on", h === el));
    };
    box.querySelectorAll(".hit").forEach(h => {
      h.addEventListener("mouseenter", () => showTip(h, h.dataset.k));
      h.addEventListener("focus", () => showTip(h, h.dataset.k));
      h.addEventListener("click", () => openMonth(h.dataset.k));
      h.addEventListener("keydown", e => { if (e.key === "Enter") openMonth(h.dataset.k); });
    });
    box.addEventListener("mouseleave", () => { tip.hidden = true; box.querySelectorAll(".hit").forEach(h => h.classList.remove("on")); });
  }

  // ---------- Visão do mês ----------
  function openMonth(k) {
    swap(() => {
      month = k; year = k.slice(0, 4);
      const d = data[k] || { files: [], sum: null }, s = d.sum, p = data[prevKey(k)] && data[prevKey(k)].sum;
      $("m-back-y").textContent = year;
      $("m-title").textContent = monthTitle(k);

      // KPIs
      const kp = $("kpis"); kp.innerHTML = "";
      if (!s) {
        kp.innerHTML = `<p class="empty sm">${T("no_summary")}</p>`;
      } else {
        const n = net(s), pn = net(p);
        const margin = s.receita ? n / s.receita * 100 : null;
        const pMargin = p && p.receita ? pn / p.receita * 100 : null;
        const tiles = [
          ["k_rev", money(s.receita), s.receita, p && p.receita, true],
          ["k_exp", money(s.despesas), s.despesas, p && p.despesas, false],
          ["k_net", money(n), n, pn, true, true],
          ["k_margin", margin == null ? "—" : pct(margin).replace("+", ""), margin, pMargin, true, false, true],
          ["k_cash", money(s.saldo_caixa), s.saldo_caixa, p && p.saldo_caixa, true]
        ];
        tiles.forEach(([lab, val, cur, prev, upGood, hero, isPts]) => {
          if (cur == null && lab === "k_cash") return;
          const t = document.createElement("div");
          t.className = "kpi" + (hero ? " hero" : "");
          let delta = `<span class="d flat">${T("noprev")}</span>`;
          if (cur != null && prev != null && (isPts || prev !== 0)) {
            const ch = isPts ? cur - prev : (cur - prev) / Math.abs(prev) * 100;
            const good = ch === 0 ? null : (ch > 0) === upGood;
            const txt = isPts ? (ch >= 0 ? "+" : "") + ch.toFixed(1).replace(".", currentLang === "en" ? "." : ",") + " " + T("pp") : pct(ch);
            delta = `<span class="d ${good == null ? "flat" : good ? "up" : "down"}">${ch > 0 ? "▲" : ch < 0 ? "▼" : "•"} ${txt} <small>${T("vs_prev")}</small></span>`;
          }
          t.innerHTML = `<span class="kl">${T(lab)}</span><span class="kv${cur != null && cur < 0 ? " neg" : ""}">${val}</span>${delta}`;
          kp.append(t);
        });
      }
      const note = $("m-note");
      if (s && s.observacao) { note.innerHTML = `<b>${T("note_t")}</b>`; note.append(document.createTextNode(s.observacao)); note.hidden = false; }
      else note.hidden = true;

      fillFiles($("m-files"), d.files, true);
      $("m-nofiles").hidden = !!d.files.length;
      closeViewer();

      // setas: só meses com dados
      const keys = Object.keys(data).sort();
      const i = keys.indexOf(k);
      $("m-prev").disabled = i <= 0; $("m-next").disabled = i < 0 || i >= keys.length - 1;
      $("m-prev").onclick = () => i > 0 && openMonth(keys[i - 1]);
      $("m-next").onclick = () => i < keys.length - 1 && openMonth(keys[i + 1]);

      $("year-view").hidden = true;
      reveal($("month-view"));
    });
    window.scrollTo({ top: $("v-dash").offsetTop - 140, behavior: reduceMotion ? "auto" : "smooth" });
  }
  $("m-back").addEventListener("click", () => swap(() => { month = null; closeViewer(); renderYear(); }));

  // ---------- Lista de arquivos + visualizador ----------
  function fillFiles(list, files, inline) {
    list.innerHTML = "";
    files.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach(f => {
      const li = document.createElement("li");
      li.innerHTML = '<div class="f-main"><span class="f-ico"></span><div><div class="f-name"></div><div class="f-meta"></div></div></div><button class="btn btn-line sm" type="button"></button>';
      li.querySelector(".f-ico").textContent = ext(f.name);
      li.querySelector(".f-name").textContent = cleanName(f.name);
      li.querySelector(".f-meta").textContent = [fmtDate(f.date), fmtSize(f.size)].filter(Boolean).join(" · ");
      const btn = li.querySelector("button"); btn.textContent = T("m_open");
      btn.addEventListener("click", () => openFile(f, inline, li));
      list.append(li);
    });
  }

  async function openFile(f, inline, li) {
    const e = ext(f.name), previewable = ["PDF", "PNG", "JPG", "JPEG", "GIF", "WEBP"].includes(e);
    // No celular (ou arquivos que o navegador não mostra), abre direto em nova aba
    if (!inline || !previewable || isSmall()) {
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
    document.querySelectorAll("#m-files li").forEach(x => x.classList.toggle("active", x === li));
    $("viewer-name").textContent = cleanName(f.name);
    $("viewer-new").href = v.data.signedUrl;
    $("viewer-dl").href = dl.data ? dl.data.signedUrl : v.data.signedUrl;
    $("viewer-body").innerHTML = e === "PDF"
      ? `<iframe src="${v.data.signedUrl}#view=FitH" title=""></iframe>`
      : `<img src="${v.data.signedUrl}" alt="">`;
    reveal($("viewer"));
    setTimeout(() => $("viewer").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }), 60);
  }
  function closeViewer() {
    $("viewer").hidden = true; $("viewer-body").innerHTML = "";
    document.querySelectorAll("#m-files li").forEach(x => x.classList.remove("active"));
  }
  $("viewer-x").addEventListener("click", closeViewer);

  // ---------- Sessão ----------
  async function render(session) {
    if (!session) { show("v-login"); return; }
    $("who").textContent = session.user.email;
    show("v-dash");
    $("files-msg").textContent = "";
    try { await loadAll(session.user.email); }
    catch (e) { $("files-msg").textContent = T("m_err"); return; }
    if (month && data[month]) openMonth(month); else renderYear();
  }
  sb.auth.getSession().then(({ data: d }) => render(d.session));

  $("login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("l-email").value.trim(), password = $("l-pass").value;
    const msg = $("login-msg"); msg.className = "msg";
    if (!email || !password) { msg.textContent = T("m_fill"); return; }
    const btn = e.target.querySelector("button"); btn.disabled = true; msg.textContent = T("m_wait"); msg.classList.add("ok");
    const { data: d, error } = await sb.auth.signInWithPassword({ email, password });
    btn.disabled = false;
    if (error) { msg.className = "msg"; msg.textContent = T("m_bad"); return; }
    msg.textContent = ""; $("l-pass").value = "";
    swap(() => render(d.session));
  });

  $("logout").addEventListener("click", async () => { await sb.auth.signOut(); month = null; year = null; render(null); });
  $("pw-toggle").addEventListener("click", () => { const b = $("pw-box"); if (b.hidden) reveal(b); else b.hidden = true; });
  $("pw-form").addEventListener("submit", async e => {
    e.preventDefault();
    const a = $("p-new").value, b = $("p-conf").value, msg = $("pw-msg");
    msg.className = "msg";
    if (a.length < 8) { msg.textContent = T("m_short"); return; }
    if (a !== b) { msg.textContent = T("m_diff"); return; }
    const { error } = await sb.auth.updateUser({ password: a });
    if (error) { msg.textContent = T("m_pwerr"); return; }
    msg.classList.add("ok"); msg.textContent = T("m_pwok"); e.target.reset();
  });

  // Ao trocar o idioma, redesenha com os textos e datas no novo idioma
  document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", () => {
    if ($("v-dash").hidden) return;
    if (month) openMonth(month); else renderYear();
  }));
}
