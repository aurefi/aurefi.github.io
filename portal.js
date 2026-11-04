/* Aurea Financial — Área do cliente (login + relatórios mensais) */

// ===== Configuração do Supabase (Project Settings → API) =====
const SUPABASE_URL = "https://eslputtmlufvxhdanczy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-7TaudR-eu2t1e8L6qfgmw_i4cg6Ksa";  // chave publishable (é pública, pode ficar no site)
const BUCKET = "relatorios";   // nome do bucket com as pastas dos clientes

const $ = id => document.getElementById(id);
const T = k => (window.PAGE_DICT[currentLang] || window.PAGE_DICT.pt)[k] || k;
const views = ["v-loading", "v-setup", "v-login", "v-dash"];
const show = v => views.forEach(id => { $(id).hidden = id !== v; });

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !window.supabase) {
  show("v-setup");
} else {
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  const fmtSize = b => !b ? "" : b < 1024 * 1024 ? Math.round(b / 1024) + " KB" : (b / 1024 / 1024).toFixed(1) + " MB";
  const fmtDate = s => {
    if (!s) return "";
    try { return new Date(s).toLocaleDateString(currentLang === "en" ? "en-US" : "pt-BR", { day:"2-digit", month:"short", year:"numeric" }); }
    catch (e) { return ""; }
  };
  const ext = n => (n.split(".").pop() || "").slice(0, 4).toUpperCase();

  async function loadFiles(email) {
    const folder = email.toLowerCase();
    const list = $("files"), empty = $("empty"), msg = $("files-msg");
    list.innerHTML = ""; empty.hidden = true; msg.textContent = "";
    const { data, error } = await sb.storage.from(BUCKET).list(folder, { limit: 500, sortBy: { column: "name", order: "desc" } });
    if (error) { msg.textContent = T("m_err"); return; }
    const files = (data || []).filter(f => f.id && f.name !== ".emptyFolderPlaceholder");
    if (!files.length) { empty.hidden = false; return; }
    files.forEach(f => {
      const li = document.createElement("li");
      li.innerHTML = '<div class="f-main"><span class="f-ico"></span><div><div class="f-name"></div><div class="f-meta"></div></div></div><button class="btn btn-line sm" type="button"></button>';
      li.querySelector(".f-ico").textContent = ext(f.name);
      li.querySelector(".f-name").textContent = f.name.replace(/\.[^.]+$/, "");
      li.querySelector(".f-meta").textContent = [fmtDate(f.created_at || f.updated_at), fmtSize(f.metadata && f.metadata.size)].filter(Boolean).join(" · ");
      const btn = li.querySelector("button");
      btn.textContent = T("m_open");
      btn.addEventListener("click", async () => {
        const w = window.open("", "_blank");  // abre já no clique (evita bloqueio de popup)
        const { data: s, error: e } = await sb.storage.from(BUCKET).createSignedUrl(folder + "/" + f.name, 120);
        if (e || !s) { if (w) w.close(); msg.textContent = T("m_err"); return; }
        if (w) w.location = s.signedUrl; else location.href = s.signedUrl;
      });
      list.append(li);
    });
  }

  async function render(session) {
    if (!session) { show("v-login"); return; }
    $("who").textContent = session.user.email;
    show("v-dash");
    await loadFiles(session.user.email);
  }

  sb.auth.getSession().then(({ data }) => render(data.session));

  $("login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("l-email").value.trim(), password = $("l-pass").value;
    const msg = $("login-msg"); msg.className = "msg";
    if (!email || !password) { msg.textContent = T("m_fill"); return; }
    const btn = e.target.querySelector("button"); btn.disabled = true; msg.textContent = T("m_wait"); msg.classList.add("ok");
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    btn.disabled = false;
    if (error) { msg.className = "msg"; msg.textContent = T("m_bad"); return; }
    msg.textContent = ""; $("l-pass").value = "";
    render(data.session);
  });

  $("logout").addEventListener("click", async () => { await sb.auth.signOut(); render(null); });

  $("pw-toggle").addEventListener("click", () => { $("pw-box").hidden = !$("pw-box").hidden; });
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

  // Ao trocar o idioma, refaz a lista para traduzir os botões e as datas
  document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", () =>
    sb.auth.getSession().then(({ data }) => { if (data.session) loadFiles(data.session.user.email); })));
}
