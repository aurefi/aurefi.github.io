/* Aurea Financial — orçamento de imposto de renda (orcamento-impostos.html)
   O cliente responde uma pergunta por vez. As respostas vão para:
   1) a tabela orcamentos_impostos no Supabase (só inserção; ninguém de fora consegue ler);
   2) um e-mail para a Aurea pelo Web3Forms.
   Nenhum preço é calculado nem mostrado aqui: a página é pública e qualquer tabela de preços ficaria visível no código.

   COMO EDITAR UMA PERGUNTA: procure o id (ex.: "q11") na lista PERGUNTAS abaixo.
   - show: quando a pergunta aparece (depende das respostas anteriores).
   - warn: true numa opção mostra o aviso "fale com a gente antes" e entra na lista de alertas do e-mail.
   - nota: observação só para o e-mail interno (o cliente não vê). */

(function () {
  const SB_URL = "https://eslputtmlufvxhdanczy.supabase.co";
  const SB_KEY = "sb_publishable_-7TaudR-eu2t1e8L6qfgmw_i4cg6Ksa";   // chave publishable (pública)
  const TABELA = "orcamentos_impostos";
  const AVISO_EMAIL_KEY = (typeof WEB3FORMS_KEY !== "undefined") ? WEB3FORMS_KEY : ""; // definida no main.js
  const RASCUNHO = "aurea_orcamento_rascunho";
  const ESTADOS_NAO_ATENDIDOS = ["CA", "OR", "NY", "MD"];

  const ESTADOS = [["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"]];

  // ---------- atalhos para as condições ----------
  const tem = (a, id, v) => Array.isArray(a[id]) ? a[id].includes(v) : a[id] === v;
  const P = a => tem(a, "q5", "pessoal");
  const E = a => tem(a, "q5", "empresa");
  const autonomo = a => P(a) && tem(a, "q11", "autonomo");
  const llc1 = a => E(a) && a.q19 === "llc1";
  const SN = [{ v: "sim", pt: "Sim", en: "Yes" }, { v: "nao", pt: "Não", en: "No" }];
  const o = (v, pt, en, extra) => Object.assign({ v, pt, en: en || pt }, extra || {});

  // ---------- perguntas (na ordem) ----------
  const PERG_11 = {
    q11a: { tipo: "single", pt: "Quantos negócios diferentes você tem por conta própria?", en: "How many different self-employed businesses do you have?", curto: "Negócios por conta própria",
            opcoes: [o("1", "1"), o("2", "2"), o("3+", "3 ou mais", "3 or more", { warn: true })] },
    q11b: { tipo: "single", pt: "Como você controla as finanças do negócio?", en: "How do you keep track of the business finances?", curto: "Controle do negócio",
            opcoes: [o("aurea", "Bookkeeping da Aurea", "Aurea bookkeeping"), o("qb", "QuickBooks ou planilha própria", "My own QuickBooks or spreadsheet"),
                     o("extratos", "Só os extratos do banco", "Just bank statements"), o("nenhum", "Não tenho controle", "I don't keep track")] },
    q11c: { tipo: "single", pt: "Quantas transações por mês tem esse negócio, mais ou menos?", en: "About how many transactions a month does this business have?", curto: "Transações por mês (por negócio)",
            ajuda: { pt: "Entradas e saídas de dinheiro do negócio: vendas, pagamentos, compras.", en: "Money in and out of the business: sales, payments, purchases." },
            opcoes: [o("ate8", "Até 8 por mês", "Up to 8 a month"), o("9a50", "De 9 a 50", "9 to 50", { warn: true, nota: "oferecer o catch-up de bookkeeping" }),
                     o("mais50", "Mais de 50", "More than 50", { warn: true, nota: "oferecer o catch-up de bookkeeping" })] },
    q11d: { tipo: "pair", pt: "Sobre o seu negócio:", en: "About your business:", curto: "Carro e escritório em casa",
            itens: [{ k: "carro", pt: "Usa carro no trabalho?", en: "Do you use a vehicle for work?" },
                    { k: "escritorio", pt: "Tem escritório em casa?", en: "Do you have a home office?" }] }
  };

  const PERGUNTAS = [
    // ---- A. Contato e o que precisa ----
    { id: "q1", sec: "a", tipo: "text", campo: "nome", pt: "Qual é o seu nome?", en: "What is your name?", curto: "Nome", ph: { pt: "Nome e sobrenome", en: "First and last name" } },
    { id: "q2", sec: "a", tipo: "contato", pt: "Como podemos falar com você?", en: "How can we reach you?", curto: "Contato",
      ajuda: { pt: "O orçamento chega pelo e-mail. O WhatsApp é para tirar dúvidas rápidas.", en: "Your quote is sent by email. WhatsApp is for quick questions." } },
    { id: "q3", sec: "a", tipo: "single", pt: "Em que idioma você prefere ser atendido?", en: "Which language do you prefer?", curto: "Idioma",
      opcoes: [o("pt", "Português"), o("en", "English"), o("es", "Español")] },
    { id: "q4", sec: "a", tipo: "single", pt: "Você já é cliente de bookkeeping da Aurea?", en: "Are you already an Aurea bookkeeping client?", curto: "Cliente de bookkeeping", opcoes: SN },
    { id: "q5", sec: "a", tipo: "multi", pt: "Do que você precisa?", en: "What do you need?", curto: "Serviços", ajuda: { pt: "Pode marcar mais de um.", en: "You can choose more than one." },
      opcoes: [o("pessoal", "Declaração pessoal", "Personal tax return"), o("empresa", "Declaração da empresa", "Business tax return"),
               o("itin", "ITIN", "ITIN application"), o("atrasado", "Ano anterior atrasado", "A prior year I didn't file"),
               o("corrigir", "Corrigir declaração já enviada", "Fix (amend) a return already filed"),
               o("trust", "Trust ou espólio", "Trust or estate", { warn: true }), o("naosei", "Não sei", "I'm not sure")] },
    { id: "q5a", sec: "a", tipo: "multi", show: a => tem(a, "q5", "atrasado"), pt: "Quais anos estão atrasados?", en: "Which years weren't filed?", curto: "Anos atrasados",
      opcoes: [o("2025", "2025"), o("2024", "2024"), o("2023", "2023"), o("antes2023", "Antes de 2023", "Before 2023", { warn: true })] },

    // ---- B. Declaração pessoal ----
    { id: "q6", sec: "b", show: P, tipo: "single", pt: "Você morou nos EUA o ano inteiro de 2026?", en: "Did you live in the U.S. for all of 2026?", curto: "Morou nos EUA em 2026",
      opcoes: [o("sim", "Sim", "Yes"), o("mudou", "Cheguei ou saí dos EUA em 2026", "I moved to or from the U.S. in 2026", { warn: true }),
               o("fora", "Não moro nos EUA", "I don't live in the U.S.", { warn: true })] },
    { id: "q7", sec: "b", show: P, tipo: "single", pt: "Qual era o seu estado civil em 31/12/2026?", en: "What was your marital status on Dec 31, 2026?", curto: "Estado civil",
      opcoes: [o("solteiro", "Solteiro(a)", "Single"), o("casado", "Casado(a)", "Married"), o("viuvo", "Viúvo(a)", "Widowed"),
               o("separado", "Separado(a) ou divorciado(a)", "Separated or divorced")] },
    { id: "q7a", sec: "b", show: a => P(a) && a.q7 === "casado", tipo: "single", pt: "Vocês vão declarar:", en: "Will you file:", curto: "Declaração do casal",
      opcoes: [o("juntos", "Juntos", "Jointly"), o("separados", "Separados", "Separately"), o("naosei", "Não sei", "Not sure")] },
    { id: "q7b", sec: "b", show: a => P(a) && ["solteiro", "separado"].includes(a.q7), tipo: "single",
      pt: "Você paga mais da metade das despesas da casa e mora com um filho ou dependente?", en: "Do you pay more than half of the household costs and live with a child or dependent?", curto: "Paga a casa e mora com dependente", opcoes: SN },
    { id: "q8", sec: "b", show: P, tipo: "estados", limite: 2, pt: "Em quais estados você morou ou trabalhou em 2026?", en: "Which states did you live or work in during 2026?", curto: "Estados (pessoal)" },
    { id: "q9", sec: "b", show: P, tipo: "numero", min: 0, max: 10, pt: "Quantos dependentes você tem?", en: "How many dependents do you have?", curto: "Dependentes",
      ajuda: { pt: "Filhos ou outras pessoas que dependem de você. Não precisa informar nomes nem idades.", en: "Children or others who depend on you. No names or ages needed." } },
    { id: "q9a", sec: "b", show: a => P(a) && a.q9 >= 1, tipo: "single", pt: "Algum dependente tem menos de 17 anos?", en: "Is any dependent under 17?", curto: "Dependente com menos de 17", opcoes: SN },
    { id: "q9b", sec: "b", show: a => P(a) && a.q9 >= 1, tipo: "numero", min: 0, max: 5, pt: "Quantos dependentes fazem faculdade?", en: "How many dependents are in college?", curto: "Dependentes na faculdade" },
    { id: "q10", sec: "b", show: P, tipo: "single", pt: "Todos da família têm Social Security?", en: "Does everyone in the family have a Social Security number?", curto: "Social Security",
      opcoes: [o("ssn", "Sim, todos têm", "Yes, everyone"), o("itin", "Alguém tem ITIN", "Someone has an ITIN"), o("nenhum", "Alguém não tem nenhum dos dois", "Someone has neither")] },
    { id: "q10a", sec: "b", show: a => (P(a) && a.q10 === "nenhum") || (tem(a, "q5", "itin") && !P(a)), tipo: "numero", min: 1, max: 10,
      pt: "Quantas pessoas precisam de ITIN?", en: "How many people need an ITIN?", curto: "Pessoas que precisam de ITIN" },
    { id: "q11", sec: "b", show: P, tipo: "multi", pt: "De onde veio a sua renda em 2026?", en: "Where did your income come from in 2026?", curto: "Fontes de renda",
      ajuda: { pt: "Pode marcar mais de um. Não precisa informar valores.", en: "You can choose more than one. No amounts needed." },
      opcoes: [o("w2", "Salário (W-2)", "Wages (W-2)"), o("autonomo", "Trabalho por conta própria ou 1099", "Self-employment or 1099"),
               o("aluguel", "Aluguel de imóvel", "Rental property"), o("acoes", "Venda de ações ou cripto", "Sale of stocks or crypto"),
               o("juros", "Juros e dividendos", "Interest and dividends"), o("aposentadoria", "Saque de aposentadoria (401k, IRA)", "Retirement withdrawal (401k, IRA)"),
               o("desemprego", "Seguro-desemprego", "Unemployment benefits"), o("k1", "K-1", "K-1"),
               o("exterior", "Renda de fora dos EUA", "Income from outside the U.S.", { warn: true })] },
    Object.assign({ id: "q11a", sec: "b", show: autonomo }, PERG_11.q11a),
    Object.assign({ id: "q11b", sec: "b", show: autonomo }, PERG_11.q11b),
    Object.assign({ id: "q11c", sec: "b", show: a => autonomo(a) && ["extratos", "nenhum"].includes(a.q11b) }, PERG_11.q11c),
    Object.assign({ id: "q11d", sec: "b", show: autonomo }, PERG_11.q11d),
    { id: "q11e", sec: "b", show: a => P(a) && tem(a, "q11", "aluguel"), tipo: "single", pt: "Quantos imóveis alugados?", en: "How many rental properties?", curto: "Imóveis alugados",
      opcoes: [o("1", "1"), o("2", "2"), o("3", "3"), o("4", "4"), o("5+", "5 ou mais", "5 or more", { warn: true })] },
    { id: "q11f", sec: "b", show: a => P(a) && tem(a, "q11", "aluguel"), tipo: "single", pt: "Algum imóvel alugado fica fora dos EUA?", en: "Is any rental property outside the U.S.?", curto: "Imóvel alugado fora dos EUA",
      opcoes: [o("sim", "Sim", "Yes", { warn: true }), o("nao", "Não", "No")] },
    { id: "q11g", sec: "b", show: a => P(a) && tem(a, "q11", "acoes"), tipo: "single", pt: "Quantas vendas de ações ou cripto no ano?", en: "How many stock or crypto sales during the year?", curto: "Vendas de ações/cripto",
      opcoes: [o("ate20", "Até 20", "Up to 20"), o("21a100", "De 21 a 100", "21 to 100"), o("mais100", "Mais de 100", "More than 100", { warn: true }), o("naosei", "Não sei", "Not sure")] },
    { id: "q11h", sec: "b", show: a => P(a) && tem(a, "q11", "k1"), tipo: "numero", min: 1, max: 10, pt: "Quantos K-1 você recebeu?", en: "How many K-1s did you receive?", curto: "K-1 recebidos" },
    { id: "q12", sec: "b", show: P, tipo: "single", pt: "Você vendeu algum imóvel em 2026?", en: "Did you sell any real estate in 2026?", curto: "Venda de imóvel",
      opcoes: [o("nao", "Não", "No"), o("casa", "A casa onde moro", "My main home"),
               o("aluguel", "Imóvel de aluguel ou investimento", "A rental or investment property", { warn: true }),
               o("exterior", "Imóvel fora dos EUA", "Property outside the U.S.", { warn: true })] },
    { id: "q13", sec: "b", show: P, tipo: "single", pt: "Você tem hipoteca da casa, paga property tax ou fez doações?", en: "Do you have a home mortgage, pay property tax or make donations?", curto: "Hipoteca, property tax ou doações", opcoes: SN },
    { id: "q14", sec: "b", show: P, tipo: "single", pt: "Você teve plano de saúde do marketplace (healthcare.gov)?", en: "Did you have marketplace health insurance (healthcare.gov)?", curto: "Plano do marketplace",
      opcoes: [o("sim", "Sim", "Yes"), o("nao", "Não", "No"), o("naosei", "Não sei", "Not sure")] },
    { id: "q14a", sec: "b", show: a => P(a) && a.q14 === "sim", tipo: "numero", min: 1, max: 5, pt: "Quantos formulários 1095-A você recebeu?", en: "How many Form 1095-A did you receive?", curto: "Formulários 1095-A" },
    { id: "q15", sec: "b", show: P, tipo: "single", pt: "Você tem conta HSA (Health Savings Account)?", en: "Do you have an HSA (Health Savings Account)?", curto: "HSA", opcoes: SN },
    { id: "q15a", sec: "b", show: a => P(a) && a.q15 === "sim", tipo: "numero", min: 1, max: 2, pt: "Quantas pessoas da família têm HSA?", en: "How many people in the family have an HSA?", curto: "Titulares de HSA" },
    { id: "q16", sec: "b", show: P, tipo: "pair", pt: "Sobre estimated taxes:", en: "About estimated taxes:", curto: "Estimated taxes",
      itens: [{ k: "pagou", pt: "Você pagou estimated taxes em 2026?", en: "Did you pay estimated taxes in 2026?" },
              { k: "calcular", pt: "Quer que a gente calcule os de 2027?", en: "Would you like us to calculate your 2027 estimates?" }] },
    { id: "q17", sec: "b", show: P, tipo: "single", pt: "Você ou alguém da família teve contas ou bens fora dos EUA que, somados, passaram de US$ 10 mil em algum momento de 2026?",
      en: "Did you or anyone in the family have accounts or assets outside the U.S. that, combined, went over US$10,000 at any point in 2026?", curto: "Contas ou bens fora dos EUA",
      opcoes: [o("sim", "Sim", "Yes", { warn: true }), o("nao", "Não", "No"), o("naosei", "Não sei", "Not sure", { warn: true })] },
    { id: "q18", sec: "b", show: P, tipo: "single", pt: "Você declarou o imposto de 2025?", en: "Did you file your 2025 tax return?", curto: "Declarou 2025",
      opcoes: [o("sozinho", "Sim, eu mesmo fiz", "Yes, I did it myself"), o("outro", "Sim, com outro preparador", "Yes, with another preparer"), o("nao", "Não", "No", { warn: true })] },

    // ---- C. Declaração da empresa ----
    { id: "q19", sec: "c", show: E, tipo: "single", pt: "Qual é o tipo da sua empresa?", en: "What type of business entity do you have?", curto: "Tipo de empresa",
      opcoes: [o("llc1", "LLC de 1 dono", "Single-member LLC"), o("llc2", "LLC com 2 ou mais donos", "LLC with 2 or more owners"),
               o("scorp", "S-corp"), o("ccorp", "C-corp"), o("naosei", "Não sei", "Not sure", { warn: true })] },
    { id: "q19a", sec: "c", show: llc1, tipo: "info", pt: "Na maioria dos casos, a LLC de 1 dono entra na sua declaração pessoal.", en: "In most cases, a single-member LLC is reported on your personal return.",
      texto: { pt: "Por isso, as próximas perguntas são sobre o negócio, do mesmo jeito que para quem trabalha por conta própria.", en: "So the next questions are about the business, the same way as for self-employed people." } },
    Object.assign({ id: "c11a", sec: "c", show: a => llc1(a) && !autonomo(a), mesmoQue: "q11a" }, PERG_11.q11a),
    Object.assign({ id: "c11b", sec: "c", show: a => llc1(a) && !autonomo(a), mesmoQue: "q11b" }, PERG_11.q11b),
    Object.assign({ id: "c11c", sec: "c", show: a => llc1(a) && !autonomo(a) && ["extratos", "nenhum"].includes(a.c11b), mesmoQue: "q11c" }, PERG_11.q11c),
    Object.assign({ id: "c11d", sec: "c", show: a => llc1(a) && !autonomo(a), mesmoQue: "q11d" }, PERG_11.q11d),
    { id: "q20", sec: "c", show: a => E(a) && ["llc2", "scorp", "ccorp"].includes(a.q19), tipo: "numero", min: 1, max: 10, pt: "Quantos sócios a empresa tem?", en: "How many owners does the business have?", curto: "Sócios" },
    { id: "q21", sec: "c", show: a => E(a) && !llc1(a), tipo: "single", pt: "Quantas empresas?", en: "How many businesses?", curto: "Quantas empresas",
      opcoes: [o("1", "1"), o("2+", "2 ou mais", "2 or more", { warn: true })] },
    { id: "q22", sec: "c", show: E, tipo: "estados", pt: "Em quais estados a empresa foi aberta ou trabalha?", en: "Which states is the business registered in or working in?", curto: "Estados (empresa)" },
    { id: "q23", sec: "c", show: a => E(a) && !llc1(a), tipo: "single", pt: "Como está a contabilidade da empresa?", en: "How are the business books kept?", curto: "Contabilidade da empresa",
      opcoes: [o("aurea", "Bookkeeping da Aurea", "Aurea bookkeeping"), o("outro", "Outro bookkeeper ou QuickBooks próprio", "Another bookkeeper or my own QuickBooks"),
               o("extratos", "Só os extratos do banco", "Just bank statements", { warn: true, nota: "oferecer o catch-up de bookkeeping" }),
               o("nenhum", "Sem controle", "No records", { warn: true, nota: "oferecer o catch-up de bookkeeping" })] },
    { id: "q24", sec: "c", show: a => E(a) && !llc1(a), tipo: "single", pt: "Qual foi o faturamento da empresa em 2026, mais ou menos?", en: "About how much revenue did the business have in 2026?", curto: "Faturamento 2026 (faixa)",
      opcoes: [o("ate250k", "Até US$ 250 mil", "Up to US$250k"), o("250ka1m", "De US$ 250 mil a 1 milhão", "US$250k to 1 million"), o("mais1m", "Acima de US$ 1 milhão", "Over US$1 million")] },
    { id: "q25", sec: "c", show: E, tipo: "pairnum", pt: "Sobre quem trabalha para a empresa:", en: "About who works for the business:", curto: "Funcionários e prestadores",
      itens: [{ k: "w2", pt: "Tem funcionários na folha (W-2)?", en: "Do you have employees on payroll (W-2)?" },
              { k: "n1099", pt: "Paga prestadores com 1099?", en: "Do you pay contractors on a 1099?" }],
      nota: "oportunidade: serviço de 1099-NEC" },
    { id: "q25a", sec: "c", show: a => E(a) && a.q25 && a.q25.w2 && a.q25.w2.tem === "sim", tipo: "single",
      pt: "Quem faz a folha de pagamento (941/940)?", en: "Who runs payroll (Forms 941/940)?", curto: "Quem faz a folha (941/940)",
      opcoes: [o("servico", "Serviço de folha (Gusto, ADP etc.)", "A payroll service (Gusto, ADP, etc.)"), o("contador", "Contador ou bookkeeper", "An accountant or bookkeeper"),
               o("eu", "Eu mesmo", "I do it myself"), o("ninguem", "Ninguém", "No one", { warn: true, nota: "sob consulta: funcionários W-2 sem ninguém fazendo a folha" })] },
    { id: "q26", sec: "c", show: E, tipo: "single", pt: "A empresa comprou veículo ou equipamento caro em 2026?", en: "Did the business buy a vehicle or expensive equipment in 2026?", curto: "Veículo ou equipamento", opcoes: SN },
    { id: "q27", sec: "c", show: E, tipo: "single", pt: "É a primeira declaração da empresa?", en: "Is this the business's first tax return?", curto: "Primeira declaração da empresa", opcoes: SN },

    // ---- D. Prazo, documentos e autorização ----
    { id: "q28a", sec: "d", show: a => P(a) || !E(a), tipo: "single", pt: "Quando você consegue mandar os documentos pessoais?", en: "When can you send your personal documents?", curto: "Documentos pessoais até",
      opcoes: [o("jan", "Até 31 de janeiro", "By January 31"), o("fev", "Em fevereiro", "In February"), o("mar15", "Até 15 de março", "By March 15"),
               o("depois", "Depois de 15 de março", "After March 15", { warn: true, nota: "urgência" })] },
    { id: "q28b", sec: "d", show: E, tipo: "single", pt: "Quando você consegue mandar os documentos da empresa?", en: "When can you send the business documents?", curto: "Documentos da empresa até",
      opcoes: [o("antes15fev", "Antes de 15 de fevereiro", "Before February 15"), o("ate01mar", "Até 1º de março", "By March 1"),
               o("depois01mar", "Depois de 1º de março", "After March 1", { warn: true, nota: "urgência" })] },
    { id: "q29", sec: "d", tipo: "single", pt: "Como estão os seus documentos?", en: "How organized are your documents?", curto: "Documentos",
      opcoes: [o("organizados", "Organizados", "Organized"), o("maisoumenos", "Mais ou menos", "Somewhat"), o("baguncados", "Bagunçados", "A mess")] },
    { id: "q30", sec: "d", tipo: "single", pt: "Você recebeu carta do IRS ou do estado, ou tem dívida de imposto?", en: "Have you received a letter from the IRS or the state, or do you owe back taxes?", curto: "Carta do IRS ou dívida",
      opcoes: [o("sim", "Sim", "Yes", { warn: true }), o("nao", "Não", "No")] },
    { id: "q31", sec: "d", tipo: "textarea", opcional: true, pt: "Tem algo mais que devemos saber?", en: "Anything else we should know?", curto: "Observações",
      ajuda: { pt: "Opcional. Não escreva números de documentos (SSN, ITIN, EIN) nem valores.", en: "Optional. Don't include document numbers (SSN, ITIN, EIN) or amounts." } },
    { id: "q32", sec: "d", tipo: "consent", pt: "Quase lá", en: "Almost done", curto: "Autorizações" }
  ];

  const SECOES = { a: { pt: "Contato", en: "Contact" }, b: { pt: "Declaração pessoal", en: "Personal return" },
                   c: { pt: "Declaração da empresa", en: "Business return" }, d: { pt: "Prazo e documentos", en: "Timing and documents" } };

  const TXT = {
    pt: { comecar: "Começar", continuar: "Continuar", voltar: "Voltar", enviar: "Enviar respostas", enviando: "Enviando...", sim: "Sim", nao: "Não",
          aviso: "Pela sua resposta, o seu caso precisa de uma conversa antes do orçamento. Pode continuar e enviar o formulário normalmente; vamos entrar em contato.",
          avisoEstados: "Ainda não fazemos declarações estaduais de California, Oregon, New York e Maryland. Pode continuar e enviar o formulário; vamos conversar sobre o seu caso.",
          avisoMuitos: "Mais de 2 estados pede uma conversa antes do orçamento. Pode continuar e enviar o formulário normalmente.",
          buscar: "Buscar estado", nenhumEstado: "Escolha pelo menos um estado.", quantos: "Quantos?",
          email: "E-mail", whats: "WhatsApp", pais: "País", outro: "Outro",
          errNome: "Preencha o seu nome.", errEmail: "Confira o e-mail: ele precisa estar no formato nome@exemplo.com.", errWhats: "Confira o número do WhatsApp.",
          errEscolha: "Escolha uma opção para continuar.", errPar: "Responda as duas perguntas para continuar.", errQtd: "Informe quantos.",
          consent1: "Aceito ser contatado pela Aurea Financial sobre este orçamento.", consent2: "Quero receber novidades e ofertas da Aurea (opcional).",
          errConsent: "Para enviar, marque que aceita ser contatado sobre este orçamento.",
          docs: "Não envie documentos por e-mail ou WhatsApp. Se você fechar com a gente, enviamos o link seguro do portal.",
          falha: "Não foi possível enviar agora. Tente de novo em instantes ou fale com a gente pelo WhatsApp.",
          okTitulo: "Recebemos as suas respostas.", okTexto: "Você recebe o orçamento por e-mail em breve. Se tivermos alguma dúvida, falamos com você antes.",
          okInicio: "Voltar para o início", passo: (i, n) => `Parte ${i} de ${n}` },
    en: { comecar: "Start", continuar: "Continue", voltar: "Back", enviar: "Send my answers", enviando: "Sending...", sim: "Yes", nao: "No",
          aviso: "Based on your answer, your situation needs a quick conversation before we can quote. You can continue and send the form as usual; we'll get in touch.",
          avisoEstados: "We don't prepare California, Oregon, New York or Maryland state returns yet. You can continue and send the form; we'll talk about your situation.",
          avisoMuitos: "More than 2 states needs a conversation before we can quote. You can continue and send the form as usual.",
          buscar: "Search state", nenhumEstado: "Choose at least one state.", quantos: "How many?",
          email: "Email", whats: "WhatsApp", pais: "Country", outro: "Other",
          errNome: "Please enter your name.", errEmail: "Please check your email: it should look like name@example.com.", errWhats: "Please check your WhatsApp number.",
          errEscolha: "Choose an option to continue.", errPar: "Answer both questions to continue.", errQtd: "Please enter how many.",
          consent1: "I agree to be contacted by Aurea Financial about this quote.", consent2: "I'd like to receive news and offers from Aurea (optional).",
          errConsent: "To send, please confirm you agree to be contacted about this quote.",
          docs: "Don't send documents by email or WhatsApp. If you decide to work with us, we'll send you a secure portal link.",
          falha: "We couldn't send it right now. Please try again in a moment or message us on WhatsApp.",
          okTitulo: "We received your answers.", okTexto: "You'll get your quote by email soon. If we have any questions, we'll reach out first.",
          okInicio: "Back to home", passo: (i, n) => `Part ${i} of ${n}` }
  };

  const PAISES = [{ v: "1", pt: "Estados Unidos (+1)", en: "United States (+1)", cod: "+1", ph: "(407) 555-1234", min: 10, max: 10 },
                  { v: "55", pt: "Brasil (+55)", en: "Brazil (+55)", cod: "+55", ph: "(11) 91234-5678", min: 10, max: 11 },
                  { v: "x", pt: "Outro país", en: "Other country", cod: "+", ph: "+44 7700 900123", min: 7, max: 15 }];
  // bandeiras: as mesmas do seletor de idioma (main.js); "outro" usa um globo
  const GLOBO = '<svg class="flag" viewBox="0 0 24 16" aria-hidden="true"><rect width="24" height="16" rx="2" fill="#e9dfcf"/><g fill="none" stroke="#7A5A2E" stroke-width="1.1"><circle cx="12" cy="8" r="5.6"/><ellipse cx="12" cy="8" rx="2.4" ry="5.6"/><path d="M6.4 8h11.2"/></g></svg>';
  const bandeira = v => v === "1" ? (typeof FLAG_US !== "undefined" ? FLAG_US : "") : v === "55" ? (typeof FLAG_BR !== "undefined" ? FLAG_BR : "") : GLOBO;

  // ---------- estado ----------
  const $ = id => document.getElementById(id);
  const L = () => document.documentElement.lang === "en" ? "en" : "pt";
  const t = k => TXT[L()][k];
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const store = {
    get() { try { return JSON.parse(sessionStorage.getItem(RASCUNHO) || "null"); } catch (e) { return null; } },
    set(v) { try { sessionStorage.setItem(RASCUNHO, JSON.stringify(v)); } catch (e) {} },
    del() { try { sessionStorage.removeItem(RASCUNHO); } catch (e) {} }
  };
  let A = {}, hist = [], fase = "intro";
  const salvo = store.get();
  if (salvo && salvo.A && Array.isArray(salvo.hist) && salvo.hist.length) { A = salvo.A; hist = salvo.hist; fase = "perguntas"; }

  const porId = id => PERGUNTAS.find(q => q.id === id);
  const visivel = (q, a) => !q.show || q.show(a);
  // respostas "limpas": só das perguntas que ainda aparecem com as respostas atuais
  function limpas() {
    const c = {};
    PERGUNTAS.forEach(q => { if (visivel(q, c) && A[q.id] !== undefined) c[q.id] = A[q.id]; });
    return c;
  }
  const visiveis = () => { const c = limpas(); return PERGUNTAS.filter(q => visivel(q, c)); };
  function proxima(idAtual) {
    const c = limpas(), i = idAtual ? PERGUNTAS.findIndex(q => q.id === idAtual) : -1;
    return PERGUNTAS.slice(i + 1).find(q => visivel(q, c));
  }

  // ---------- avisos ----------
  function avisoDe(q, v) {
    if (v === undefined || v === null) return "";
    if (q.tipo === "estados") {
      const lst = v || [];
      if (lst.some(s => ESTADOS_NAO_ATENDIDOS.includes(s))) return t("avisoEstados");
      if (q.limite && lst.length > q.limite) return t("avisoMuitos");
      return "";
    }
    if (!q.opcoes) return "";
    const vs = Array.isArray(v) ? v : [v];
    return q.opcoes.some(op => op.warn && vs.includes(op.v)) ? t("aviso") : "";
  }

  // ---------- desenho ----------
  const raiz = $("orc");
  function render() {
    if (fase === "intro") return renderIntro();
    if (fase === "ok") return renderOk();
    const id = hist[hist.length - 1], q = porId(id);
    if (!q || !visivel(q, limpas())) { hist = hist.filter(h => visivel(porId(h), limpas())); if (!hist.length) { fase = "intro"; return render(); } return render(); }
    const lang = L(), lista = visiveis();
    // uma faixa por parte do formulário (Contato, Pessoal, Empresa, Prazo): só anda para a frente
    const partes = [...new Set(lista.map(x => x.sec))], parteAtual = partes.indexOf(q.sec);
    const daParte = lista.filter(x => x.sec === q.sec), posParte = daParte.findIndex(x => x.id === id);
    const barras = partes.map((sc, i) => {
      const w = i < parteAtual ? 100 : i > parteAtual ? 0 : Math.round(posParte / daParte.length * 100);
      return `<span title="${esc(SECOES[sc][lang])}"><i style="width:${w}%"></i></span>`;
    }).join("");
    const v = A[id];
    let corpo = "";

    if (q.tipo === "text") {
      corpo = `<input class="orc-input" id="orc-text" type="text" autocomplete="name" maxlength="120" placeholder="${esc(q.ph[lang])}" value="${esc(v || "")}">`;
    } else if (q.tipo === "contato") {
      const c = v || {}, pais = c.pais || "1";
      corpo = `<label class="orc-lbl" for="orc-email">${t("email")}</label>
        <input class="orc-input" id="orc-email" type="email" autocomplete="email" maxlength="160" value="${esc(c.email || "")}">
        <label class="orc-lbl" for="orc-tel">${t("whats")}</label>
        <div class="orc-tel"><div class="orc-pais"><span class="orc-pais-v" id="orc-pais-v" aria-hidden="true">${bandeira(pais)}<b>${PAISES.find(p => p.v === pais).cod}</b><svg class="chev" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4"/></svg></span>
          <select id="orc-pais" aria-label="${t("pais")}">${PAISES.map(p => `<option value="${p.v}"${p.v === pais ? " selected" : ""}>${p[lang]}</option>`).join("")}</select></div>
        <input class="orc-input" id="orc-tel" type="tel" autocomplete="tel-national" inputmode="tel" maxlength="24" placeholder="${PAISES.find(p => p.v === pais).ph}" value="${esc(c.tel || "")}"></div>`;
    } else if (q.tipo === "single" || q.tipo === "multi") {
      const multi = q.tipo === "multi", sel = multi ? (v || []) : [v];
      corpo = `<div class="orc-ops${q.opcoes.length > 4 ? " col2" : ""}" role="${multi ? "group" : "radiogroup"}">${q.opcoes.map(op =>
        `<button type="button" class="orc-op${multi ? " multi" : ""}" role="${multi ? "checkbox" : "radio"}" aria-checked="${sel.includes(op.v)}" data-v="${esc(op.v)}"><i aria-hidden="true"></i><span>${esc(op[lang])}</span></button>`).join("")}</div>`;
    } else if (q.tipo === "numero") {
      const ns = []; for (let n = q.min; n <= q.max; n++) ns.push(n);
      corpo = `<div class="orc-nums" role="radiogroup">${ns.map(n => `<button type="button" class="orc-num" role="radio" aria-checked="${v === n}" data-n="${n}">${n}${n === q.max && q.max >= 5 ? "+" : ""}</button>`).join("")}</div>`;
    } else if (q.tipo === "pair" || q.tipo === "pairnum") {
      const c = v || {};
      corpo = q.itens.map(it => {
        const r = q.tipo === "pairnum" ? (c[it.k] || {}).tem : c[it.k];
        const qtd = q.tipo === "pairnum" ? (c[it.k] || {}).qtd : "";
        return `<div class="orc-pair" data-k="${it.k}"><span>${esc(it[lang])}</span><div class="orc-yn" role="radiogroup">
          <button type="button" role="radio" aria-checked="${r === "sim"}" data-r="sim">${t("sim")}</button>
          <button type="button" role="radio" aria-checked="${r === "nao"}" data-r="nao">${t("nao")}</button></div>
          ${q.tipo === "pairnum" ? `<label class="orc-qtd"${r === "sim" ? "" : " hidden"}>${t("quantos")} <input type="number" min="1" max="999" inputmode="numeric" value="${esc(qtd || "")}"></label>` : ""}</div>`;
      }).join("");
    } else if (q.tipo === "estados") {
      const sel = v || [];
      corpo = `<div class="orc-chips" id="orc-chips">${sel.map(s => `<button type="button" class="orc-chip" data-s="${s}" aria-label="${s} ×">${s} <b aria-hidden="true">×</b></button>`).join("")}</div>
        <input class="orc-input" id="orc-busca" type="search" placeholder="${t("buscar")}" autocomplete="off">
        <div class="orc-estados" id="orc-estados">${ESTADOS.map(([s, n]) => `<button type="button" class="orc-est" role="checkbox" aria-checked="${sel.includes(s)}" data-s="${s}" data-n="${n.toLowerCase()}"><b>${s}</b> ${n}</button>`).join("")}</div>`;
    } else if (q.tipo === "info") {
      corpo = `<p class="orc-info">${esc(q.texto[lang])}</p>`;
    } else if (q.tipo === "textarea") {
      corpo = `<textarea class="orc-input" id="orc-area" rows="5" maxlength="1500">${esc(v || "")}</textarea>`;
    } else if (q.tipo === "consent") {
      const c = v || {};
      corpo = `<label class="orc-check"><input type="checkbox" id="orc-c1"${c.contato ? " checked" : ""}> <span>${t("consent1")}</span></label>
        <label class="orc-check"><input type="checkbox" id="orc-c2"${c.marketing ? " checked" : ""}> <span>${t("consent2")}</span></label>
        <p class="orc-docs">${t("docs")}</p>
        <input type="text" id="orc-hp" name="empresa_site" tabindex="-1" autocomplete="off" aria-hidden="true" class="orc-hp">`;
    }

    const precisaBotao = !["single", "numero"].includes(q.tipo) || avisoDe(q, v);
    raiz.innerHTML = `
      <div class="orc-top"><span class="orc-sec">${esc(SECOES[q.sec][lang])}</span><span class="orc-pos">${TXT[lang].passo(parteAtual + 1, partes.length)}</span></div>
      <div class="orc-bar" aria-hidden="true">${barras}</div>
      <form class="orc-step" id="orc-form" novalidate>
        <h1 class="orc-q" id="orc-q" tabindex="-1">${esc(q[lang])}</h1>
        ${q.ajuda ? `<p class="orc-ajuda">${esc(q.ajuda[lang])}</p>` : ""}
        ${corpo}
        <div class="orc-warn" id="orc-warn" role="status"${avisoDe(q, v) ? "" : " hidden"}>${esc(avisoDe(q, v))}</div>
        <p class="orc-err" id="orc-err" role="alert"></p>
        <div class="orc-nav">
          ${hist.length > 1 ? `<button type="button" class="btn btn-line" id="orc-voltar">${t("voltar")}</button>` : "<span></span>"}
          <button type="submit" class="btn btn-dark" id="orc-ir"${precisaBotao ? "" : " hidden"}>${q.tipo === "consent" ? t("enviar") : t("continuar")}</button>
        </div>
      </form>`;
    ligar(q);
    const foco = raiz.querySelector("#orc-text,#orc-email") || $("orc-q");
    foco.focus({ preventScroll: true });
  }

  function renderIntro() {
    const lang = L();
    raiz.innerHTML = `<div class="orc-intro">
      <p class="eyebrow">${lang === "en" ? "Tax Preparation · 2027 Season" : "Imposto de renda · Temporada 2027"}</p>
      <h1>${lang === "en" ? "Get a quote for your tax return" : "Peça o orçamento da sua declaração"}</h1>
      <p class="lead">${lang === "en"
        ? "Answer a few quick questions, one at a time. It takes about 5 minutes, and you get your quote by email."
        : "Responda algumas perguntas rápidas, uma de cada vez. Leva uns 5 minutos, e você recebe o orçamento por e-mail."}</p>
      <ul class="orc-pontos">
        <li>${lang === "en" ? "We never ask for your SSN, amounts or documents here." : "Aqui nunca pedimos SSN, valores ou documentos."}</li>
        <li>${lang === "en" ? "Our fee is not based on the amount of your refund." : "O nosso honorário não é baseado no valor da restituição."}</li>
      </ul>
      <button type="button" class="btn btn-dark" id="orc-start">${t("comecar")}</button></div>`;
    $("orc-start").addEventListener("click", () => {
      fase = "perguntas"; hist = [PERGUNTAS[0].id]; salvar(); render();
      if (window.gtag) gtag("event", "tax_quote_start");
    });
  }

  // quem escolheu atendimento em espanhol (pergunta 3) também vê a confirmação em espanhol
  const ES = { okTitulo: "Recibimos sus respuestas.", okTexto: "Pronto recibirá el presupuesto por correo electrónico. Si tenemos alguna duda, nos comunicaremos con usted antes.",
               docs: "No envíe documentos por correo electrónico ni por WhatsApp. Si decide trabajar con nosotros, le enviaremos el enlace seguro del portal." };
  let okEspanhol = false;
  function renderOk() {
    raiz.innerHTML = `<div class="orc-intro orc-ok" role="status">
      <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22"/><path d="M14 25l7 7 13-15"/></svg>
      <h1 tabindex="-1" id="orc-okt">${t("okTitulo")}</h1>
      <p class="lead">${t("okTexto")}</p>
      <p class="orc-docs">${t("docs")}</p>
      ${okEspanhol ? `<div class="orc-es" lang="es"><p class="orc-es-t">${ES.okTitulo}</p><p>${ES.okTexto}</p><p class="orc-docs">${ES.docs}</p></div>` : ""}
      <a class="btn btn-line" href="index.html">${t("okInicio")}</a></div>`;
    $("orc-okt").focus({ preventScroll: true });
  }

  // ---------- eventos de cada pergunta ----------
  function ligar(q) {
    const form = $("orc-form"), err = $("orc-err"), warn = $("orc-warn"), ir = $("orc-ir");
    const mostrarAviso = () => { const w = avisoDe(q, A[q.id]); warn.textContent = w; warn.hidden = !w; return w; };
    const voltar = $("orc-voltar");
    if (voltar) voltar.addEventListener("click", () => { hist.pop(); salvar(); render(); });

    // guarda o que foi digitado a cada tecla (trocar o idioma no meio redesenha a pergunta)
    if (q.tipo === "text") $("orc-text").addEventListener("input", e => { A[q.id] = e.target.value; salvar(); });
    if (q.tipo === "textarea") $("orc-area").addEventListener("input", e => { A[q.id] = e.target.value; salvar(); });
    if (q.tipo === "contato") $("orc-pais").addEventListener("change", e => {
      const p = PAISES.find(x => x.v === e.target.value);
      $("orc-pais-v").innerHTML = `${bandeira(p.v)}<b>${p.cod}</b><svg class="chev" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4"/></svg>`;
      $("orc-tel").placeholder = p.ph;
    });
    if (q.tipo === "contato") ["orc-email", "orc-pais", "orc-tel"].forEach(id => $(id).addEventListener("input", () => {
      A[q.id] = { email: $("orc-email").value.trim(), pais: $("orc-pais").value, tel: $("orc-tel").value }; salvar();
    }));

    if (q.tipo === "consent") $("orc-c1").addEventListener("change", () => { err.textContent = ""; });

    if (q.tipo === "single") {
      form.querySelectorAll(".orc-op").forEach(b => b.addEventListener("click", () => {
        A[q.id] = b.dataset.v; salvar();
        form.querySelectorAll(".orc-op").forEach(x => x.setAttribute("aria-checked", x === b ? "true" : "false"));
        err.textContent = "";
        if (mostrarAviso()) { ir.hidden = false; return; }
        setTimeout(avancar, 220);
      }));
    }
    if (q.tipo === "multi") {
      form.querySelectorAll(".orc-op").forEach(b => b.addEventListener("click", () => {
        let s = (A[q.id] || []).slice();
        // "Não sei" não combina com as outras opções
        if (b.dataset.v === "naosei") s = s.includes("naosei") ? [] : ["naosei"];
        else { s = s.filter(x => x !== "naosei"); s = s.includes(b.dataset.v) ? s.filter(x => x !== b.dataset.v) : s.concat(b.dataset.v); }
        A[q.id] = s; salvar();
        form.querySelectorAll(".orc-op").forEach(x => x.setAttribute("aria-checked", s.includes(x.dataset.v) ? "true" : "false"));
        err.textContent = ""; mostrarAviso();
      }));
    }
    if (q.tipo === "numero") {
      form.querySelectorAll(".orc-num").forEach(b => b.addEventListener("click", () => {
        A[q.id] = +b.dataset.n; salvar();
        form.querySelectorAll(".orc-num").forEach(x => x.setAttribute("aria-checked", x === b ? "true" : "false"));
        setTimeout(avancar, 220);
      }));
    }
    if (q.tipo === "pair" || q.tipo === "pairnum") {
      form.querySelectorAll(".orc-pair").forEach(row => {
        const k = row.dataset.k;
        row.querySelectorAll(".orc-yn button").forEach(b => b.addEventListener("click", () => {
          const c = Object.assign({}, A[q.id] || {});
          if (q.tipo === "pairnum") c[k] = Object.assign({}, c[k] || {}, { tem: b.dataset.r });
          else c[k] = b.dataset.r;
          A[q.id] = c; salvar();
          row.querySelectorAll(".orc-yn button").forEach(x => x.setAttribute("aria-checked", x === b ? "true" : "false"));
          const qtd = row.querySelector(".orc-qtd");
          if (qtd) { qtd.hidden = b.dataset.r !== "sim"; if (!qtd.hidden) qtd.querySelector("input").focus(); }
          err.textContent = "";
        }));
        const inp = row.querySelector(".orc-qtd input");
        if (inp) inp.addEventListener("input", () => {
          const c = Object.assign({}, A[q.id] || {}); c[k] = Object.assign({}, c[k] || {}, { qtd: inp.value ? Math.max(1, Math.min(999, parseInt(inp.value, 10) || 0)) : "" });
          A[q.id] = c; salvar();
        });
      });
    }
    if (q.tipo === "estados") {
      const busca = $("orc-busca"), lista = $("orc-estados"), chips = $("orc-chips");
      const atualizar = () => {
        const s = A[q.id] || [];
        lista.querySelectorAll(".orc-est").forEach(b => b.setAttribute("aria-checked", s.includes(b.dataset.s) ? "true" : "false"));
        chips.innerHTML = s.map(x => `<button type="button" class="orc-chip" data-s="${x}" aria-label="${x} ×">${x} <b aria-hidden="true">×</b></button>`).join("");
        mostrarAviso(); err.textContent = "";
      };
      const alternar = s => { const cur = A[q.id] || []; A[q.id] = cur.includes(s) ? cur.filter(x => x !== s) : cur.concat(s); salvar(); atualizar(); };
      lista.addEventListener("click", e => { const b = e.target.closest(".orc-est"); if (b) alternar(b.dataset.s); });
      chips.addEventListener("click", e => { const b = e.target.closest(".orc-chip"); if (b) alternar(b.dataset.s); });
      busca.addEventListener("input", () => {
        const f = busca.value.trim().toLowerCase();
        lista.querySelectorAll(".orc-est").forEach(b => { b.hidden = !!f && !(b.dataset.n.includes(f) || b.dataset.s.toLowerCase() === f); });
      });
      busca.addEventListener("keydown", e => {
        if (e.key !== "Enter") return; e.preventDefault();
        const vis = [...lista.querySelectorAll(".orc-est:not([hidden])")];
        if (vis.length === 1) { alternar(vis[0].dataset.s); busca.value = ""; busca.dispatchEvent(new Event("input")); }
      });
    }

    form.addEventListener("submit", e => {
      e.preventDefault();
      const erro = validar(q);
      if (erro) { err.textContent = erro; return; }
      if (q.tipo === "consent") return enviar(ir, err);
      avancar();
    });
  }

  function validar(q) {
    if (q.tipo === "text") {
      const v = $("orc-text").value.trim(); A[q.id] = v; salvar();
      return v.length < 2 ? t("errNome") : "";
    }
    if (q.tipo === "contato") {
      const email = $("orc-email").value.trim().toLowerCase(), pais = $("orc-pais").value, tel = $("orc-tel").value.trim();
      A[q.id] = { email, pais, tel }; salvar();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) { $("orc-email").focus(); return t("errEmail"); }
      const p = PAISES.find(x => x.v === pais), d = tel.replace(/\D/g, "");
      if (d.length < p.min || d.length > p.max || (pais === "1" && /^[01]/.test(d))) { $("orc-tel").focus(); return t("errWhats"); }
      return "";
    }
    if (q.tipo === "single" || q.tipo === "numero") return A[q.id] === undefined ? t("errEscolha") : "";
    if (q.tipo === "multi") return (A[q.id] || []).length ? "" : t("errEscolha");
    if (q.tipo === "estados") return (A[q.id] || []).length ? "" : t("nenhumEstado");
    if (q.tipo === "pair") { const c = A[q.id] || {}; return q.itens.every(it => c[it.k]) ? "" : t("errPar"); }
    if (q.tipo === "pairnum") {
      const c = A[q.id] || {};
      if (!q.itens.every(it => c[it.k] && c[it.k].tem)) return t("errPar");
      return q.itens.every(it => c[it.k].tem !== "sim" || c[it.k].qtd) ? "" : t("errQtd");
    }
    if (q.tipo === "textarea") { A[q.id] = $("orc-area").value.trim(); salvar(); return ""; }
    if (q.tipo === "consent") {
      A[q.id] = { contato: $("orc-c1").checked, marketing: $("orc-c2").checked }; salvar();
      return A[q.id].contato ? "" : t("errConsent");
    }
    return "";
  }

  function avancar() {
    const prox = proxima(hist[hist.length - 1]);
    if (!prox) return;
    hist.push(prox.id); salvar(); render();
    // só rola se a pergunta ficou acima da tela; perto do topo volta ao início
    // (rolar poucos pixels faz o cabeçalho encolher e esticar sem parar)
    const topo = raiz.getBoundingClientRect().top;
    if (topo < 70) {
      const alvo = window.scrollY + topo - 110;
      window.scrollTo({ top: alvo < 160 ? 0 : alvo, behavior: "smooth" });
    }
  }
  function salvar() { store.set({ A, hist }); }

  // ---------- resumo para o e-mail e para o Supabase ----------
  function rotulo(q, v) {
    if (v === undefined || v === null || v === "") return "";
    if (q.tipo === "single") { const op = q.opcoes.find(x => x.v === v); return op ? op.pt : v; }
    if (q.tipo === "multi") return v.map(x => (q.opcoes.find(op => op.v === x) || { pt: x }).pt).join(", ");
    if (q.tipo === "estados") return v.join(", ");
    if (q.tipo === "pair") return q.itens.map(it => `${it.pt} ${v[it.k] === "sim" ? "Sim" : "Não"}`).join(" | ");
    if (q.tipo === "pairnum") return q.itens.map(it => { const c = v[it.k] || {}; return `${it.pt} ${c.tem === "sim" ? "Sim (" + c.qtd + ")" : "Não"}`; }).join(" | ");
    if (q.tipo === "contato") return `${v.email} · WhatsApp +${v.pais === "x" ? "" : v.pais}${String(v.tel || "").replace(/\D/g, "")}`;
    if (q.tipo === "consent") return `Contato: ${v.contato ? "sim" : "não"} · Novidades: ${v.marketing ? "sim" : "não"}`;
    return String(v);
  }
  function montarResumo() {
    const c = limpas(), linhas = [], alertas = [];
    PERGUNTAS.forEach(q => {
      if (!visivel(q, c) || q.tipo === "info" || c[q.id] === undefined) return;
      const r = rotulo(q, c[q.id]); if (r === "") return;
      linhas.push(`${q.curto}: ${r}`);
      const vs = Array.isArray(c[q.id]) ? c[q.id] : [c[q.id]];
      if (q.opcoes) q.opcoes.filter(op => op.warn && vs.includes(op.v)).forEach(op => alertas.push(`${q.curto}: ${op.pt}${op.nota ? " (" + op.nota + ")" : ""}`));
      if (q.tipo === "estados") {
        const nao = c[q.id].filter(s => ESTADOS_NAO_ATENDIDOS.includes(s));
        if (nao.length) alertas.push(`${q.curto}: estado não atendido (${nao.join(", ")})`);
        if (q.limite && c[q.id].length > q.limite) alertas.push(`${q.curto}: mais de ${q.limite} estados`);
      }
      if (q.id === "q25") { const v = c.q25; if ((v.n1099 || {}).tem === "sim") alertas.push("Paga prestadores com 1099 (oportunidade: serviço de 1099-NEC)"); }
    });
    // respostas que se contradizem
    if (c.q4 === "nao" && c.q23 === "aurea") alertas.push("Contradição: disse que NÃO é cliente de bookkeeping (pergunta 4), mas marcou \"Bookkeeping da Aurea\" na contabilidade da empresa (23)");
    if (c.q4 === "nao" && (c.q11b === "aurea" || c.c11b === "aurea")) alertas.push("Contradição: disse que NÃO é cliente de bookkeeping (pergunta 4), mas marcou \"Bookkeeping da Aurea\" no controle do negócio (11b)");
    return { c, linhas, alertas };
  }

  async function enviar(btn, err) {
    if ($("orc-hp") && $("orc-hp").value) return; // robô
    const { c, linhas, alertas } = montarResumo();
    const contato = c.q2 || {}, pais = contato.pais === "x" ? "" : contato.pais;
    const whatsapp = "+" + pais + (contato.tel || "").replace(/\D/g, "");
    const utm = {}; try { new URLSearchParams(location.search).forEach((v, k) => { if (k.startsWith("utm_")) utm[k] = v.slice(0, 80); }); } catch (e) {}
    const dados = {
      nome: (c.q1 || "").slice(0, 120), email: (contato.email || "").slice(0, 160), whatsapp: whatsapp.slice(0, 24),
      idioma: c.q3 || null, cliente_bookkeeping: c.q4 === "sim", servicos: c.q5 || [], alertas,
      respostas: c, aceita_contato: !!(c.q32 && c.q32.contato), marketing: !!(c.q32 && c.q32.marketing),
      idioma_site: L(), utm
    };
    btn.disabled = true; btn.textContent = t("enviando"); err.textContent = "";

    let salvoSb = false;
    try {
      const res = await fetch(`${SB_URL}/rest/v1/${TABELA}`, {
        method: "POST", headers: { apikey: SB_KEY, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(dados)
      });
      salvoSb = res.ok;
    } catch (e) { salvoSb = false; }

    let avisado = false;
    if (AVISO_EMAIL_KEY) {
      try {
        const r = await fetch("https://api.web3forms.com/submit", {
          method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            access_key: AVISO_EMAIL_KEY, from_name: "Aurea website", replyto: dados.email,
            subject: `✧ Pedido de orçamento de imposto: ${dados.nome}` + (alertas.length ? " · CONVERSAR ANTES" : "") + (salvoSb ? "" : " · NÃO SALVO NO SUPABASE"),
            name: dados.nome, email: dados.email, whatsapp: dados.whatsapp,
            alertas: alertas.length ? alertas.map(x => "• " + x).join("\n") : "nenhum",
            respostas: linhas.join("\n"),
            origem: [utm.utm_source, utm.utm_medium, utm.utm_campaign].filter(Boolean).join(" / ") || "direto"
          })
        });
        avisado = r.ok;
      } catch (e) { avisado = false; }
    }

    btn.disabled = false; btn.textContent = t("enviar");
    if (!salvoSb && !avisado) { err.textContent = t("falha"); return; }
    okEspanhol = c.q3 === "es";
    store.del(); fase = "ok"; A = {}; hist = []; render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.fbq) fbq("track", "Lead", { content_name: "Orçamento imposto de renda" });
    if (window.gtag) gtag("event", "tax_quote_submit", { alertas: alertas.length });
  }

  render();
  new MutationObserver(() => render()).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
})();
