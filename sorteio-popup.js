/* Aurea Financial — popup de inscrição do sorteio (2 meses de bookkeeping grátis) */
(function () {
  // ===== Configuração =====
  const FIM_INSCRICOES = new Date("2026-11-25T23:59:59-06:00"); // 25/11, 23h59 (horário central)
  const SB_URL = "https://eslputtmlufvxhdanczy.supabase.co";
  const SB_KEY = "sb_publishable_-7TaudR-eu2t1e8L6qfgmw_i4cg6Ksa";   // chave publishable (pública)
  const TABELA = "sorteio_inscricoes";
  const AVISO_EMAIL_KEY = (typeof WEB3FORMS_KEY !== "undefined") ? WEB3FORMS_KEY : ""; // aviso por e-mail a cada inscrição
  const ABRIR_SOZINHO = document.body.dataset.page === "home";    // abre sozinho só na página inicial
  const ESPERA_MS = 6000;                                          // ...depois de 6 segundos (ou ao rolar 35% da página)

  const aberto = new Date() <= FIM_INSCRICOES;
  const viaLink = /(^|[?&])sorteio(=|&|$)/.test(location.search.slice(1)) || location.hash === "#sorteio";
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // Depois do prazo, os links levam ao regulamento e nada abre sozinho
  if (!aberto) {
    if (viaLink) { location.replace("sorteio.html"); return; }
    document.querySelectorAll("[data-open-sorteio]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); location.href = "sorteio.html"; }));
    return;
  }

  // ===== Popup =====
  document.body.insertAdjacentHTML("beforeend", `
  <div class="modal sorteio-modal" id="sorteio-modal" role="dialog" aria-modal="true" aria-labelledby="sorteio-title" hidden>
    <div class="modal-backdrop" data-close-sorteio></div>
    <div class="modal-box sorteio-box">
      <button class="modal-close sorteio-x" type="button" data-close-sorteio aria-label="Fechar">&times;</button>
      <div class="sorteio-top">
        <span class="sorteio-tag">Sorteio</span>
        <h3 id="sorteio-title">2 meses de bookkeeping grátis</h3>
        <p>Para empresas de construção, limpeza e manutenção nos EUA: QuickBooks organizado, banco e cartões conciliados e relatórios todo mês em português e inglês.</p>
        <div class="sorteio-dates">
          <span><b>Inscrições até 25/11</b></span>
          <span>Sorteio em 26/11, ao vivo no Instagram @aureafinancial</span>
        </div>
      </div>

      <form class="sorteio-form" id="sorteio-form" novalidate>
        <label for="s-nome">Nome completo *</label>
        <input id="s-nome" name="nome" autocomplete="name" required>
        <label for="s-email">E-mail *</label>
        <input id="s-email" name="email" type="email" autocomplete="email" required>
        <label for="s-wa">WhatsApp *</label>
        <div class="s-phone">
          <div class="s-ddi">
            <span class="s-ddi-face" aria-hidden="true"><span class="s-flag" id="s-flag"></span><span id="s-ddi-code">+1</span><svg class="s-chev" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4"/></svg></span>
            <select id="s-pais" aria-label="País do WhatsApp"></select>
          </div>
          <input id="s-wa" name="whatsapp" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(000) 000-0000" required>
        </div>
        <input type="text" name="empresa_site" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <label class="s-check"><input type="checkbox" id="s-aceite" required> <span>Li e aceito o <a href="sorteio.html" target="_blank" rel="noopener">regulamento do sorteio</a>.</span></label>
        <button class="btn btn-gold" type="submit">Quero participar</button>
        <p class="form-status" id="s-status" role="status"></p>
        <p class="form-note">Quem se inscreve também recebe a Black Friday da Aurea antes de todo mundo. Não é preciso comprar nada para participar. Veja o <a href="sorteio.html" target="_blank" rel="noopener">regulamento completo</a>.</p>
      </form>

      <div class="sorteio-ok" id="sorteio-ok" hidden>
        <div class="check-ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <h3 id="sorteio-ok-title">Inscrição confirmada!</h3>
        <p id="sorteio-ok-text">O sorteio é em 26/11, às 20h (horário central), ao vivo no Instagram @aureafinancial. Boa sorte!</p>
        <a class="btn btn-dark" href="https://www.instagram.com/aureafinancial/" target="_blank" rel="noopener">Seguir no Instagram</a>
      </div>
    </div>
  </div>
  <button type="button" class="sorteio-pill" id="sorteio-pill" data-open-sorteio hidden>Sorteio: 2 meses grátis</button>`);

  const modal = document.getElementById("sorteio-modal");
  const pill = document.getElementById("sorteio-pill");
  const form = document.getElementById("sorteio-form");
  const status = document.getElementById("s-status");
  const ptAtivo = () => typeof currentLang === "undefined" || currentLang === "pt";

  // ===== WhatsApp: país (código + bandeira) e formato do número =====
  const mascara = (d, m) => { let s = "", i = 0; for (const c of m) { if (i >= d.length) break; s += c === "X" ? d[i++] : c; } return s; };
  const PAISES = {
    us: { nome: "Estados Unidos", ddi: "1", emoji: "🇺🇸", min: 10, max: 10, ph: "(000) 000-0000",
          fmt: d => mascara(d, "(XXX) XXX-XXXX"), erro: "Confira o WhatsApp: nos EUA são 10 dígitos, com o código de área. Ex.: (325) 956-5160.",
          flag: '<svg viewBox="0 0 19 10"><rect width="19" height="10" fill="#B22234"/><path d="M0 1.15h19M0 2.69h19M0 4.23h19M0 5.77h19M0 7.31h19M0 8.85h19" stroke="#fff" stroke-width=".77"/><rect width="7.6" height="5.38" fill="#3C3B6E"/></svg>' },
    br: { nome: "Brasil", ddi: "55", emoji: "🇧🇷", min: 10, max: 11, ph: "(00) 00000-0000",
          fmt: d => mascara(d, d.length > 10 ? "(XX) XXXXX-XXXX" : "(XX) XXXX-XXXX"), erro: "Confira o WhatsApp: no Brasil, use o DDD e o número. Ex.: (11) 98765-4321.",
          flag: '<svg viewBox="0 0 20 14"><rect width="20" height="14" fill="#009C3B"/><path d="M10 1.4L18.4 7 10 12.6 1.6 7z" fill="#FFDF00"/><circle cx="10" cy="7" r="3.4" fill="#002776"/><path d="M6.7 6.3c2.2-.5 4.6-.1 6.6 1.1" stroke="#fff" stroke-width=".6" fill="none"/></svg>' },
    pt: { nome: "Portugal", ddi: "351", emoji: "🇵🇹", min: 9, max: 9, ph: "000 000 000",
          fmt: d => mascara(d, "XXX XXX XXX"), erro: "Confira o WhatsApp: em Portugal são 9 dígitos. Ex.: 912 345 678.",
          flag: '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#DA291C"/><rect width="12" height="20" fill="#046A38"/><circle cx="12" cy="10" r="4.2" fill="#FFE900"/><circle cx="12" cy="10" r="2.4" fill="#DA291C"/></svg>' }
  };
  const selPais = document.getElementById("s-pais"), inWa = document.getElementById("s-wa");
  selPais.innerHTML = Object.entries(PAISES).map(([k, p]) => `<option value="${k}">${p.emoji} ${p.nome} (+${p.ddi})</option>`).join("");
  const pais = () => PAISES[selPais.value];
  function mostrarPais() {
    const p = pais();
    document.getElementById("s-flag").innerHTML = p.flag;
    document.getElementById("s-ddi-code").textContent = "+" + p.ddi;
    inWa.placeholder = p.ph;
  }
  function formatarWa() {
    let bruto = inWa.value;
    // Quem cola o número com o código do país (+55..., +1...) troca o país sozinho
    if (/^\s*(\+|00)/.test(bruto)) {
      const d = bruto.replace(/\D/g, "").replace(/^00/, "");
      const achado = Object.keys(PAISES).sort((a, b) => PAISES[b].ddi.length - PAISES[a].ddi.length).find(k => d.startsWith(PAISES[k].ddi));
      if (achado) { selPais.value = achado; mostrarPais(); bruto = d.slice(PAISES[achado].ddi.length); }
    }
    const p = pais();
    let d = bruto.replace(/\D/g, "");
    if (d.length > p.max && d.startsWith(p.ddi)) d = d.slice(p.ddi.length);   // ex.: 1 (325) 956-5160
    d = d.slice(0, p.max);
    // mantém o cursor no lugar certo ao editar no meio do número
    const pos = inWa.selectionStart == null ? inWa.value.length : inWa.selectionStart;
    const antes = inWa.value.slice(0, pos).replace(/\D/g, "").length;
    inWa.value = p.fmt(d);
    if (document.activeElement === inWa) {
      let c = 0, i = 0; while (i < inWa.value.length && c < antes) { if (/\d/.test(inWa.value[i])) c++; i++; }
      try { inWa.setSelectionRange(i, i); } catch (e) {}
    }
  }
  selPais.addEventListener("change", () => { mostrarPais(); formatarWa(); inWa.focus(); });
  inWa.addEventListener("input", formatarWa);
  [form.nome, form.email, inWa].forEach(i => i.addEventListener("input", () => { if (i.hasAttribute("aria-invalid")) { i.removeAttribute("aria-invalid"); status.textContent = ""; } }));
  mostrarPais();

  function abrir() {
    if (store.get("aurea_sorteio_ok")) mostrarOk(true);
    modal.hidden = false; document.body.classList.add("modal-open");
    requestAnimationFrame(() => modal.classList.add("open"));
    setTimeout(() => { const i = modal.querySelector("#s-nome"); if (i && !form.hidden) i.focus(); }, 60);
  }
  function fechar() {
    modal.classList.remove("open"); document.body.classList.remove("modal-open");
    setTimeout(() => { modal.hidden = true; }, 200);
    store.set("aurea_sorteio_fechado", String(Date.now()));
  }
  function mostrarOk(jaInscrito) {
    form.hidden = true;
    document.getElementById("sorteio-ok").hidden = false;
    if (jaInscrito) document.getElementById("sorteio-ok-title").textContent = "Você já está inscrito!";
  }

  document.addEventListener("click", e => {
    if (e.target.closest("[data-open-sorteio]")) { e.preventDefault(); abrir(); }
    else if (e.target.closest("[data-close-sorteio]")) fechar();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) fechar(); });

  // Botão fixo para reabrir (só na versão em português)
  const atualizarPill = () => { pill.hidden = !ptAtivo() || !!store.get("aurea_sorteio_ok"); };
  atualizarPill();
  document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", () => setTimeout(atualizarPill, 0)));

  // Link direto (aureafi.com/?sorteio): abre na hora, em qualquer página e em qualquer idioma
  if (viaLink) { setTimeout(abrir, 400); }

  // Abre sozinho na home: uma vez por dia, só em português e só para quem ainda não se inscreveu
  const fechadoEm = +store.get("aurea_sorteio_fechado") || 0;
  if (!viaLink && ABRIR_SOZINHO && !store.get("aurea_sorteio_ok") && Date.now() - fechadoEm > 24 * 3600 * 1000) {
    let feito = false;
    const tentar = () => { if (feito || !ptAtivo() || document.body.classList.contains("modal-open")) return; feito = true; abrir(); window.removeEventListener("scroll", rolar); };
    const rolar = () => { const h = document.documentElement; if ((h.scrollTop + innerHeight) / h.scrollHeight > 0.35) tentar(); };
    setTimeout(tentar, ESPERA_MS);
    window.addEventListener("scroll", rolar, { passive: true });
  }

  // ===== Envio =====
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const p = pais(), digitos = inWa.value.replace(/\D/g, "");
    const nome = form.nome.value.trim(), email = form.email.value.trim().toLowerCase(), whatsapp = "+" + p.ddi + digitos;
    if (form.empresa_site.value) return; // robô
    // Aponta o primeiro campo com problema, em vez de uma mensagem genérica
    const erro = nome.length < 2 ? [form.nome, "Preencha seu nome completo."]
      : !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email) ? [form.email, "Confira o e-mail: ele precisa estar no formato nome@exemplo.com."]
      : (digitos.length < p.min || digitos.length > p.max || (p.ddi === "1" && /^[01]/.test(digitos))) ? [inWa, p.erro]
      : null;
    [form.nome, form.email, inWa].forEach(i => i.removeAttribute("aria-invalid"));
    if (erro) { erro[0].setAttribute("aria-invalid", "true"); erro[0].focus(); status.textContent = erro[1]; return; }
    if (!document.getElementById("s-aceite").checked) { status.textContent = "Para participar, aceite o regulamento do sorteio."; return; }
    const btn = form.querySelector('button[type="submit"]'); btn.disabled = true; status.textContent = "Enviando...";
    try {
      const res = await fetch(`${SB_URL}/rest/v1/${TABELA}`, {
        method: "POST",
        headers: { apikey: SB_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ nome, email, whatsapp, aceite: true, origem: "site" })
      });
      if (res.status === 409) { store.set("aurea_sorteio_ok", "1"); mostrarOk(true); atualizarPill(); return; }
      if (!res.ok) throw new Error("HTTP " + res.status);
      store.set("aurea_sorteio_ok", "1");
      mostrarOk(false); atualizarPill();
      // Aviso por e-mail para a Aurea (não bloqueia a inscrição se falhar)
      if (AVISO_EMAIL_KEY) fetch("https://api.web3forms.com/submit", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ access_key: AVISO_EMAIL_KEY, subject: "Nova inscrição no sorteio (site)", from_name: "Aurea website", name: nome, email, whatsapp })
      }).catch(() => {});
      // Medição (se os códigos estiverem ativos no main.js)
      if (window.fbq) fbq("track", "Lead", { content_name: "Sorteio novembro 2026" });
      if (window.gtag) gtag("event", "generate_lead", { event_category: "sorteio" });
    } catch (err) {
      status.textContent = "Não foi possível enviar agora. Tente de novo em instantes ou mande \"SORTEIO\" no nosso WhatsApp.";
    } finally { btn.disabled = false; }
  });
})();
