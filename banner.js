/* Aurea Financial — carrossel de campanhas (logo abaixo do cabeçalho, de ponta a ponta, só na home)

   COMO EDITAR
   - Cada slide é um bloco dentro de SLIDES. Para tirar um slide: ativo: false.
   - inicio / fim: o slide só aparece entre essas datas (horário CT, -06:00). Vazio: sempre.
   - fases: o mesmo slide muda de texto e de botão a partir de uma data (ex.: "avise-me" antes, "já no ar" depois).
   - posicao / posicaoCelular: ponto da imagem que fica visível ao cortar (horizontal vertical).
   - vagas: nome do contador em vagas.json ("catchup" ou "cyber"). Mostra "Restam X vagas". Vazio: não mostra.
   - Preços em número nunca vão no carrossel.
   - Ordem: a ordem da lista, mas um slide com "primeiroDesde" passa para a frente a partir dessa data.
     Um slide com semprePrimeiro: true fica sempre na frente (hoje: o do imposto de renda). */

const CARROSSEL = {
  paginas: ["home"],
  segundos: 6,                  // tempo de cada slide
  wa: "13259565160"
};

const SLIDES = [
  {
    id: "impostos",
    ativo: true,
    semprePrimeiro: true,          // fica na frente de todos, inclusive da Black Friday e da Cyber Monday
    imagem: "img/svc2.jpg", posicao: "50% 42%", posicaoCelular: "50% 30%",
    fases: [{
      desde: "",
      contagem: "",
      pt: { tag: "Imposto de renda · Declaração de 2026", titulo: "Imposto de 2026:", destaque: "agenda aberta.",
            texto: "Declarações de pessoas físicas e pequenas empresas, em português, a partir de janeiro. Peça seu orçamento em poucos minutos, sem enviar documentos.",
            botao: "Peça seu orçamento", link: "orcamento-impostos.html",
            botao2: "Saiba mais", link2: "impostos.html" },
      en: { tag: "Tax Preparation · 2026 tax year", titulo: "Your 2026 taxes:", destaque: "booking now open.",
            texto: "Returns for individuals and small businesses, in English and Portuguese, starting in January. Get a quote in a few minutes, no documents needed.",
            botao: "Get a quote", link: "orcamento-impostos.html",
            botao2: "Learn more", link2: "impostos.html" }
    }]
  },
  {
    id: "startup",
    ativo: true,
    imagem: "img/banner-startup.jpg", posicao: "100% 50%", posicaoCelular: "82% 50%",
    fases: [{
      desde: "",
      contagem: "",
      pt: { tag: "Novo · Startup Plan", titulo: "Mensalidade menor que uma", destaque: "diária de ajudante.",
            texto: "Para empresas com até 6 meses de abertura e menos de 30 transações por mês. O bookkeeping começa certo desde o primeiro mês.",
            botao: "Quero saber mais", link: "wa:Olá! Quero saber do Startup Plan.",
            botao2: "Como funciona", link2: "bookkeeping.html" },
      en: { tag: "New · Startup Plan", titulo: "A monthly fee lower than", destaque: "a day's pay for a helper.",
            texto: "For businesses up to 6 months old with fewer than 30 transactions a month. Your bookkeeping starts right from the first month.",
            botao: "Tell me more", link: "wa:Hi! I'd like to know more about the Startup Plan.",
            botao2: "How it works", link2: "bookkeeping.html" }
    }]
  },
  {
    id: "blackfriday",
    ativo: true,
    fim: "2026-11-30T23:59:59-06:00",
    primeiroDesde: "2026-11-27T00:00:00-06:00",
    imagem: "img/bf-hero.jpg", posicao: "100% 50%", posicaoCelular: "80% 50%",
    vagas: "catchup",
    fases: [
      { desde: "",                                      // antes de sexta: anúncio
        contagem: "2026-11-27T00:00:00-06:00",
        pt: { tag: "Black Friday · Sexta, 27/11", titulo: "Atrasou. Organizou.", destaque: "Respirou.",
              texto: "Seu 2026 organizado pelo preço de 2 mensalidades. Vai ao ar nesta sexta, com vagas limitadas.",
              botao: "Quero ser avisado", link: "wa:Olá! Quero ser avisado quando a Black Friday da Aurea abrir.",
              rotulo: "Abre em" },
        en: { tag: "Black Friday · Friday, Nov 27", titulo: "Behind. Caught up.", destaque: "Breathe.",
              texto: "Your 2026 books organized for the price of 2 months. Goes live this Friday, with limited spots.",
              botao: "Notify me", link: "wa:Hi! Please let me know when Aurea's Black Friday opens.",
              rotulo: "Opens in" } },
      { desde: "2026-11-27T00:00:00-06:00",             // de sexta até segunda: no ar
        contagem: "2026-11-30T23:59:59-06:00",
        pt: { tag: "Black Friday · Já no ar", titulo: "Atrasou. Organizou.", destaque: "Respirou.",
              texto: "Seu 2026 organizado pelo preço de 2 mensalidades. Vagas limitadas, até segunda, 30/11.",
              botao: "Ver a oferta", link: "blackfriday.html", rotulo: "Termina em" },
        en: { tag: "Black Friday · Live now", titulo: "Behind. Caught up.", destaque: "Breathe.",
              texto: "Your 2026 books organized for the price of 2 months. Limited spots, until Monday, Nov 30.",
              botao: "See the offer", link: "blackfriday.html", rotulo: "Ends in" } }
    ]
  },
  {
    id: "cyber",
    ativo: true,
    fim: "2026-11-30T23:59:59-06:00",
    primeiroDesde: "2026-11-30T00:00:00-06:00",
    imagem: "img/banner-cyber.jpg", posicao: "100% 50%", posicaoCelular: "88% 50%",
    vagas: "cyber",
    fases: [
      { desde: "",                                      // antes de segunda: anúncio
        contagem: "2026-11-30T00:00:00-06:00",
        pt: { tag: "Cyber Monday · Segunda, 30/11", titulo: "12 meses pelo", destaque: "preço de 10.",
              texto: "O plano anual de bookkeeping, só por um dia. E soma com a oferta de catch-up da Black Friday.",
              botao: "Quero ser avisado", link: "wa:Olá! Quero ser avisado da Cyber Monday da Aurea.",
              rotulo: "Abre em" },
        en: { tag: "Cyber Monday · Monday, Nov 30", titulo: "12 months for", destaque: "the price of 10.",
              texto: "The annual bookkeeping plan, for one day only. And it stacks with the Black Friday catch-up offer.",
              botao: "Notify me", link: "wa:Hi! Please let me know about Aurea's Cyber Monday.",
              rotulo: "Opens in" } },
      { desde: "2026-11-30T00:00:00-06:00",             // segunda: só hoje
        contagem: "2026-11-30T23:59:59-06:00",
        pt: { tag: "Cyber Monday · Só hoje", titulo: "12 meses pelo", destaque: "preço de 10.",
              texto: "O plano anual de bookkeeping, só hoje, até 23h59 CT. E soma com a oferta de catch-up.",
              botao: "Quero o plano anual", link: "blackfriday.html", rotulo: "Termina em" },
        en: { tag: "Cyber Monday · Today only", titulo: "12 months for", destaque: "the price of 10.",
              texto: "The annual bookkeeping plan, today only, until 11:59pm CT. And it stacks with the catch-up offer.",
              botao: "Get the annual plan", link: "blackfriday.html", rotulo: "Ends in" } }
    ]
  }
];

