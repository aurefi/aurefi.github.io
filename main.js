/* Aurea Financial — código compartilhado por todas as páginas */

// ===== Configurações =====
const WA_NUMBER = "13259565160";
const WEB3FORMS_KEY = "ea8ccef1-9c21-4c7d-9a87-8e5c876378e6";  // formulário da versão em inglês
const IG_HANDLE = "aureafinancial";
const BEHOLD_FEED_ID = "";  // cole aqui o Feed ID do Behold para mostrar os posts do Instagram
const GOOGLE_TAG_ID = "";            // Google Ads (ex.: AW-123456789)
const GOOGLE_CONVERSION_LABEL = "";  // rótulo da conversão do Google Ads (ex.: AbC-D_efG-h12_34-567)
const GA_ID = "";                    // Google Analytics 4 (ex.: G-XXXXXXXXXX)
const META_PIXEL_ID = "";            // Meta Pixel (ex.: 1234567890123456)
const CALENDLY_URL = "";             // link da sua agenda (ex.: https://calendly.com/aureafi/30min)

// ===== Medição: Google (Ads + Analytics) e Meta Pixel =====
const isThanks = document.body.dataset.page === "thanks";
if (GOOGLE_TAG_ID || GA_ID) {
  const g = document.createElement("script");
  g.async = true; g.src = "https://www.googletagmanager.com/gtag/js?id=" + (GOOGLE_TAG_ID || GA_ID);
  document.head.append(g);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ dataLayer.push(arguments); };
  gtag("js", new Date());
  if (GOOGLE_TAG_ID) gtag("config", GOOGLE_TAG_ID);
  if (GA_ID) gtag("config", GA_ID);
  if (isThanks) {
    if (GOOGLE_TAG_ID && GOOGLE_CONVERSION_LABEL) gtag("event", "conversion", { send_to: GOOGLE_TAG_ID + "/" + GOOGLE_CONVERSION_LABEL });
    if (GA_ID) gtag("event", "generate_lead");
  }
}
if (META_PIXEL_ID) {
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", META_PIXEL_ID); fbq("track", "PageView");
  if (isThanks) fbq("track", "Lead");
}

// ===== Textos comuns (cabeçalho, rodapé, formulário) =====
const COMMON = {
  pt: {
    nav_about:"Sobre a Aurea", nav_services:"Serviços", nav_team:"Time", nav_contact:"Fale conosco",
    foot_team:"Time", foot_terms:"Termos e privacidade", foot_insta:"Instagram",
    copy:"© 2026 Aurea Financial LLC. Todos os direitos reservados.",
    wa_text:"Olá! Vim pelo site da Aurea e gostaria de saber mais sobre o bookkeeping.",
    form_title:"Agende uma ligação gratuita", form_sub:"Conte um pouco sobre a sua empresa. Respondemos em até 1 dia útil.",
    f_first:"Nome *", f_last:"Sobrenome", f_email:"E-mail *", f_phone:"Telefone *", f_msg:"Escreva sua mensagem *", f_send:"Enviar pelo WhatsApp",
    f_note:"Ao enviar, você concorda com os nossos", f_note_link:"Termos e Política de Privacidade", close:"Fechar", f_cal:"Prefiro escolher o horário na agenda", f_or:"ou envie uma mensagem"
  },
  en: {
    nav_about:"About Aurea", nav_services:"Services", nav_team:"Team", nav_contact:"Get In Touch",
    foot_team:"Team", foot_terms:"Terms & Privacy", foot_insta:"Instagram",
    copy:"© 2026 Aurea Financial LLC. All rights reserved.",
    wa_text:"Hi! I found Aurea through the website and would like to learn more about bookkeeping.",
    form_title:"Schedule a free call", form_sub:"Tell us a little about your business. We reply within 1 business day.",
    f_first:"First name *", f_last:"Last name", f_email:"Email *", f_phone:"Phone *", f_msg:"Write a message *", f_send:"Submit",
    f_note:"By submitting, you agree to our", f_note_link:"Terms and Privacy Policy", close:"Close", f_cal:"Pick a time on our calendar", f_or:"or send us a message"
  }
};

const WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z"/></svg>';
const FLAG_BR = '<svg class="flag" viewBox="0 0 24 16" aria-hidden="true"><rect width="24" height="16" fill="#009C3B"/><polygon points="12,1.6 22.4,8 12,14.4 1.6,8" fill="#FFDF00"/><circle cx="12" cy="8" r="3.6" fill="#002776"/></svg>';
const FLAG_US = '<svg class="flag" viewBox="0 0 24 16" aria-hidden="true"><rect width="24" height="16" fill="#fff"/><g fill="#B22234"><rect y="0" width="24" height="1.23"/><rect y="2.46" width="24" height="1.23"/><rect y="4.92" width="24" height="1.23"/><rect y="7.38" width="24" height="1.23"/><rect y="9.85" width="24" height="1.23"/><rect y="12.31" width="24" height="1.23"/><rect y="14.77" width="24" height="1.23"/></g><rect width="10" height="8.62" fill="#3C3B6E"/></svg>';
const LOGO_FALLBACK = "this.outerHTML='<span class=&quot;wordmark&quot;>AUREA<small>FINANCIAL SERVICES</small></span>'";

