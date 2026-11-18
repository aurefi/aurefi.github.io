/* Aurea Financial — página da live (live.html): popup de inscrição, agenda e horários */
(function () {
  // ===== Configuração =====
  const LIVE_INICIO = new Date("2026-11-25T18:00:00-06:00");   // 25/11, 6pm CT
  const LIVE_FIM = new Date("2026-11-25T18:45:00-06:00");      // fim previsto (35 a 45 min)
  const FIM_SORTEIO = new Date("2026-11-25T18:30:00-06:00");   // depois disso, o formulário não oferece mais o sorteio
  const LINK_TRANSMISSAO = "";   // link do YouTube (ex.: https://youtube.com/live/xxxx). Vazio: a página diz que o link chega por e-mail
  const CONVIDADO = "";          // nome do convidado especial. Vazio: a linha não aparece
  const REGULAMENTO = "sorteio.html";

  const SB_URL = "https://eslputtmlufvxhdanczy.supabase.co";
  const SB_KEY = "sb_publishable_-7TaudR-eu2t1e8L6qfgmw_i4cg6Ksa";   // chave publishable (pública)
  const TABELA = "live_inscricoes";
  const AVISO_EMAIL_KEY = (typeof WEB3FORMS_KEY !== "undefined") ? WEB3FORMS_KEY : ""; // definida no main.js

  const agora = new Date();
  const fase = agora < LIVE_INICIO ? "antes" : agora < LIVE_FIM ? "aovivo" : "depois";
  const sorteioAberto = agora < FIM_SORTEIO;
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const $ = id => document.getElementById(id);
  const jaNoSorteio = !!store.get("aurea_sorteio_ok");   // inscrito pelo popup do sorteio neste navegador

  // ===== Textos que dependem da configuração e do horário =====
  if (CONVIDADO) { $("lv-guest-name").textContent = CONVIDADO; $("lv-guest").hidden = false; }
  if (LINK_TRANSMISSAO) {
    const where = $("lv-where");
    where.textContent = "Ao vivo no YouTube: ";
    const a = document.createElement("a");
    a.href = LINK_TRANSMISSAO; a.target = "_blank"; a.rel = "noopener"; a.textContent = "abrir a transmissão";
    where.append(a);
    $("lv-watch").href = LINK_TRANSMISSAO;
    $("lv-watch").hidden = fase === "antes";
  }
  const aviso = $("lv-notice");
  if (fase === "aovivo") {
    $("lv-tag").textContent = "Ao vivo agora"; $("lv-tag").classList.add("ao-vivo");
    aviso.textContent = LINK_TRANSMISSAO ? "A live está acontecendo agora no YouTube." : "A live está acontecendo agora. Inscreva-se para receber o link.";
    aviso.hidden = false;
  } else if (fase === "depois") {
    $("lv-tag").textContent = "A live já aconteceu";
    aviso.textContent = "A live já aconteceu. Inscreva-se para receber a gravação por e-mail.";
    aviso.hidden = false;
    document.querySelectorAll("[data-open-live]").forEach(b => b.textContent = "Quero receber a gravação");
  }

  // Contagem regressiva simples no hero
  function contar() {
    const el = $("lv-count"), ms = LIVE_INICIO - new Date();
    if (ms <= 0) { el.textContent = ""; return; }
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    el.innerHTML = d > 0 ? `Faltam <b>${d} ${d === 1 ? "dia" : "dias"}</b> e <b>${h}h</b>` : `Começa em <b>${h}h ${String(m).padStart(2, "0")}min</b>`;
  }
  if (fase === "antes") { contar(); setInterval(contar, 30000); }

  // ===== Agenda (Google e arquivo .ics para Apple e Outlook) =====
  const utc = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const TITULO = "Live Aurea: Tempestade ou céu azul?";
  const DETALHES = "Os 3 relatórios financeiros que deixam seu caminho claro. Live gratuita no YouTube, com sorteio ao vivo de 2 meses grátis de bookkeeping." +
    (LINK_TRANSMISSAO ? "\n\nTransmissão: " + LINK_TRANSMISSAO : "\n\nO link chega por e-mail.") + "\n\nhttps://aureafi.com/live";
  const LOCAL = LINK_TRANSMISSAO || "YouTube (link por e-mail)";
  $("lv-gcal").href = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=" + encodeURIComponent(TITULO) + "&dates=" + utc(LIVE_INICIO) + "/" + utc(LIVE_FIM) +
    "&details=" + encodeURIComponent(DETALHES) + "&location=" + encodeURIComponent(LOCAL);
  function baixarIcs() {
    const esc = s => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Aurea Financial//Live//PT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT", "UID:live-2026-11-25@aureafi.com", "DTSTAMP:" + utc(new Date()),
      "DTSTART:" + utc(LIVE_INICIO), "DTEND:" + utc(LIVE_FIM),
      "SUMMARY:" + esc(TITULO), "DESCRIPTION:" + esc(DETALHES), "LOCATION:" + esc(LOCAL), "URL:https://aureafi.com/live",
      "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", "DESCRIPTION:" + esc(TITULO), "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    a.download = "live-aurea-25-11.ics";
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    if (window.gtag) gtag("event", "live_add_calendar", { calendar: "ics" });
  }
  document.addEventListener("click", e => {
    if (e.target.closest("[data-live-ics]")) { e.preventDefault(); baixarIcs(); }
    if (e.target.closest("#lv-gcal, #lv-gcal-ok") && window.gtag) gtag("event", "live_add_calendar", { calendar: "google" });
  });

  // Pergunta antes da live, pelo WhatsApp
  const waPergunta = "https://wa.me/13259565160?text=" + encodeURIComponent("Olá! Tenho uma pergunta para a live de 25/11: ");
  document.querySelectorAll("[data-wa-pergunta]").forEach(a => { a.href = waPergunta; a.target = "_blank"; a.rel = "noopener"; });

  // ===== Popup de inscrição =====
  const blocoSorteio = !sorteioAberto ? "" : jaNoSorteio
    ? `<p class="lv-already">Você já está concorrendo pelo sorteio de novembro neste navegador. Não precisa marcar de novo.</p>`
    : `<label class="s-check"><input type="checkbox" id="lv-sorteio"> <span>Quero concorrer aos 2 meses grátis de bookkeeping. Li e aceito o <a href="${REGULAMENTO}" target="_blank" rel="noopener">regulamento do sorteio</a>.</span></label>`;
  const titulo = fase === "depois" ? "Receba a gravação" : "Inscreva-se na live";
  const intro = fase === "depois"
    ? "Deixe seus dados e mandamos o link da gravação por e-mail."
    : "Preencha seus dados para receber o link da live" + (sorteioAberto ? " e concorrer aos 2 meses grátis de bookkeeping." : ".");

  document.body.insertAdjacentHTML("beforeend", `
  <div class="modal sorteio-modal" id="live-modal" role="dialog" aria-modal="true" aria-labelledby="live-title" hidden>
    <div class="modal-backdrop" data-close-live></div>
    <div class="modal-box sorteio-box">
      <button class="modal-close sorteio-x" type="button" data-close-live aria-label="Fechar">&times;</button>
      <div class="sorteio-top">
        <span class="sorteio-tag">Live gratuita</span>
        <h3 id="live-title">${titulo}</h3>
        <p>${intro}</p>
        <div class="sorteio-dates">
          <span><b>Quarta, 25/11 · 6pm CT</b></span>
          <span>7pm ET · 5pm MT · 4pm PT · ao vivo no YouTube</span>
        </div>
      </div>

      <form class="sorteio-form lv-form" id="live-form" novalidate>
        <label for="lv-nome">Nome completo *</label>
        <input id="lv-nome" name="nome" autocomplete="name" required>
        <label for="lv-email">E-mail *</label>
        <input id="lv-email" name="email" type="email" autocomplete="email" required>
        <label for="lv-wa">WhatsApp *</label>
        <div class="s-phone">
          <div class="s-ddi">
            <span class="s-ddi-face" aria-hidden="true"><span class="s-flag" id="lv-flag"></span><span id="lv-ddi-code">+1</span><svg class="s-chev" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4"/></svg></span>
            <select id="lv-pais" aria-label="País do WhatsApp"></select>
          </div>
          <input id="lv-wa" name="whatsapp" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(000) 000-0000" required>
        </div>
        <label for="lv-empresa">Nome da empresa <span class="opt">(se tiver)</span></label>
        <input id="lv-empresa" name="empresa" autocomplete="organization" maxlength="120">
        <label for="lv-pergunta">Quer deixar uma pergunta para a live? <span class="opt">(opcional)</span></label>
        <textarea id="lv-pergunta" name="pergunta" maxlength="1000"></textarea>
        <input type="text" name="empresa_site" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        ${blocoSorteio}
        <label class="s-check"><input type="checkbox" id="lv-mkt"> <span>Quero receber dicas e ofertas da Aurea Financial por e-mail e WhatsApp. Posso cancelar quando quiser.</span></label>
        <button class="btn btn-gold" type="submit">${fase === "depois" ? "Quero a gravação" : "Confirmar inscrição"}</button>
        <p class="form-status" id="lv-status" role="status"></p>
        <p class="form-note">O link da live e o da gravação chegam no e-mail informado. Veja os nossos <a href="terms.html" target="_blank" rel="noopener">Termos e Política de Privacidade</a>.</p>
      </form>

      <div class="sorteio-ok lv-ok" id="live-ok" hidden>
        <div class="check-ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <h3 id="live-ok-title">Inscrição confirmada!</h3>
        <p id="live-ok-text"></p>
        <div class="lv-ok-actions">
          <a class="btn btn-dark" id="lv-gcal-ok" href="${$("lv-gcal").href}" target="_blank" rel="noopener">Adicionar ao Google Agenda</a>
          <button type="button" class="btn btn-line" data-live-ics>Adicionar ao Apple ou Outlook</button>
        </div>
      </div>
    </div>
  </div>
  <button type="button" class="lv-pill" id="lv-pill" data-open-live>${fase === "depois" ? "Quero a gravação" : "Quero me inscrever"}</button>`);

  const modal = $("live-modal"), form = $("live-form"), status = $("lv-status"), pill = $("lv-pill");

  // ===== WhatsApp: país (código + bandeira) e formato do número (mesma regra do popup do sorteio) =====
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
  const selPais = $("lv-pais"), inWa = $("lv-wa");
  selPais.innerHTML = Object.entries(PAISES).map(([k, p]) => `<option value="${k}">${p.emoji} ${p.nome} (+${p.ddi})</option>`).join("");
  const pais = () => PAISES[selPais.value];
  function mostrarPais() {
    const p = pais();
    $("lv-flag").innerHTML = p.flag;
    $("lv-ddi-code").textContent = "+" + p.ddi;
    inWa.placeholder = p.ph;
  }
  function formatarWa() {
    let bruto = inWa.value;
    if (/^\s*(\+|00)/.test(bruto)) {   // colou com o código do país: troca o país sozinho
      const d = bruto.replace(/\D/g, "").replace(/^00/, "");
      const achado = Object.keys(PAISES).sort((a, b) => PAISES[b].ddi.length - PAISES[a].ddi.length).find(k => d.startsWith(PAISES[k].ddi));
      if (achado) { selPais.value = achado; mostrarPais(); bruto = d.slice(PAISES[achado].ddi.length); }
    }
    const p = pais();
    let d = bruto.replace(/\D/g, "");
    if (d.length > p.max && d.startsWith(p.ddi)) d = d.slice(p.ddi.length);
    d = d.slice(0, p.max);
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

  // ===== Abrir e fechar =====
  let ultimoFoco = null;
  function abrir() {
    ultimoFoco = document.activeElement;
    if (store.get("aurea_live_ok")) mostrarOk(true);
    modal.hidden = false; document.body.classList.add("modal-open");
    requestAnimationFrame(() => modal.classList.add("open"));
    setTimeout(() => { const i = $("lv-nome"); if (i && !form.hidden) i.focus(); }, 60);
    if (window.gtag) gtag("event", "live_form_open", { fase });
  }
  function fechar() {
    modal.classList.remove("open"); document.body.classList.remove("modal-open");
    setTimeout(() => { modal.hidden = true; if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus(); }, 200);
  }
  function mostrarOk(jaInscrito) {
    form.hidden = true;
    $("live-ok").hidden = false;
    $("live-ok-title").textContent = jaInscrito ? "Você já está inscrito!" : "Inscrição confirmada!";
    $("live-ok-text").textContent = fase === "depois"
      ? "O link da gravação chega no seu e-mail."
      : "O link da live chega no seu e-mail antes de quarta, 25/11, às 6pm CT. Coloque na agenda para não esquecer.";
    if (fase === "depois") document.querySelector(".lv-ok-actions").hidden = true;
  }
  document.addEventListener("click", e => {
    if (e.target.closest("[data-open-live]")) { e.preventDefault(); abrir(); }
    else if (e.target.closest("[data-close-live]")) fechar();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) fechar(); });

  // Link direto: aureafi.com/live?inscricao ou aureafi.com/live#inscricao abre o formulário
  let qs = location.search.slice(1); try { qs = decodeURIComponent(qs); } catch (e) {}
  if (/(^|[?&])inscri(cao|ção)(=|&|$)/.test(qs) || location.hash === "#inscricao") setTimeout(abrir, 400);

  // Botão fixo de inscrição, depois que o hero sai da tela
  const hero = document.querySelector(".lv-hero");
  if ("IntersectionObserver" in window && hero) {
    new IntersectionObserver(([en]) => {
      const mostrar = !en.isIntersecting && !store.get("aurea_live_ok");
      pill.classList.toggle("show", mostrar);
      document.body.classList.toggle("lv-pill-on", mostrar);
    }).observe(hero);
  }

  // ===== Envio =====
  const utm = (() => { const q = new URLSearchParams(location.search); return { utm_source: q.get("utm_source"), utm_medium: q.get("utm_medium"), utm_campaign: q.get("utm_campaign") }; })();
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (form.empresa_site.value) return; // robô
    const p = pais(), digitos = inWa.value.replace(/\D/g, "");
    const nome = form.nome.value.trim(), email = form.email.value.trim().toLowerCase(), whatsapp = "+" + p.ddi + digitos;
    const empresa = form.empresa.value.trim(), pergunta = form.pergunta.value.trim();
    const cbSorteio = $("lv-sorteio"), sorteio = !!(cbSorteio && cbSorteio.checked), marketing = $("lv-mkt").checked;
    const erro = nome.length < 2 ? [form.nome, "Preencha seu nome completo."]
      : !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email) ? [form.email, "Confira o e-mail: ele precisa estar no formato nome@exemplo.com."]
      : (digitos.length < p.min || digitos.length > p.max || (p.ddi === "1" && /^[01]/.test(digitos))) ? [inWa, p.erro]
      : null;
    [form.nome, form.email, inWa].forEach(i => i.removeAttribute("aria-invalid"));
    if (erro) { erro[0].setAttribute("aria-invalid", "true"); erro[0].focus(); status.textContent = erro[1]; return; }

    const btn = form.querySelector('button[type="submit"]'); btn.disabled = true; status.textContent = "Enviando...";
    const dados = { nome, email, whatsapp, empresa: empresa || null, pergunta: pergunta || null, sorteio, marketing, origem: "site", fase,
                    utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign };
    let salvo = false;
    try {
      const res = await fetch(`${SB_URL}/rest/v1/${TABELA}`, {
        method: "POST",
        headers: { apikey: SB_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(dados)
      });
      if (res.status === 409) {
        store.set("aurea_live_ok", "1"); mostrarOk(true); pill.classList.remove("show"); btn.disabled = false; return;
      }
      salvo = res.ok;
    } catch (err) { salvo = false; }

    // Aviso por e-mail para a Aurea. Se o Supabase falhar, é ele que guarda a inscrição.
    let avisado = false;
    if (AVISO_EMAIL_KEY) {
      try {
        const r = await fetch("https://api.web3forms.com/submit", {
          method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ access_key: AVISO_EMAIL_KEY, subject: "Nova inscrição na live 25/11 (site)" + (salvo ? "" : " · NÃO SALVA NO SUPABASE"),
                                 from_name: "Aurea website", name: nome, email, whatsapp, empresa: empresa || "-", pergunta: pergunta || "-",
                                 sorteio: sorteio ? "sim" : "não", marketing: marketing ? "sim" : "não",
                                 origem: [utm.utm_source, utm.utm_medium, utm.utm_campaign].filter(Boolean).join(" / ") || "direto" })
        });
        avisado = r.ok;
      } catch (err) { avisado = false; }
    }

    btn.disabled = false;
    if (!salvo && !avisado) {
      status.textContent = "Não foi possível enviar agora. Tente de novo em instantes ou mande \"LIVE\" no nosso WhatsApp.";
      return;
    }
    store.set("aurea_live_ok", "1");
    if (sorteio) store.set("aurea_sorteio_ok", "1");
    mostrarOk(false); pill.classList.remove("show"); document.body.classList.remove("lv-pill-on");
    if (window.fbq) fbq("track", "Lead", { content_name: "Live 25/11/2026" });
    if (window.gtag) gtag("event", "live_signup", { sorteio: sorteio ? "sim" : "nao", fase });
  });
})();
