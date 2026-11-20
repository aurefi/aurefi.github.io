/* Aurea Financial — página da Black Friday (blackfriday.html): contagem, fases da oferta, vagas e medição */
(function () {
  // ===== Configuração =====
  const FIM = new Date("2026-11-30T23:59:59-06:00");            // fim da oferta: 30/11, 23h59 CT
  const CYBER_INICIO = new Date("2026-11-30T00:00:00-06:00");   // Cyber Monday: 30/11, o dia todo
  const VAGAS_TOTAL = 10;        // vagas de cada promoção
  // Vagas que ainda restam em cada promoção. Atualizar à mão quando alguém fechar.
  const VAGAS = {
    catchup: 10,    // Catch-up de 2026 pelo preço de 2 mensalidades
    setup: 10,      // Setup grátis
    extras: 10,     // 1 mês grátis de 2 extras
    fundador: 10,   // Preço de Cliente Fundador
    cyber: 10       // Cyber Monday: plano anual, 12 pelo preço de 10 (só em 30/11)
  };
  const ATUALIZADO = "";   // ex.: "20/11, 10h". Vazio: a linha "Atualizado em" não aparece

  // ===== Fase da página =====
  const agora = new Date();
  const fase = agora > FIM ? "encerrada" : agora >= CYBER_INICIO ? "cyber" : "oferta";
  document.body.classList.add("bf-fase-" + fase);

  // Na Cyber Monday, o bloco do plano anual vira o topo da página (em cada idioma)
  if (fase === "cyber") {
    document.querySelectorAll("[data-bf-cyber]").forEach(bloco => {
      const lang = bloco.closest("[data-show]");
      const hero = lang && lang.querySelector(".bf-hero");
      if (hero) hero.parentNode.insertBefore(bloco, hero);
    });
  }

  // ===== Vagas por promoção =====
  const TXT = {
    pt: { de: n => n === 1 ? "vaga restante de " + VAGAS_TOTAL : "vagas restantes de " + VAGAS_TOTAL, esgotado: "Esgotado", esg_de: "As " + VAGAS_TOTAL + " vagas acabaram", upd: "Atualizado em " },
    en: { de: n => (n === 1 ? "spot left of " : "spots left of ") + VAGAS_TOTAL, esgotado: "Sold out", esg_de: "All " + VAGAS_TOTAL + " spots are taken", upd: "Updated " }
  };
  document.querySelectorAll("[data-bf-slots]").forEach(sec => {
    const t = TXT[sec.dataset.bfSlots] || TXT.pt;
    sec.querySelectorAll("[data-promo]").forEach(card => {
      const bruto = VAGAS[card.dataset.promo];
      const n = Math.max(0, Math.min(VAGAS_TOTAL, Math.floor(Number(bruto ?? VAGAS_TOTAL)) || 0));
      card.classList.toggle("esgotado", n === 0);
      card.classList.toggle("poucas", n > 0 && n <= 3);
      card.querySelector(".num").textContent = n === 0 ? t.esgotado : n;
      card.querySelector(".de").textContent = n === 0 ? t.esg_de : t.de(n);
      card.querySelector(".bar i").style.width = (n / VAGAS_TOTAL * 100) + "%";
    });
    const upd = sec.querySelector("[data-bf-upd]");
    if (ATUALIZADO && upd) { upd.textContent = t.upd + ATUALIZADO + "."; upd.hidden = false; }
  });

  // ===== Contagem regressiva até 30/11, 23h59 CT =====
  const contadores = [...document.querySelectorAll("[data-bf-count]")];
  const dois = n => String(n).padStart(2, "0");
  function contar() {
    const ms = FIM - new Date();
    if (ms <= 0) {
      if (fase !== "encerrada") location.reload();   // vira "Oferta encerrada" sozinha
      return;
    }
    const s = Math.floor(ms / 1000);
    const v = { d: Math.floor(s / 86400), h: dois(Math.floor(s / 3600) % 24), m: dois(Math.floor(s / 60) % 60), s: dois(s % 60) };
    contadores.forEach(c => c.querySelectorAll("[data-u]").forEach(b => { b.textContent = v[b.dataset.u]; }));
  }
  if (fase !== "encerrada" && contadores.length) { contar(); setInterval(contar, 1000); }

  // ===== Barra fixa de WhatsApp no celular, depois que o topo sai da tela =====
  const barra = document.getElementById("bf-bar");
  if (barra && fase !== "encerrada" && "IntersectionObserver" in window) {
    const alvos = [document.getElementById("bf-hero-pt"), document.getElementById("bf-hero-en")].filter(Boolean);
    const visivel = new Map();
    const obs = new IntersectionObserver(entradas => {
      entradas.forEach(en => visivel.set(en.target, en.isIntersecting));
      const algumVisivel = alvos.some(a => a.offsetParent !== null && visivel.get(a));
      barra.classList.toggle("show", !algumVisivel);
      barra.setAttribute("aria-hidden", algumVisivel ? "true" : "false");
      barra.querySelectorAll("a").forEach(a => a.tabIndex = algumVisivel ? -1 : 0);
      document.body.classList.toggle("bf-bar-on", !algumVisivel);
    });
    alvos.forEach(a => obs.observe(a));
  }

  // ===== Medição (GA4) =====
  // Visualização com a fase e a origem; o page_view normal do GA continua valendo
  const q = new URLSearchParams(location.search);
  if (window.gtag) gtag("event", "bf_view", { fase, utm_campaign: q.get("utm_campaign") || "", utm_source: q.get("utm_source") || "" });
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href*="wa.me/"]');
    if (!a || !window.gtag) return;
    gtag("event", "bf_whatsapp_click", { posicao: a.dataset.pos || (a.closest("footer, .wa") ? "botao_flutuante" : "outro"), fase, transport_type: "beacon" });
  });
})();