// ===== Cabeçalho e rodapé (iguais em todas as páginas) =====
const page = document.body.dataset.page || "home";
document.getElementById("site-header").outerHTML = `
<header>
  <div class="wrap nav">
    <a class="brand" href="./" aria-label="Aurea Financial"><img src="logo.png" alt="Aurea Financial Services" onerror="${LOGO_FALLBACK}"></a>
    <ul class="menu" id="menu">
      <li><a href="./#sobre" data-i18n="nav_about">Sobre a Aurea</a></li>
      <li><a href="services.html" data-i18n="nav_services" class="${page === "services" ? "current" : ""}">Serviços</a></li>
      <li><a href="team.html" data-i18n="nav_team" class="${page === "team" ? "current" : ""}">Time</a></li>
      <li><a href="contact.html" data-i18n="nav_contact" class="${page === "contact" ? "current" : ""}">Fale conosco</a></li>
    </ul>
    <div class="right">
      <div class="lang" role="group" aria-label="Idioma / Language">
        <button type="button" data-lang="pt" aria-label="Português">${FLAG_BR}PT</button>
        <button type="button" data-lang="en" aria-label="English">${FLAG_US}EN</button>
      </div>
      <button class="burger" id="burger" aria-label="Menu"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>`;

document.getElementById("site-footer").outerHTML = `
<footer>
  <div class="wrap">
    <div class="foot">
      <div class="contacts">
        <a href="mailto:info@aureafi.com">info@aureafi.com</a>
        <a href="tel:+13259565160">(325) 956-5160</a>
      </div>
      <div class="center"><img src="logo.png" alt="Aurea Financial Services" onerror="${LOGO_FALLBACK}"></div>
      <div class="links">
        <a href="services.html" data-i18n="nav_services">Serviços</a>
        <a href="team.html" data-i18n="foot_team">Time</a>
        <a href="https://www.instagram.com/${IG_HANDLE}/" target="_blank" rel="noopener">@${IG_HANDLE}</a>
        <a href="terms.html" data-i18n="foot_terms">Termos e privacidade</a>
      </div>
    </div>
    <p class="copy" data-i18n="copy">© 2026 Aurea Financial LLC. Todos os direitos reservados.</p>
  </div>
</footer>
<a class="wa wa-link" href="https://wa.me/${WA_NUMBER}" target="_blank" rel="noopener" aria-label="WhatsApp">${WA_ICON}</a>`;

// ===== Formulário (o mesmo no popup, na página de contato e na home) =====
let formCount = 0;
function formHTML(){
  const n = ++formCount, id = k => k + "-" + n;
  return `<form class="contact-form" novalidate>
    <h3 data-i18n="form_title">Agende uma ligação gratuita</h3>
    <p class="form-sub" data-i18n="form_sub">Conte um pouco sobre a sua empresa. Respondemos em até 1 dia útil.</p>
    ${CALENDLY_URL ? `<a class="btn btn-line cal-btn" href="${CALENDLY_URL}" target="_blank" rel="noopener" data-i18n="f_cal">Prefiro escolher o horário na agenda</a><p class="or" data-i18n="f_or">ou envie uma mensagem</p>` : ""}
    <div class="row">
      <div><label for="${id("fn")}" data-i18n="f_first">Nome *</label><input id="${id("fn")}" name="first" autocomplete="given-name" required></div>
      <div><label for="${id("ln")}" data-i18n="f_last">Sobrenome</label><input id="${id("ln")}" name="last" autocomplete="family-name"></div>
    </div>
    <label for="${id("em")}" data-i18n="f_email">E-mail *</label><input id="${id("em")}" type="email" name="email" autocomplete="email" required>
    <label for="${id("ph")}" data-i18n="f_phone">Telefone *</label><input id="${id("ph")}" type="tel" name="phone" autocomplete="tel" required>
    <label for="${id("msg")}" data-i18n="f_msg">Escreva sua mensagem *</label><textarea id="${id("msg")}" name="message" required></textarea>
    <button class="btn btn-gold" type="submit" data-i18n="f_send">Enviar pelo WhatsApp</button>
    <p class="form-status" role="status"></p>
    <p class="form-note"><span data-i18n="f_note">Ao enviar, você concorda com os nossos</span> <a href="terms.html" data-i18n="f_note_link">Termos e Política de Privacidade</a>.</p>
  </form>`;
}
document.querySelectorAll(".form-slot").forEach(s => s.innerHTML = formHTML());

// Popup: abre em qualquer link para contact.html (fora da própria página de contato)
let modal = null;
if (page !== "contact") {
  document.body.insertAdjacentHTML("beforeend", `
  <div class="modal" id="contact-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" hidden>
    <div class="modal-backdrop" data-close></div>
    <div class="modal-box">
      <button class="modal-close" type="button" data-close aria-label="Fechar">&times;</button>
      ${formHTML()}
    </div>
  </div>`);
  modal = document.getElementById("contact-modal");
  modal.querySelector("h3").id = "modal-title";
  const openModal = () => {
    modal.hidden = false; document.body.classList.add("modal-open");
    setTimeout(() => modal.querySelector("input").focus(), 50);
  };
  const closeModal = () => { modal.hidden = true; document.body.classList.remove("modal-open"); };
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href="contact.html"], [data-open-contact]');
    if (a) { e.preventDefault(); document.getElementById("menu").classList.remove("open"); openModal(); return; }
    if (e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeModal(); });
}

