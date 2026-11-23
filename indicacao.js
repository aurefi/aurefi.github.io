/* Aurea Financial - página de indicação (indicacao.html?ref=<parceiro>)
   Grava pela função registrar_indicacao do Supabase. O navegador não lê nenhuma tabela. */
(function () {
  const SB_URL = "https://eslputtmlufvxhdanczy.supabase.co";
  const SB_KEY = "sb_publishable_-7TaudR-eu2t1e8L6qfgmw_i4cg6Ksa";   // chave publishable (é pública)
  const AVISO_KEY = (typeof WEB3FORMS_KEY !== "undefined") ? WEB3FORMS_KEY : "";   // definida no main.js
  const PAINEL = "https://aureafi.com/indicacoes-admin.html";

  const $ = id => document.getElementById(id);
  const lang = () => (typeof currentLang !== "undefined" && currentLang === "en") ? "en" : "pt";
  const T = k => ((window.PAGE_DICT || {})[lang()] || {})[k] || window.PAGE_DICT.pt[k] || k;
  const ref = (new URLSearchParams(location.search).get("ref") || "").trim().toLowerCase();

  async function rpc(nome, args) {
    const res = await fetch(`${SB_URL}/rest/v1/rpc/${nome}`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(args)
    });
    let body = null; try { body = await res.json(); } catch (e) {}
    if (!res.ok) { const err = new Error((body && body.message) || ("HTTP " + res.status)); err.status = res.status; throw err; }
    return body;
  }

  function mostrar(id) {
    $("ref-slot").classList.remove("ref-loading");
    ["ref-form", "ref-ok", "ref-bad"].forEach(x => $(x).hidden = x !== id);
  }

  // ===== Parceiro do link =====
  let parceiro = null;
  async function carregarParceiro() {
    if (!/^[a-z0-9-]{2,40}$/.test(ref)) return mostrar("ref-bad");
    try {
      const r = await rpc("parceiro_publico", { p_ref: ref });
      parceiro = Array.isArray(r) && r[0] ? r[0] : null;
    } catch (e) {
      // sem conexão com o banco: mostra o formulário mesmo assim; o envio confere o link de novo
      mostrar("ref-form"); return;
    }
    if (!parceiro) return mostrar("ref-bad");
    $("ref-name").textContent = parceiro.nome;
    $("ref-co").textContent = parceiro.empresa || "";
    $("ref-by").hidden = false;
    mostrar("ref-form");
  }

  // ===== WhatsApp: país (código + bandeira) e formato do número =====
  const mascara = (d, m) => { let s = "", i = 0; for (const c of m) { if (i >= d.length) break; s += c === "X" ? d[i++] : c; } return s; };
  const PAISES = {
    us: { ddi: "1", min: 10, max: 10, ph: "(000) 000-0000", fmt: d => mascara(d, "(XXX) XXX-XXXX"),
          flag: '<svg viewBox="0 0 19 10"><rect width="19" height="10" fill="#B22234"/><path d="M0 1.15h19M0 2.69h19M0 4.23h19M0 5.77h19M0 7.31h19M0 8.85h19" stroke="#fff" stroke-width=".77"/><rect width="7.6" height="5.38" fill="#3C3B6E"/></svg>' },
    br: { ddi: "55", min: 10, max: 11, ph: "(00) 00000-0000", fmt: d => mascara(d, d.length > 10 ? "(XX) XXXXX-XXXX" : "(XX) XXXX-XXXX"),
          flag: '<svg viewBox="0 0 20 14"><rect width="20" height="14" fill="#009C3B"/><path d="M10 1.4L18.4 7 10 12.6 1.6 7z" fill="#FFDF00"/><circle cx="10" cy="7" r="3.4" fill="#002776"/><path d="M6.7 6.3c2.2-.5 4.6-.1 6.6 1.1" stroke="#fff" stroke-width=".6" fill="none"/></svg>' },
    pt: { ddi: "351", min: 9, max: 9, ph: "000 000 000", fmt: d => mascara(d, "XXX XXX XXX"),
          flag: '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#DA291C"/><rect width="12" height="20" fill="#046A38"/><circle cx="12" cy="10" r="4.2" fill="#FFE900"/><circle cx="12" cy="10" r="2.4" fill="#DA291C"/></svg>' }
  };
  const form = $("ref-form"), status = $("r-status"), selPais = $("r-pais"), inWa = $("r-wa");
  const pais = () => PAISES[selPais.value];
  function opcoesPais() {
    const v = selPais.value || "us";
    selPais.innerHTML = Object.entries(PAISES).map(([k, p]) => `<option value="${k}">${T("p_" + k)} (+${p.ddi})</option>`).join("");
    selPais.value = v;
  }
  function mostrarPais() {
    const p = pais();
    $("r-flag").innerHTML = p.flag; $("r-ddi-code").textContent = "+" + p.ddi; inWa.placeholder = p.ph;
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
  opcoesPais(); mostrarPais();
  selPais.addEventListener("change", () => { mostrarPais(); formatarWa(); inWa.focus(); });
  inWa.addEventListener("input", formatarWa);
  document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", opcoesPais));
  [form.nome, form.email, inWa, $("r-ok")].forEach(i => i.addEventListener("input", () => {
    if (i.hasAttribute("aria-invalid")) { i.removeAttribute("aria-invalid"); status.textContent = ""; status.classList.remove("err"); }
  }));

  function erro(campo, chave) {
    status.textContent = T(chave); status.classList.add("err");
    if (campo) { campo.setAttribute("aria-invalid", "true"); campo.focus(); }
  }

  // ===== Envio =====
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (form.site_empresa.value) return;   // robô (campo escondido)
    status.classList.remove("err");
    const p = pais(), digitos = inWa.value.replace(/\D/g, "");
    const nome = form.nome.value.trim(), email = form.email.value.trim().toLowerCase();
    const sel = Object.keys(PAISES).find(k => PAISES[k] === p);
    if (nome.length < 2) return erro(form.nome, "e_nome");
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return erro(form.email, "e_email");
    if (digitos.length < p.min || digitos.length > p.max || (p.ddi === "1" && /^[01]/.test(digitos))) return erro(inWa, "e_" + sel);
    if (!$("r-ok").checked) return erro($("r-ok"), "e_ok");

    const btn = form.querySelector('button[type="submit"]'); btn.disabled = true;
    status.textContent = T("sending");
    try {
      await rpc("registrar_indicacao", {
        p_ref: ref, p_nome: nome, p_email: email, p_whatsapp: "+" + p.ddi + digitos,
        p_empresa: form.empresa.value.trim() || null, p_mensagem: form.mensagem.value.trim() || null,
        p_consentimento: true, p_origem_url: location.href.slice(0, 300)
      });
      status.textContent = "";
      mostrar("ref-ok");
      $("ref-ok").scrollIntoView({ behavior: "smooth", block: "center" });
      // Aviso por e-mail para a Aurea, sem os contatos do indicado (eles ficam só no painel). Não bloqueia se falhar.
      if (AVISO_KEY) fetch("https://api.web3forms.com/submit", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: AVISO_KEY, subject: "Nova indicação de " + (parceiro ? parceiro.nome : ref) + " (site)", from_name: "Aurea website",
          message: `Nova indicação recebida pelo link de ${parceiro ? parceiro.nome : ref}.\nIndicado: ${nome}\nVeja os contatos e o status no painel: ${PAINEL}`
        })
      }).catch(() => {});
      if (window.gtag) gtag("event", "referral_signup", { parceiro: ref });
    } catch (err) {
      const m = String(err.message || "");
      if (m === "ref_invalido") mostrar("ref-bad");
      else if (m === "email") erro(form.email, "e_email");
      else if (m === "whatsapp") erro(inWa, "e_" + sel);
      else if (m === "nome") erro(form.nome, "e_nome");
      else if (m === "consentimento") erro($("r-ok"), "e_ok");
      else erro(null, "e_send");
    } finally { btn.disabled = false; }
  });

  carregarParceiro();
})();
