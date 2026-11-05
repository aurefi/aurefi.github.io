/* Aurea Financial — banner de campanha (logo abaixo do cabeçalho, de ponta a ponta)
   Para trocar de campanha: suba a imagem nova em img/ e edite só o bloco BANNER abaixo. */
const BANNER = {
  ativo: true,
  inicio: "2026-11-01T00:00:00-06:00",      // aparece a partir de...
  fim:    "2026-11-25T23:59:59-06:00",      // ...e sai do ar sozinho depois daqui (também é o alvo da contagem)
  imagem: "img/banner-sorteio.jpg",
  posicao: "70% 50%",                        // ponto da imagem que fica visível ao cortar (horizontal vertical)
  idiomas: ["pt"],                           // ["pt"], ["en"] ou ["pt","en"]
  paginas: ["home"],                         // páginas onde aparece (data-page do <body>)
  contagem: true,                            // mostra "Faltam X dias..."
  acao: "sorteio",                           // "sorteio" abre o popup; ou um link, ex.: "services.html"
  pt: { tag: "Sorteio", titulo: "2 meses de bookkeeping", destaque: "grátis",
        texto: "Para empresas de construção, limpeza e manutenção nos EUA. Inscrições até 25/11, sorteio em 26/11 ao vivo no Instagram.",
        botao: "Quero participar", faltam: "Faltam", encerra: "Últimas horas" },
  en: { tag: "Giveaway", titulo: "2 months of bookkeeping", destaque: "free",
        texto: "For construction, cleaning and maintenance businesses in the U.S. Enter by Nov 25, drawing on Nov 26 live on Instagram.",
        botao: "Enter now", faltam: "Ends in", encerra: "Final hours" }
};

(function () {
  const b = BANNER, agora = new Date();
  if (!b.ativo || agora < new Date(b.inicio) || agora > new Date(b.fim)) return;
  if (!b.paginas.includes(document.body.dataset.page || "home")) return;
  const header = document.querySelector("body > header");
  if (!header) return;

  header.insertAdjacentHTML("afterend", `
  <section class="promo-banner" id="promo-banner" aria-label="Campanha" hidden>
    <img class="pb-img" src="${b.imagem}" alt="" style="object-position:${b.posicao}">
    <div class="pb-shade"></div>
    <div class="wrap pb-inner">
      <span class="pb-tag" id="pb-tag"></span>
      <h2 class="pb-title"><span id="pb-titulo"></span> <em id="pb-destaque"></em></h2>
      <p class="pb-text" id="pb-texto"></p>
      <div class="pb-row">
        <a class="btn pb-btn" id="pb-btn" href="${b.acao === "sorteio" ? "sorteio.html" : b.acao}" ${b.acao === "sorteio" ? "data-open-sorteio" : ""}></a>
        <span class="pb-count" id="pb-count" ${b.contagem ? "" : "hidden"}></span>
      </div>
    </div>
  </section>`);

  const el = document.getElementById("promo-banner");
  const L = () => (typeof currentLang !== "undefined" && currentLang === "en") ? "en" : "pt";
  const pad = n => String(n).padStart(2, "0");

  function render() {
    const lang = L(), t = b[lang];
    el.hidden = !b.idiomas.includes(lang);
    if (el.hidden) return;
    document.getElementById("pb-tag").textContent = t.tag;
    document.getElementById("pb-titulo").textContent = t.titulo;
    document.getElementById("pb-destaque").textContent = t.destaque;
    document.getElementById("pb-texto").textContent = t.texto;
    document.getElementById("pb-btn").textContent = t.botao;
    if (b.contagem) {
      const ms = new Date(b.fim) - new Date();
      if (ms <= 0) { el.hidden = true; return; }
      const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4);
      const lbl = lang === "en" ? ["d", "h", "min"] : ["d", "h", "min"];
      document.getElementById("pb-count").innerHTML = d < 1
        ? `<b>${t.encerra}</b> · ${pad(h)}${lbl[1]} ${pad(m)}${lbl[2]}`
        : `${t.faltam} <b>${d}${lbl[0]}</b> <b>${pad(h)}${lbl[1]}</b> <b>${pad(m)}${lbl[2]}</b>`;
    }
  }
  render();
  setInterval(render, 30000);
  document.querySelectorAll(".lang button").forEach(btn => btn.addEventListener("click", () => setTimeout(render, 0)));
})();
