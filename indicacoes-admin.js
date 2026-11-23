/* Aurea Financial - painel de indicações (só e-mails da tabela admins).
   As regras de acesso do Supabase garantem que só admins leem e editam; esta página só mostra. */
(function () {
  const SUPABASE_URL = "https://eslputtmlufvxhdanczy.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_-7TaudR-eu2t1e8L6qfgmw_i4cg6Ksa";   // chave publishable (é pública)
  const LINK_BASE = "https://aureafi.com/indicacao.html?ref=";
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = v => v == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
  const dataBR = s => { if (!s) return ""; const d = new Date(s); return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }); };
  const hora = s => new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const ST = { pendente: "Pendente", ativa: "Ativa", perdida: "Perdida" };
  const SV = { bookkeeping: "Bookkeeping", auditoria: "Auditoria de seguro", tax: "Tax" };

  let parceiros = [], indicacoes = [], fParceiro = "", fStatus = "", aberta = null;

  function tela(id) { ["ix-login", "ix-noadm", "ix-app"].forEach(x => $(x).hidden = x !== id); }

  async function iniciar() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { $("ix-out").hidden = true; $("ix-who").textContent = ""; return tela("ix-login"); }
    const email = session.user.email.toLowerCase();
    $("ix-who").textContent = email; $("ix-out").hidden = false;
    let admin = false;
    try { const { data } = await sb.from("admins").select("email").eq("email", email).maybeSingle(); admin = !!data; } catch (e) {}
    if (!admin) return tela("ix-noadm");
    tela("ix-app");
    await carregar();
  }

  async function carregar() {
    const [p, i] = await Promise.all([
      sb.from("parceiros").select("slug,nome,empresa,ativo").order("nome"),
      sb.from("indicacoes").select("*").order("criado_em", { ascending: false })
    ]);
    if (p.error || i.error) { $("ix-list").innerHTML = `<div class="ix-card ix-empty">Não foi possível carregar as indicações. Atualize a página.</div>`; return; }
    parceiros = p.data || []; indicacoes = i.data || [];
    const sel = $("ix-fp"), v = fParceiro;
    sel.innerHTML = `<option value="">Todos os parceiros</option>` + parceiros.map(x => `<option value="${esc(x.slug)}">${esc(x.nome)}</option>`).join("");
    sel.value = v;
    desenharParceiros(); desenharLista();
  }

  function desenharParceiros() {
    $("ix-partners").innerHTML = parceiros.map(p => {
      const meus = indicacoes.filter(x => x.parceiro_slug === p.slug);
      const n = s => meus.filter(x => x.status === s).length;
      const credito = meus.filter(x => x.status === "ativa").reduce((t, x) => t + (+x.credito_valor || 0), 0);
      const aplicado = meus.filter(x => x.credito_aplicado_em).reduce((t, x) => t + (+x.credito_valor || 0), 0);
      return `<div class="ix-card ix-p">
        <h3>${esc(p.nome)}${p.ativo ? "" : `<span class="ix-off">inativo</span>`}</h3>
        <div class="co">${esc(p.empresa || "")}</div>
        <div class="ix-link"><code>${esc(LINK_BASE + p.slug)}</code><button type="button" data-copy="${esc(LINK_BASE + p.slug)}">Copiar link</button></div>
        <div class="ix-kpis">
          <div class="k-pend"><small>Pendentes</small><b>${n("pendente")}</b></div>
          <div class="k-at"><small>Ativas</small><b>${n("ativa")}</b></div>
          <div><small>Perdidas</small><b>${n("perdida")}</b></div>
          <div class="k-cr" title="Aplicado: ${money(aplicado)}"><small>Crédito</small><b>${money(credito)}</b></div>
        </div>
      </div>`;
    }).join("") || `<div class="ix-card">Nenhum parceiro cadastrado.</div>`;
  }

  function desenharLista() {
    const lista = indicacoes.filter(x => (!fParceiro || x.parceiro_slug === fParceiro) && (!fStatus || x.status === fStatus));
    const nomeP = slug => (parceiros.find(p => p.slug === slug) || {}).nome || slug;
    if (!lista.length) { $("ix-list").innerHTML = `<div class="ix-card ix-empty">Nenhuma indicação ${fStatus ? "com este status" : "ainda"}.</div>`; return; }
    $("ix-list").innerHTML = lista.map(x => {
      const wa = String(x.whatsapp || "").replace(/\D/g, "");
      return `<div class="ix-row" data-id="${esc(x.id)}">
        <div class="ix-row-h">
          <div class="d">${dataBR(x.criado_em)} ${hora(x.criado_em)}<br>${esc(nomeP(x.parceiro_slug))}</div>
          <div class="n"><b>${esc(x.nome)}</b><span>${esc(x.empresa_indicado || "")}</span></div>
          <div class="c"><a href="mailto:${esc(x.email)}">${esc(x.email)}</a><a href="https://wa.me/${wa}" target="_blank" rel="noopener">${esc(x.whatsapp)}</a></div>
          <div><span class="ix-st ${esc(x.status)}">${ST[x.status] || esc(x.status)}</span>${x.servico_fechado ? `<div class="d">${SV[x.servico_fechado] || ""}</div>` : ""}</div>
          <div><button type="button" data-edit="${esc(x.id)}">${aberta === x.id ? "Fechar" : "Editar"}</button></div>
        </div>
        ${x.mensagem ? `<div class="ix-msgtxt">${esc(x.mensagem)}</div>` : ""}
        ${aberta === x.id ? formEdicao(x) : ""}
      </div>`;
    }).join("");
  }

  function formEdicao(x) {
    const opt = (o, v) => Object.entries(o).map(([k, t]) => `<option value="${k}"${k === v ? " selected" : ""}>${t}</option>`).join("");
    return `<div class="ix-edit"><form data-form="${esc(x.id)}" novalidate>
      <div class="ix-grid">
        <div><label>Status</label><select name="status">${opt(ST, x.status)}</select></div>
        <div><label>Serviço fechado</label><select name="servico_fechado"><option value="">—</option>${opt(SV, x.servico_fechado)}</select></div>
        <div><label>Data de fechamento</label><input type="date" name="data_fechamento" value="${esc(x.data_fechamento || "")}"></div>
        <div><label>Crédito (US$)</label><input type="number" name="credito_valor" min="0" step="0.01" value="${x.credito_valor == null ? "" : esc(x.credito_valor)}"></div>
        <div><label>Crédito aplicado em</label><input type="date" name="credito_aplicado_em" value="${esc(x.credito_aplicado_em || "")}"></div>
      </div>
      <p class="hint">Regra: 5% do plano de bookkeeping ou 15% da auditoria de seguro, como crédito na fatura do parceiro no mês em que o indicado fecha contrato.</p>
      <label>Observação interna</label><textarea name="observacao">${esc(x.observacao || "")}</textarea>
      <div class="acts"><button class="btn btn-gold" type="submit">Salvar</button><span class="ok" role="status"></span></div>
    </form></div>`;
  }

  // ===== Eventos =====
  document.addEventListener("click", async e => {
    const c = e.target.closest("[data-copy]");
    if (c) { try { await navigator.clipboard.writeText(c.dataset.copy); c.textContent = "Copiado"; setTimeout(() => c.textContent = "Copiar link", 1500); } catch (err) {} return; }
    const ed = e.target.closest("[data-edit]");
    if (ed) { aberta = aberta === ed.dataset.edit ? null : ed.dataset.edit; desenharLista(); return; }
    const ch = e.target.closest("#ix-fs button");
    if (ch) { fStatus = ch.dataset.s; document.querySelectorAll("#ix-fs button").forEach(b => b.classList.toggle("on", b === ch)); desenharLista(); }
  });
  $("ix-fp").addEventListener("change", e => { fParceiro = e.target.value; desenharLista(); });

  document.addEventListener("submit", async e => {
    const f = e.target.closest("[data-form]");
    if (!f) return;
    e.preventDefault();
    const v = n => f.elements[n].value.trim();
    const dados = {
      status: v("status"),
      servico_fechado: v("servico_fechado") || null,
      data_fechamento: v("data_fechamento") || null,
      credito_valor: v("credito_valor") === "" ? null : Math.round(parseFloat(v("credito_valor")) * 100) / 100,
      credito_aplicado_em: v("credito_aplicado_em") || null,
      observacao: v("observacao") || null
    };
    // "Ativa" sem data de fechamento: usa hoje (o portal do parceiro conta o crédito pelo mês do fechamento)
    if (dados.status === "ativa" && !dados.data_fechamento) {
      const d = new Date(); dados.data_fechamento = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    const msg = f.querySelector(".ok"), btn = f.querySelector("button[type=submit]");
    btn.disabled = true; msg.style.color = ""; msg.textContent = "Salvando...";
    const { data, error } = await sb.from("indicacoes").update(dados).eq("id", f.dataset.form).select().single();
    btn.disabled = false;
    if (error) { msg.style.color = "#A23B2A"; msg.textContent = "Não foi possível salvar. " + (error.message || ""); return; }
    const i = indicacoes.findIndex(x => x.id === data.id); if (i >= 0) indicacoes[i] = data;
    aberta = null; desenharParceiros(); desenharLista();
  });

  $("ix-login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("ix-email").value.trim().toLowerCase(), password = $("ix-pass").value;
    $("ix-login-msg").textContent = "Entrando...";
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { $("ix-login-msg").textContent = "E-mail ou senha incorretos."; return; }
    $("ix-login-msg").textContent = ""; iniciar();
  });
  $("ix-out").addEventListener("click", async () => { await sb.auth.signOut(); iniciar(); });

  iniciar();
})();