(function () {
  if (!CARROSSEL.paginas.includes(document.body.dataset.page || "home")) return;
  const header = document.querySelector("body > header");
  if (!header) return;

  const agora = () => new Date();
  const D = s => s ? new Date(s) : null;
  const noAr = s => s.ativo && !(D(s.inicio) && agora() < D(s.inicio)) && !(D(s.fim) && agora() > D(s.fim));
  const fase = s => s.fases.filter(f => !f.desde || agora() >= D(f.desde)).pop();

  let lista = SLIDES.filter(noAr);
  if (!lista.length) return;
  // quem tem "primeiroDesde" já vencido vai para a frente (o mais recente primeiro)
  lista = lista.map((s, i) => ({ s, i, p: s.semprePrimeiro ? Infinity : s.primeiroDesde && agora() >= D(s.primeiroDesde) ? D(s.primeiroDesde).getTime() : 0 }))
               .sort((a, b) => (b.p - a.p) || (a.i - b.i)).map(x => x.s);

  const varios = lista.length > 1;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  header.insertAdjacentHTML("afterend", `
  <section class="pb-carousel${varios ? " varios" : ""}" id="promo-banner" aria-roledescription="carrossel" aria-label="Campanhas">
    <div class="pb-track">
      ${lista.map((s, i) => `
      <div class="promo-banner pb-slide${i === 0 ? " ativo" : ""}" data-slide="${s.id}" role="group" aria-roledescription="slide"
           style="--pos:${s.posicao};--pos-m:${s.posicaoCelular || s.posicao}">
        <img class="pb-img" src="${s.imagem}" alt="" ${i === 0 ? "" : 'loading="lazy"'}>
        <div class="pb-shade"></div>
        <div class="wrap pb-inner">
          <span class="pb-tag" data-k="tag"></span>
          <h2 class="pb-title"><span data-k="titulo"></span> <em data-k="destaque"></em></h2>
          <p class="pb-text" data-k="texto"></p>
          <div class="pb-row">
            <a class="btn pb-btn" data-k="botao"></a>
            <a class="btn pb-btn2" data-k="botao2" hidden></a>
            <span class="pb-count" data-k="count"></span>
          </div>
        </div>
      </div>`).join("")}
    </div>
    ${varios ? `<div class="wrap pb-dots" role="tablist">${lista.map((s, i) =>
      `<button type="button" role="tab" data-ir="${i}" aria-selected="${i === 0}" aria-label="${i + 1} / ${lista.length}"><span></span></button>`).join("")}</div>` : ""}
  </section>`);

  const raiz = document.getElementById("promo-banner");
  const slides = [...raiz.querySelectorAll(".pb-slide")];
  const dots = [...raiz.querySelectorAll(".pb-dots button")];
  const L = () => document.documentElement.lang === "en" ? "en" : "pt";
  const pad = n => String(n).padStart(2, "0");
  let VAGAS = null;

  const href = link => link && link.startsWith("wa:")
    ? "https://wa.me/" + CARROSSEL.wa + "?text=" + encodeURIComponent(link.slice(3))
    : link;
  const setLink = (a, texto, link) => {
    a.hidden = !texto; if (!texto) return;
    a.textContent = texto; a.href = href(link);
    if (link.startsWith("wa:")) { a.target = "_blank"; a.rel = "noopener"; } else { a.removeAttribute("target"); a.removeAttribute("rel"); }
  };

  function contagem(alvo, rotulo) {
    const ms = D(alvo) - agora();
    if (ms <= 0) return "";
    const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4);
    return `${esc(rotulo)} ${d ? `<b>${d}d</b> ` : ""}<b>${pad(h)}h</b> <b>${pad(m)}min</b>`;
  }

  function render() {
    // um slide que saiu do ar some na próxima carga; aqui só atualiza textos e contagens
    const lang = L();
    slides.forEach((el, i) => {
      const s = lista[i], f = fase(s), t = f[lang] || f.pt;
      const q = k => el.querySelector(`[data-k="${k}"]`);
      q("tag").textContent = t.tag;
      if (dots[i]) dots[i].setAttribute("aria-label", t.tag);   // nome da bolinha para leitores de tela
      q("titulo").textContent = t.titulo;
      q("destaque").textContent = t.destaque || "";
      q("texto").textContent = t.texto;
      setLink(q("botao"), t.botao, t.link);
      setLink(q("botao2"), t.botao2, t.link2 || "");
      const partes = [];
      if (f.contagem) { const c = contagem(f.contagem, t.rotulo || ""); if (c) partes.push(c); }
      if (s.vagas && VAGAS && VAGAS[s.vagas] != null) {
        const n = Math.max(0, Math.min(10, Math.floor(Number(VAGAS[s.vagas])) || 0));
        partes.push(n === 0 ? (lang === "en" ? "<b>Sold out</b>" : "<b>Vagas esgotadas</b>")
          : lang === "en" ? `<b>${n}</b> ${n === 1 ? "spot" : "spots"} left`
          : `${n === 1 ? "Resta" : "Restam"} <b>${n}</b> ${n === 1 ? "vaga" : "vagas"}`);
      }
      q("count").innerHTML = partes.join(' <i aria-hidden="true">·</i> ');
      q("count").hidden = !partes.length;
    });
  }

  // ----- troca de slide -----
  let atual = 0, timer = null, pausado = false;
  const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function ir(n) {
    atual = (n + slides.length) % slides.length;
    slides.forEach((el, i) => {
      const on = i === atual;
      el.classList.toggle("ativo", on);
      el.setAttribute("aria-hidden", on ? "false" : "true");
      el.inert = !on;
      if (on) { const img = el.querySelector("img"); if (img.loading === "lazy") img.loading = "eager"; }
    });
    dots.forEach((d, i) => d.setAttribute("aria-selected", i === atual ? "true" : "false"));
  }
  function iniciar() {
    clearInterval(timer);
    if (!varios || parado) return;
    timer = setInterval(() => { if (!pausado && !document.hidden) ir(atual + 1); }, CARROSSEL.segundos * 1000);
  }
  if (varios) {
    dots.forEach(d => d.addEventListener("click", () => { ir(+d.dataset.ir); iniciar(); }));
    raiz.addEventListener("mouseenter", () => { pausado = true; });
    raiz.addEventListener("mouseleave", () => { pausado = false; });
    raiz.addEventListener("focusin", () => { pausado = true; });
    raiz.addEventListener("focusout", () => { pausado = false; });
    let x0 = null, y0 = null;
    raiz.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    raiz.addEventListener("touchend", e => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { ir(atual + (dx < 0 ? 1 : -1)); iniciar(); }
      x0 = null;
    }, { passive: true });
  }

  render(); ir(0); iniciar();
  setInterval(render, 30000);
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  if (lista.some(s => s.vagas)) {
    fetch("vagas.json?t=" + Date.now(), { cache: "no-store" })
      .then(r => r.ok ? r.json() : null).then(j => { if (j) { VAGAS = j; render(); } }).catch(() => {});
  }
})();