// ===== Idioma =====
const PAGE = window.PAGE_DICT || { pt:{}, en:{} };
let currentLang = "pt";
function setLang(lang){
  const d = Object.assign({}, COMMON[lang], PAGE[lang]);
  currentLang = lang;
  document.documentElement.lang = lang === "en" ? "en" : "pt-BR";
  if (d.page_title) document.title = d.page_title;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const k = el.dataset.i18n;
    if (d[k] !== undefined) el.textContent = d[k];
  });
  document.querySelectorAll(".lang button").forEach(b => b.classList.toggle("on", b.dataset.lang === lang));
  document.querySelectorAll(".wa-link").forEach(a => a.href = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(d.wa_text));
  try { localStorage.setItem("aurea_lang", lang); } catch(e) {}
}
let start = "pt";
try {
  const saved = localStorage.getItem("aurea_lang");
  if (saved) start = saved;
  else if (!(navigator.language || "").toLowerCase().startsWith("pt")) start = "en";
} catch(e) {}
const urlLang = new URLSearchParams(location.search).get("lang");
if (urlLang === "en" || urlLang === "pt") start = urlLang;
setLang(start);
document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));

// ===== Menu do celular e cabeçalho ao rolar =====
const menu = document.getElementById("menu");
document.getElementById("burger").addEventListener("click", () => menu.classList.toggle("open"));
menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => menu.classList.remove("open")));
const header = document.querySelector("header");
const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
window.addEventListener("scroll", onScroll); onScroll();

// ===== Envio: PT abre o WhatsApp, EN envia por e-mail (Web3Forms). Os dois terminam em thanks.html =====
const MSG = {
  pt: { missing:"Preencha nome, e-mail, telefone e mensagem.",
        intro:"Olá! Vim pelo site da Aurea.", name:"Nome", email:"E-mail", phone:"Telefone", msg:"Mensagem" },
  en: { missing:"Please fill in name, email, phone and message.", sending:"Sending...",
        error:"Something went wrong. Please try again or email us at info@aureafi.com." }
};
document.querySelectorAll(".contact-form").forEach(form => {
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const m = MSG[currentLang] || MSG.pt;
    const v = n => form.elements[n].value.trim();
    const status = form.querySelector(".form-status");
    const first = v("first"), last = v("last"), email = v("email"), phone = v("phone"), msg = v("message");
    if (!first || !email || !phone || !msg) { status.textContent = m.missing; return; }

    if (currentLang === "en") {
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; status.textContent = m.sending;
      try {
        const res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: "New contact from the Aurea website (English)",
            from_name: "Aurea website",
            name: (first + " " + last).trim(), email, phone, message: msg
          })
        });
        const data = await res.json();
        if (data.success) { location.href = "thanks.html?via=email"; return; }
        status.textContent = m.error;
      } catch (err) { status.textContent = m.error; }
      btn.disabled = false;
      return;
    }

    const text = m.intro + "\n\n" +
      m.name + ": " + (first + " " + last).trim() + "\n" +
      m.email + ": " + email + "\n" +
      m.phone + ": " + phone + "\n\n" +
      m.msg + ": " + msg;
    window.open("https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(text), "_blank", "noopener");
    location.href = "thanks.html?via=whatsapp";
  });
});

// ===== Instagram (Behold) =====
const insta = document.getElementById("insta-feed");
if (insta && BEHOLD_FEED_ID) {
  insta.innerHTML = '<behold-widget feed-id="' + BEHOLD_FEED_ID + '"></behold-widget>';
  const s = document.createElement("script");
  s.type = "module"; s.src = "https://w.behold.so/widget.js";
  document.head.append(s);
}

// ===== Depoimentos (aparecem só quando houver depoimentos em window.TESTIMONIALS) =====
const tWrap = document.getElementById("testimonials");
if (tWrap && Array.isArray(window.TESTIMONIALS) && window.TESTIMONIALS.length) {
  const list = tWrap.querySelector(".t-list");
  window.TESTIMONIALS.forEach(t => {
    const fig = document.createElement("figure");
    fig.className = "t-item";
    fig.innerHTML = '<blockquote><span data-show="pt"></span><span data-show="en"></span></blockquote><figcaption><b></b><span></span></figcaption>';
    fig.querySelector('[data-show="pt"]').textContent = "“" + t.pt + "”";
    fig.querySelector('[data-show="en"]').textContent = "“" + (t.en || t.pt) + "”";
    fig.querySelector("b").textContent = t.name;
    fig.querySelector("figcaption span").textContent = t.company || "";
    list.append(fig);
  });
  tWrap.hidden = false;
}
