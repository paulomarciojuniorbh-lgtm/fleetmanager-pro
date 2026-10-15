(function () {
  "use strict";
  const API = "https://ryhyvzwqtktaaonznizn.supabase.co/rest/v1/rpc/";
  const KEY = "sb_publishable_Ji31DC1ihqZTR7gmLeYTLw_GHgBjWN0";
  const DEMO = "DEMO-2026";
  const $ = id => document.getElementById(id);
  const raiz = $("raiz");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const LS = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) { /* */ } } };
  const R$ = v => (+v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const R0 = v => (+v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const km = v => v == null || v === "" ? "–" : (+v).toLocaleString("pt-BR") + " km";
  const dt = s => { if (!s) return "–"; const [y, m, d] = String(s).slice(0, 10).split("-"); return `${d}/${m}/${y}`; };
  const dtc = s => { if (!s) return "–"; const [, m, d] = String(s).slice(0, 10).split("-"); return `${d}/${m}`; };
  const toD = s => new Date(String(s).slice(0, 10) + "T12:00:00");
  const isoD = d => d.toISOString().slice(0, 10);
  const dias = (a, b) => Math.round((toD(a) - toD(b)) / 864e5);
  const addD = (s, n) => { const d = toD(s); d.setDate(d.getDate() + n); return isoD(d); };
  const PAGA_EM = ["aos domingos", "às segundas", "às terças", "às quartas", "às quintas", "às sextas", "aos sábados"];
  const DIAS_SEM = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const CAT = { combustivel: "Combustível", manutencao: "Manutenção", pneus: "Pneus", seguro: "Seguro", documentacao: "IPVA e documentos", multa: "Multa", lavagem: "Lavagem", rastreador: "Rastreador", parcela: "Parcela do carro", outros: "Outros" };
  const STATUS = { ativo: ["Rodando", "ok"], oficina: ["Na oficina", "warn"], parado: ["Parado", ""], vendido: ["Vendido", ""] };
  const ICON = {
    inicio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
    carros: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="16" r="1.2"/><circle cx="16.5" cy="16" r="1.2"/></svg>',
    motoristas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    cobrancas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></svg>',
    mais: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>'
  };

  let codigo = null, D = null, aba = "inicio", sub = null, mesRef = null, filtroCob = "aberto";

  // ---------- API ----------
  async function rpc(fn, body) {
    const r = await fetch(API + fn, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const t = await r.text();
    if (!r.ok) { let m = "Erro " + r.status; try { m = JSON.parse(t).message || m; } catch (_) { /* */ } throw new Error(m); }
    return t ? JSON.parse(t) : null;
  }
  async function carregar() { D = await rpc("frota_abrir", { cod: codigo }); if (!mesRef) mesRef = D.hoje.slice(0, 7); }
  async function salvar(tabela, dado, msg) {
    try { await rpc("frota_salvar", { cod: codigo, tabela, dado }); await carregar(); fecharFolha(); render(); toast(msg || "Salvo"); }
    catch (e) { toast("Não salvou: " + e.message); }
  }
  async function apagar(tabela, id, msg) {
    try { await rpc("frota_apagar", { cod: codigo, tabela, rid: id }); await carregar(); fecharFolha(); render(); toast(msg || "Apagado"); }
    catch (e) { toast("Não apagou: " + e.message); }
  }
  function toast(m) { let t = $("toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); } t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 2600); }

  // ---------- Pix copia e cola (padrão do Banco Central) ----------
  const semAc = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]/g, "").toUpperCase().trim();
  function crc16(s) { let c = 0xFFFF; for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; } return c.toString(16).toUpperCase().padStart(4, "0"); }
  const tlv = (id, v) => id + String(v.length).padStart(2, "0") + v;
  function pix(valor) {
    const f = D.frota; if (!f.pix_chave) return null;
    let chave = f.pix_chave.trim();
    if (/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(chave)) chave = "+55" + chave.replace(/\D/g, "");
    else if (/^[\d.\-\/]+$/.test(chave)) chave = chave.replace(/\D/g, "");
    const p = tlv("00", "01") + tlv("26", tlv("00", "br.gov.bcb.pix") + tlv("01", chave)) + tlv("52", "0000") + tlv("53", "986") +
      (valor > 0 ? tlv("54", (+valor).toFixed(2)) : "") + tlv("58", "BR") + tlv("59", semAc(f.pix_nome || f.dono || f.nome).slice(0, 25) || "FROTA") +
      tlv("60", semAc(f.pix_cidade || "BRASIL").slice(0, 15)) + tlv("62", tlv("05", "***")) + "6304";
    return p + crc16(p);
  }

  // ---------- cálculos ----------
  const veic = id => D.veiculos.find(v => v.id === id);
  const mot = id => D.motoristas.find(m => m.id === id);
  const ofi = id => (D.oficinas || []).find(o => o.id === id);
  const optOficinas = sel => `<option value="">Nenhuma</option>` + (D.oficinas || []).map(o => `<option value="${o.id}" ${sel === o.id ? "selected" : ""}>${esc(o.nome)}</option>`).join("");
  const estrelas = n => n ? "★".repeat(n) + "☆".repeat(5 - n) : "";
  const motDoVeic = id => D.motoristas.find(m => m.ativo && m.veiculo_id === id);
  const aberta = c => !c.pago_em;
  function situacaoCob(c) {
    if (c.pago_em) return ["Paga " + dtc(c.pago_em), "ok"];
    const d = dias(D.hoje, c.vencimento);
    if (d > 0) return [`Atrasada ${d} dia${d > 1 ? "s" : ""}`, "crit"];
    if (d === 0) return ["Vence hoje", "warn"];
    return ["Vence " + dtc(c.vencimento), ""];
  }
  const doMes = (data, ym) => data && String(data).slice(0, 7) === ym;
  function manutStatus(m) {
    const v = veic(m.veiculo_id); const out = { kmRest: null, diasRest: null, nivel: "ok", txt: "Em dia" };
    if (m.intervalo_km && m.ultima_km != null && v && v.km_atual != null) out.kmRest = m.ultima_km + m.intervalo_km - v.km_atual;
    if (m.intervalo_dias && m.ultima_data) out.diasRest = dias(addD(m.ultima_data, m.intervalo_dias), D.hoje);
    const venc = (out.kmRest != null && out.kmRest <= 0) || (out.diasRest != null && out.diasRest <= 0);
    const perto = (out.kmRest != null && out.kmRest <= 1000) || (out.diasRest != null && out.diasRest <= 15);
    if (venc) { out.nivel = "crit"; out.txt = "Vencida" + (out.kmRest != null && out.kmRest <= 0 ? ` (passou ${km(-out.kmRest)})` : out.diasRest != null ? ` há ${-out.diasRest} dias` : ""); }
    else if (perto) { out.nivel = "warn"; out.txt = "Faltam " + [out.kmRest != null ? km(out.kmRest) : null, out.diasRest != null ? out.diasRest + " dias" : null].filter(Boolean).join(" ou "); }
    else out.txt = "Faltam " + [out.kmRest != null ? km(out.kmRest) : null, out.diasRest != null ? out.diasRest + " dias" : null].filter(Boolean).join(" ou ");
    if (!m.ultima_data && m.ultima_km == null) { out.nivel = "warn"; out.txt = "Informe quando foi feita a última"; }
    return out;
  }
  function alertas() {
    const a = [];
    const abertas = D.cobrancas.filter(c => aberta(c) && c.vencimento <= D.hoje);
    const porMot = {};
    abertas.forEach(c => { (porMot[c.motorista_id] ||= []).push(c); });
    Object.entries(porMot).forEach(([mid, cs]) => {
      const m = mot(mid); if (!m) return;
      const tot = cs.reduce((s, c) => s + (+c.valor || 0), 0), maisVelha = cs.reduce((x, c) => c.vencimento < x ? c.vencimento : x, cs[0].vencimento);
      const d = dias(D.hoje, maisVelha);
      a.push({ nivel: d > 0 ? "crit" : "warn", peso: d > 0 ? 100 + d : 50, tit: `${m.nome}: ${R$(tot)} em aberto`, txt: d > 0 ? `${cs.length} semana${cs.length > 1 ? "s" : ""} · a mais antiga venceu há ${d} dia${d > 1 ? "s" : ""}` : "Vence hoje", acao: { tipo: "cobrar", id: mid } });
    });
    D.manutencoes.forEach(m => {
      const s = manutStatus(m), v = veic(m.veiculo_id); if (!v || s.nivel === "ok" || v.status === "vendido") return;
      a.push({ nivel: s.nivel, peso: s.nivel === "crit" ? 80 : 30, tit: `${m.item} · ${v.placa}`, txt: s.txt, acao: { tipo: "manut", id: m.id } });
    });
    D.vencimentos.filter(x => !x.pago).forEach(x => {
      const d = dias(x.vencimento, D.hoje); if (d > 30) return;
      const v = veic(x.veiculo_id), m = mot(x.motorista_id);
      a.push({ nivel: d < 0 ? "crit" : d <= 10 ? "warn" : "", peso: d < 0 ? 90 : 40 - d, tit: `${x.tipo}${v ? " · " + v.placa : m ? " · " + m.nome : ""}${x.valor ? " · " + R$(x.valor) : ""}`, txt: d < 0 ? `Venceu há ${-d} dia${d < -1 ? "s" : ""}` : d === 0 ? "Vence hoje" : `Vence em ${d} dia${d > 1 ? "s" : ""} (${dt(x.vencimento)})`, acao: { tipo: "venc", id: x.id } });
    });
    D.motoristas.filter(m => m.ativo && m.cnh_validade).forEach(m => {
      const d = dias(m.cnh_validade, D.hoje); if (d > 45) return;
      a.push({ nivel: d < 0 ? "crit" : "warn", peso: d < 0 ? 85 : 20, tit: `CNH de ${m.nome}`, txt: d < 0 ? `Vencida há ${-d} dias` : `Vence em ${d} dias (${dt(m.cnh_validade)})`, acao: { tipo: "mot", id: m.id } });
    });
    D.despesas.filter(x => x.categoria === "multa" && x.repassar && x.motorista_id).forEach(x => {
      const jaCob = D.cobrancas.some(c => (c.obs || "").includes(x.id.slice(0, 8)));
      if (!jaCob) a.push({ nivel: "warn", peso: 25, tit: `Multa para repassar: ${mot(x.motorista_id)?.nome || ""}`, txt: `${x.descricao || "Multa"} · ${R$(x.valor)}`, acao: { tipo: "desp", id: x.id } });
    });
    return a.sort((x, y) => y.peso - x.peso);
  }
  function resumoMes(ym) {
    const rec = D.cobrancas.filter(c => doMes(c.pago_em, ym)).reduce((s, c) => s + (+c.valor_pago || +c.valor || 0), 0);
    const desp = D.despesas.filter(x => doMes(x.data, ym)).reduce((s, x) => s + (+x.valor || 0), 0);
    const atraso = D.cobrancas.filter(c => aberta(c) && c.vencimento < D.hoje).reduce((s, c) => s + (+c.valor || 0), 0);
    const previsto = D.cobrancas.filter(c => doMes(c.vencimento, ym)).reduce((s, c) => s + (+c.valor || 0), 0);
    return { rec, desp, lucro: rec - desp, atraso, previsto };
  }
  function porCarro(ym) {
    const semCarro = D.despesas.filter(x => doMes(x.data, ym) && !x.veiculo_id).reduce((s, x) => s + (+x.valor || 0), 0);
    const ativos = D.veiculos.filter(v => v.status !== "vendido");
    const rateio = ativos.length ? semCarro / ativos.length : 0;
    return ativos.map(v => {
      const rec = D.cobrancas.filter(c => c.veiculo_id === v.id && doMes(c.pago_em, ym)).reduce((s, c) => s + (+c.valor_pago || +c.valor || 0), 0);
      const desp = D.despesas.filter(x => x.veiculo_id === v.id && doMes(x.data, ym)).reduce((s, x) => s + (+x.valor || 0), 0) + rateio;
      return { v, rec, desp, lucro: rec - desp };
    }).sort((a, b) => b.lucro - a.lucro);
  }
  const nomeMes = ym => { const [y, m] = ym.split("-"); const t = new Date(+y, +m - 1, 1).toLocaleDateString("pt-BR", { month: "long" }); return t[0].toUpperCase() + t.slice(1) + " " + y; };
  const mudaMes = (ym, n) => { const [y, m] = ym.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };

  // ---------- entrada ----------
  function telaEntrada(erro) {
    raiz.innerHTML = `<div class="entrada"><div class="box">
      <div class="marca"><i>F</i><b>FleetManager</b></div>
      <div><h1>Sua frota no bolso</h1><p>Carros, motoristas, aluguel semanal com Pix, despesas, manutenção e vencimentos num lugar só.</p></div>
      <form id="fEntrar" class="secao" autocomplete="off">
        <div class="campo"><label for="eCod">Código de acesso da frota</label><input id="eCod" placeholder="Ex.: A1B2-C3D4" autocapitalize="characters" required></div>
        <button class="btn pri cheio" type="submit">Entrar</button>
        <p class="erro" id="eErro">${esc(erro || "")}</p>
      </form>
      <button class="btn cheio" id="eDemo" type="button">Ver a frota de exemplo</button>
      <div class="ou">ou</div>
      <form id="fCriar" class="secao" autocomplete="off">
        <div class="campo"><label for="eNome">Nome da nova frota</label><input id="eNome" placeholder="Ex.: Frota do João"></div>
        <button class="btn cheio" type="submit">Criar frota nova</button>
      </form>
    </div></div>`;
    $("fEntrar").onsubmit = e => { e.preventDefault(); entrar($("eCod").value); };
    $("eDemo").onclick = () => entrar(DEMO);
    $("fCriar").onsubmit = async e => {
      e.preventDefault();
      try { const c = await rpc("frota_criar", { nome: $("eNome").value }); await entrar(c); toast("Frota criada. Guarde o código: " + c); }
      catch (err) { $("eErro").textContent = "Não deu para criar: " + err.message; }
    };
  }
  async function entrar(c) {
    c = String(c || "").trim().toUpperCase(); if (!c) return;
    raiz.innerHTML = `<div class="entrada"><p>Abrindo a frota…</p></div>`;
    try { codigo = c; mesRef = null; await carregar(); LS.set("fm_codigo", c); aba = LS.get("fm_aba") || "inicio"; sub = null; render(); }
    catch (e) { codigo = null; LS.set("fm_codigo", null); telaEntrada(e.message.includes("não encontrado") ? "Código não encontrado. Confira e tente de novo." : "Não consegui abrir: " + e.message); }
  }

  // ---------- estrutura ----------
  function render() {
    const nAtraso = new Set(D.cobrancas.filter(c => aberta(c) && c.vencimento < D.hoje).map(c => c.motorista_id)).size;
    const abas = [["inicio", "Início"], ["carros", "Carros"], ["motoristas", "Motoristas"], ["cobrancas", "Cobranças"], ["mais", "Mais"]];
    raiz.innerHTML = `<div class="app">
      <header class="topo"><div class="in"><div class="marca"><i>F</i><div><b>${esc(D.frota.nome)}</b><small>FleetManager</small></div></div>
        <button class="btn peq" id="bSair" type="button">Sair</button></div></header>
      <nav class="abas" aria-label="Seções">${abas.map(([k, l]) => `<button type="button" data-aba="${k}" ${aba === k ? 'aria-current="page"' : ""}>${ICON[k]}<span>${l}</span>${k === "cobrancas" && nAtraso ? `<span class="bolha">${nAtraso}</span>` : ""}</button>`).join("")}</nav>
      <main id="conteudo"></main></div>`;
    $("bSair").onclick = () => { LS.set("fm_codigo", null); codigo = null; D = null; telaEntrada(); };
    raiz.querySelector(".abas").onclick = e => { const b = e.target.closest("[data-aba]"); if (!b) return; aba = b.dataset.aba; sub = null; LS.set("fm_aba", aba); render(); window.scrollTo(0, 0); };
    const c = $("conteudo");
    const demo = D.frota.nome === "Frota de exemplo" ? `<div class="aviso-demo">Esta é uma frota de exemplo com dados inventados. Pode mexer à vontade.</div>` : "";
    const telas = { inicio: telaInicio, carros: telaCarros, motoristas: telaMotoristas, cobrancas: telaCobrancas, mais: telaMais };
    c.innerHTML = demo + (sub ? SUBTELAS[sub]() : telas[aba]());
    ligar(c);
  }

  // ---------- início ----------
  function telaInicio() {
    const r = resumoMes(mesRef), al = alertas(), pc = porCarro(mesRef);
    const max = Math.max(1, ...pc.map(x => Math.abs(x.lucro)));
    const ativos = D.veiculos.filter(v => v.status === "ativo").length, oficina = D.veiculos.filter(v => v.status === "oficina").length;
    if (!D.veiculos.length) return `<div class="cab"><div><h2>Bem-vindo</h2><p>Comece cadastrando os carros e os motoristas.</p></div></div>
      <div class="secao"><button class="btn pri" data-novo="veiculo" type="button">Cadastrar o primeiro carro</button>
      <button class="btn" data-ir="config" type="button">Configurar chave Pix</button></div>`;
    return `<div class="cab"><div><h2>Resumo</h2><p>${ativos} rodando${oficina ? ` · ${oficina} na oficina` : ""} · ${D.motoristas.filter(m => m.ativo).length} motoristas</p></div>
      <div class="mes"><button type="button" data-mes="-1" aria-label="Mês anterior">‹</button><span>${nomeMes(mesRef)}</span><button type="button" data-mes="1" aria-label="Próximo mês">›</button></div></div>
      <div class="kpis">
        <div class="kpi destaque"><span class="v">${R0(r.lucro)}</span><span class="l">lucro no mês (recebido menos despesas)</span></div>
        <div class="kpi"><span class="v">${R0(r.rec)}</span><span class="l">recebido de ${R0(r.previsto)} previsto</span></div>
        <div class="kpi"><span class="v">${R0(r.desp)}</span><span class="l">despesas no mês</span></div>
        <div class="kpi ${r.atraso > 0 ? "ruim" : ""}"><span class="v">${R0(r.atraso)}</span><span class="l">em atraso hoje</span></div>
      </div>
      <section class="secao"><h3>O que precisa de atenção</h3>
        ${al.length ? `<div class="lista">${al.slice(0, 12).map(x => `<button type="button" class="item clicavel alerta ${x.nivel}" data-acao="${x.acao.tipo}" data-id="${x.acao.id}">
          <div class="t"><b>${esc(x.tit)}</b>${x.nivel ? `<span class="chip ${x.nivel}">${x.nivel === "crit" ? "Urgente" : "Atenção"}</span>` : ""}</div><div class="meta">${esc(x.txt)}</div></button>`).join("")}</div>`
        : `<div class="vazio">Tudo em dia. Nenhuma cobrança atrasada, manutenção ou vencimento perto.</div>`}
      </section>
      <section class="secao"><h3>Lucro por carro em ${nomeMes(mesRef).split(" ")[0].toLowerCase()}</h3>
        <div class="item barras">${pc.map(x => `<div class="barra"><span class="placa">${esc(x.v.placa || "–")}</span>
          <div class="trilho" title="Recebido ${R$(x.rec)} · despesas ${R$(x.desp)}"><i class="${x.lucro >= 0 ? "pos" : "neg"}" style="width:${(Math.abs(x.lucro) / max * 100).toFixed(1)}%"></i></div>
          <span class="v" style="color:${x.lucro < 0 ? "var(--crit)" : "inherit"}">${R0(x.lucro)}</span></div>`).join("")}
          <p class="meta" style="margin:0;font-size:12.5px;color:var(--muted)">Despesas sem carro definido (seguro da frota, por exemplo) são divididas igualmente entre os carros.</p></div>
      </section>`;
  }

  // ---------- carros ----------
  function telaCarros() {
    return `<div class="cab"><div><h2>Carros</h2><p>${D.veiculos.length} cadastrado${D.veiculos.length === 1 ? "" : "s"}</p></div></div>
      ${D.veiculos.length ? `<div class="lista">${D.veiculos.map(v => {
        const m = motDoVeic(v.id), st = STATUS[v.status] || [v.status, ""];
        const man = D.manutencoes.filter(x => x.veiculo_id === v.id).map(manutStatus);
        const pior = man.some(x => x.nivel === "crit") ? ["Manutenção vencida", "crit"] : man.some(x => x.nivel === "warn") ? ["Manutenção perto", "warn"] : null;
        return `<button type="button" class="item clicavel" data-veic="${v.id}">
          <div class="t"><div><span class="placa">${esc(v.placa || "sem placa")}</span> <b>${esc(v.modelo || "")}</b></div><span class="chip ${st[1]}">${st[0]}</span></div>
          <div class="meta"><span>${v.ano || ""} ${esc(v.cor || "")}</span><span>${km(v.km_atual)}</span><span>${m ? "Com " + esc(m.nome) : "Sem motorista"}</span>${v.status === "oficina" && ofi(v.oficina_id) ? `<span>Em ${esc(ofi(v.oficina_id).nome)}</span>` : ""}</div>
          ${pior ? `<div><span class="chip ${pior[1]}">${pior[0]}</span></div>` : ""}</button>`;
      }).join("")}</div>` : `<div class="vazio">Nenhum carro ainda.</div>`}
      <button class="fab" type="button" data-novo="veiculo">+ Carro</button>`;
  }
  function formVeiculo(v) {
    v = v || { status: "ativo" };
    abrirFolha(v.id ? "Editar carro" : "Novo carro", `<form id="fV" class="secao">
      <div class="grade2"><div class="campo"><label for="vPl">Placa</label><input id="vPl" value="${esc(v.placa)}" autocapitalize="characters" required></div>
      <div class="campo"><label for="vAno">Ano</label><input id="vAno" type="number" inputmode="numeric" value="${esc(v.ano)}"></div></div>
      <div class="campo"><label for="vMod">Modelo</label><input id="vMod" value="${esc(v.modelo)}" placeholder="Ex.: Onix 1.0" required></div>
      <div class="grade2"><div class="campo"><label for="vCor">Cor</label><input id="vCor" value="${esc(v.cor)}"></div>
      <div class="campo"><label for="vKm">Km atual</label><input id="vKm" type="number" inputmode="numeric" value="${esc(v.km_atual)}"></div></div>
      <div class="grade2"><div class="campo"><label for="vSt">Situação</label><select id="vSt">${Object.entries(STATUS).map(([k, [l]]) => `<option value="${k}" ${v.status === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="campo"><label for="vVal">Valor de compra</label><input id="vVal" type="number" inputmode="decimal" step="0.01" value="${esc(v.valor_compra)}"></div></div>
      <div class="campo" id="vOfBox" ${v.status === "oficina" ? "" : "hidden"}><label for="vOf">Em qual oficina</label><select id="vOf">${optOficinas(v.oficina_id)}</select></div>
      <div class="campo"><label for="vRen">Renavam</label><input id="vRen" inputmode="numeric" value="${esc(v.renavam)}"></div>
      <div class="campo"><label for="vObs">Observações</label><textarea id="vObs">${esc(v.obs)}</textarea></div>
      <button class="btn pri cheio" type="submit">Salvar carro</button>
      ${v.id ? `<button class="btn perigo cheio" type="button" id="vDel">Apagar carro</button>` : ""}</form>`);
    $("vSt").onchange = () => { $("vOfBox").hidden = $("vSt").value !== "oficina"; };
    $("fV").onsubmit = e => { e.preventDefault(); salvar("frota_veiculos", { id: v.id, oficina_id: $("vSt").value === "oficina" ? ($("vOf").value || null) : null, placa: $("vPl").value.trim().toUpperCase(), ano: num($("vAno").value), modelo: $("vMod").value.trim(), cor: $("vCor").value.trim(), km_atual: num($("vKm").value), status: $("vSt").value, valor_compra: num($("vVal").value), renavam: $("vRen").value.trim() || null, obs: $("vObs").value.trim() || null }, "Carro salvo"); };
    if (v.id) $("vDel").onclick = () => confirmar("Apagar este carro? As despesas e cobranças antigas continuam no histórico.", () => apagar("frota_veiculos", v.id, "Carro apagado"));
  }
  function detalheVeiculo(id) {
    const v = veic(id); if (!v) return;
    const m = motDoVeic(id), man = D.manutencoes.filter(x => x.veiculo_id === id), venc = D.vencimentos.filter(x => x.veiculo_id === id && !x.pago);
    const desp = D.despesas.filter(x => x.veiculo_id === id).slice(0, 8);
    const ano = D.hoje.slice(0, 4);
    const recAno = D.cobrancas.filter(c => c.veiculo_id === id && String(c.pago_em || "").startsWith(ano)).reduce((s, c) => s + (+c.valor_pago || +c.valor || 0), 0);
    const despAno = D.despesas.filter(x => x.veiculo_id === id && String(x.data || "").startsWith(ano)).reduce((s, x) => s + (+x.valor || 0), 0);
    abrirFolha(`${v.placa} · ${v.modelo || ""}`, `
      <div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="kpi"><span class="v">${R0(recAno)}</span><span class="l">recebido em ${ano}</span></div>
        <div class="kpi"><span class="v">${R0(despAno)}</span><span class="l">gasto em ${ano}</span></div><div class="kpi"><span class="v">${R0(recAno - despAno)}</span><span class="l">resultado em ${ano}</span></div></div>
      <div class="item"><div class="meta"><span>${km(v.km_atual)}</span><span>${m ? "Com " + esc(m.nome) : "Sem motorista"}</span><span>${(STATUS[v.status] || [v.status])[0]}${v.status === "oficina" && ofi(v.oficina_id) ? " em " + esc(ofi(v.oficina_id).nome) : ""}</span></div>
        ${v.status === "oficina" && ofi(v.oficina_id) && ofi(v.oficina_id).telefone ? `<div class="acoes"><a class="btn zap peq" href="${zapOficina(ofi(v.oficina_id), v)}" target="_blank" rel="noopener">Perguntar à oficina</a></div>` : ""}
        <form id="fKm" class="linha"><input id="kmNovo" type="number" inputmode="numeric" placeholder="Km de hoje" style="flex:1;min-width:0;border:1px solid var(--line);border-radius:10px;padding:0 12px;min-height:44px;background:var(--surface)" aria-label="Km de hoje">
        <button class="btn pri" type="submit">Atualizar km</button></form></div>
      <div class="secao"><h3>Manutenção preventiva</h3>${man.length ? `<div class="lista">${man.map(x => { const s = manutStatus(x); return `<button type="button" class="item clicavel" data-acao="manut" data-id="${x.id}"><div class="t"><b>${esc(x.item)}</b><span class="chip ${s.nivel}">${esc(s.txt)}</span></div><div class="meta">Última: ${dt(x.ultima_data)} · ${km(x.ultima_km)}</div></button>`; }).join("")}</div>` : `<div class="vazio">Sem plano de manutenção.</div>`}
        <div class="linha"><button class="btn peq" type="button" data-plano="${id}">Usar plano padrão</button><button class="btn peq" type="button" data-novamanut="${id}">+ Item</button></div></div>
      ${venc.length ? `<div class="secao"><h3>Vencimentos</h3><div class="lista">${venc.map(x => `<button type="button" class="item clicavel" data-acao="venc" data-id="${x.id}"><div class="t"><b>${esc(x.tipo)}</b><span>${dt(x.vencimento)}</span></div></button>`).join("")}</div></div>` : ""}
      <div class="secao"><h3>Últimas despesas</h3>${desp.length ? `<div class="lista">${desp.map(x => `<div class="item"><div class="t"><b>${esc(CAT[x.categoria] || x.categoria)}</b><span class="valor">${R$(x.valor)}</span></div><div class="meta"><span>${dt(x.data)}</span><span>${esc(x.descricao || "")}</span></div></div>`).join("")}</div>` : `<div class="vazio">Nenhuma despesa.</div>`}
        <button class="btn peq" type="button" data-novadesp="${id}">+ Despesa deste carro</button></div>
      <button class="btn cheio" type="button" id="dvEdit">Editar dados do carro</button>`);
    $("fKm").onsubmit = e => { e.preventDefault(); const k = num($("kmNovo").value); if (k == null) return; if (v.km_atual && k < v.km_atual) return toast("O km novo é menor que o atual."); salvar("frota_veiculos", { id, km_atual: k }, "Km atualizado"); };
    $("dvEdit").onclick = () => formVeiculo(v);
  }

  // ---------- motoristas ----------
  function devendo(mid) { return D.cobrancas.filter(c => c.motorista_id === mid && aberta(c) && c.vencimento <= D.hoje); }
  function telaMotoristas() {
    const ativos = D.motoristas.filter(m => m.ativo), inat = D.motoristas.filter(m => !m.ativo);
    const card = m => { const dv = devendo(m.id), tot = dv.reduce((s, c) => s + (+c.valor || 0), 0), v = veic(m.veiculo_id);
      return `<button type="button" class="item clicavel" data-mot="${m.id}"><div class="t"><b>${esc(m.nome)}</b>${!m.ativo ? '<span class="chip">Inativo</span>' : dv.length ? `<span class="chip crit">Deve ${R0(tot)}</span>` : '<span class="chip ok">Em dia</span>'}</div>
        <div class="meta">${v ? `<span class="placa">${esc(v.placa)}</span>` : "<span>Sem carro</span>"}<span>${m.valor_semanal ? R0(m.valor_semanal) + " por semana" : ""}</span><span>${m.dia_cobranca != null ? "Paga " + PAGA_EM[m.dia_cobranca] : ""}</span></div></button>`; };
    return `<div class="cab"><div><h2>Motoristas</h2><p>${ativos.length} ativo${ativos.length === 1 ? "" : "s"}</p></div></div>
      ${ativos.length ? `<div class="lista">${ativos.map(card).join("")}</div>` : `<div class="vazio">Nenhum motorista ainda.</div>`}
      ${inat.length ? `<div class="secao"><h3>Inativos</h3><div class="lista">${inat.map(card).join("")}</div></div>` : ""}
      <button class="fab" type="button" data-novo="motorista">+ Motorista</button>`;
  }
  function formMotorista(m) {
    m = m || { ativo: true, dia_cobranca: 1, inicio: D.hoje };
    const livres = D.veiculos.filter(v => v.status !== "vendido" && (!motDoVeic(v.id) || motDoVeic(v.id).id === m.id));
    abrirFolha(m.id ? "Editar motorista" : "Novo motorista", `<form id="fM" class="secao">
      <div class="campo"><label for="mNome">Nome</label><input id="mNome" value="${esc(m.nome)}" required></div>
      <div class="campo"><label for="mTel">WhatsApp</label><input id="mTel" inputmode="tel" value="${esc(m.telefone)}" placeholder="(31) 99999-9999"></div>
      <div class="campo"><label for="mVeic">Carro</label><select id="mVeic"><option value="">Sem carro</option>${livres.map(v => `<option value="${v.id}" ${m.veiculo_id === v.id ? "selected" : ""}>${esc(v.placa)} · ${esc(v.modelo || "")}</option>`).join("")}</select></div>
      <div class="grade2"><div class="campo"><label for="mVal">Aluguel por semana</label><input id="mVal" type="number" inputmode="decimal" step="0.01" value="${esc(m.valor_semanal)}"></div>
      <div class="campo"><label for="mDia">Dia de pagar</label><select id="mDia">${DIAS_SEM.map((d, i) => `<option value="${i}" ${+m.dia_cobranca === i ? "selected" : ""}>${d}</option>`).join("")}</select></div></div>
      <div class="grade2"><div class="campo"><label for="mIni">Começou em</label><input id="mIni" type="date" value="${esc(m.inicio)}"></div>
      <div class="campo"><label for="mCnh">CNH vale até</label><input id="mCnh" type="date" value="${esc(m.cnh_validade)}"></div></div>
      <label class="check"><input type="checkbox" id="mAtivo" ${m.ativo ? "checked" : ""}> Motorista ativo (gera cobrança toda semana)</label>
      <div class="campo"><label for="mObs">Observações</label><textarea id="mObs">${esc(m.obs)}</textarea></div>
      <p class="campo"><span class="ajuda">As cobranças semanais são criadas sozinhas a partir da data de início, sempre no dia de pagar escolhido.</span></p>
      <button class="btn pri cheio" type="submit">Salvar motorista</button>
      ${m.id ? `<button class="btn perigo cheio" type="button" id="mDel">Apagar motorista</button>` : ""}</form>`);
    $("fM").onsubmit = e => { e.preventDefault(); salvar("frota_motoristas", { id: m.id, nome: $("mNome").value.trim(), telefone: $("mTel").value.replace(/\D/g, "") || null, veiculo_id: $("mVeic").value || null, valor_semanal: num($("mVal").value), dia_cobranca: +$("mDia").value, inicio: $("mIni").value || D.hoje, cnh_validade: $("mCnh").value || null, ativo: $("mAtivo").checked, obs: $("mObs").value.trim() || null }, "Motorista salvo"); };
    if (m.id) $("mDel").onclick = () => confirmar("Apagar este motorista? As cobranças futuras dele somem; as já pagas ficam no histórico.", () => apagar("frota_motoristas", m.id, "Motorista apagado"));
  }
  function detalheMotorista(id) {
    const m = mot(id); if (!m) return;
    const v = veic(m.veiculo_id), cs = D.cobrancas.filter(c => c.motorista_id === id).slice(0, 12), dv = devendo(id);
    abrirFolha(m.nome, `
      <div class="item"><div class="meta">${v ? `<span class="placa">${esc(v.placa)}</span><span>${esc(v.modelo || "")}</span>` : "<span>Sem carro</span>"}<span>${m.valor_semanal ? R$(m.valor_semanal) + " por semana" : ""}</span>${m.telefone ? `<span>${esc(fone(m.telefone))}</span>` : ""}</div>
        ${dv.length ? `<div class="t"><b style="color:var(--crit)">Em aberto: ${R$(dv.reduce((s, c) => s + (+c.valor || 0), 0))}</b></div>` : `<span class="chip ok">Em dia</span>`}
        <div class="acoes">${m.telefone ? `<a class="btn zap peq" href="${linkZap(m, dv)}" target="_blank" rel="noopener">${dv.length ? "Cobrar no WhatsApp" : "Mandar mensagem"}</a>` : ""}<button class="btn peq" type="button" id="dmEdit">Editar</button></div></div>
      <div class="secao"><h3>Cobranças</h3>${cs.length ? `<div class="lista">${cs.map(cardCob).join("")}</div>` : `<div class="vazio">Nenhuma cobrança ainda.</div>`}
      <button class="btn peq" type="button" data-avulsa="${id}">+ Cobrança avulsa (multa, dano, caução)</button></div>`);
    $("dmEdit").onclick = () => formMotorista(m);
  }
  const fone = t => { const d = String(t || "").replace(/\D/g, ""); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : t; };
  function linkZap(m, cs) {
    let tel = String(m.telefone || "").replace(/\D/g, ""); if (tel.length <= 11) tel = "55" + tel;
    const v = veic(m.veiculo_id);
    let txt;
    if (cs && cs.length) {
      const tot = cs.reduce((s, c) => s + (+c.valor || 0), 0);
      const p = pix(tot);
      txt = `Olá, ${m.nome.split(" ")[0]}! Tudo bem?\n\nLembrete do aluguel${v ? " do carro " + v.placa : ""}:\n` +
        cs.map(c => `• ${c.obs ? c.obs.replace(/\s*\[[^\]]*\]/, "") : "Semana"} (venc. ${dt(c.vencimento)}): ${R$(c.valor)}`).join("\n") +
        `\n\nTotal: *${R$(tot)}*` + (p ? `\n\nPix copia e cola:\n${p}` : D.frota.pix_chave ? `\n\nChave Pix: ${D.frota.pix_chave}` : "") + `\n\nQualquer dúvida, me chama. Obrigado!`;
    } else txt = `Olá, ${m.nome.split(" ")[0]}! `;
    return `https://wa.me/${tel}?text=${encodeURIComponent(txt)}`;
  }

  // ---------- cobranças ----------
  function cardCob(c) {
    const m = mot(c.motorista_id), v = veic(c.veiculo_id), s = situacaoCob(c);
    return `<div class="item"><div class="t"><div><b>${esc(m ? m.nome : "Motorista removido")}</b><div class="meta">${v ? `<span class="placa">${esc(v.placa)}</span>` : ""}<span>${esc((c.obs || "Aluguel semanal").replace(/\s*\[[^\]]*\]/, ""))}</span><span>venc. ${dt(c.vencimento)}</span><span class="chip ${s[1]}">${s[0]}</span></div></div><span class="valor">${R$(c.valor_pago || c.valor)}</span></div>
      <div class="acoes">${!c.pago_em ? `<button class="btn pri peq" type="button" data-pagar="${c.id}">Recebi</button>${m && m.telefone ? `<a class="btn zap peq" href="${linkZap(m, [c])}" target="_blank" rel="noopener">Cobrar</a>` : ""}<button class="btn peq" type="button" data-pix="${c.id}">Pix</button>` : `<button class="btn peq" type="button" data-desfaz="${c.id}">Desfazer</button>`}<button class="btn peq" type="button" data-editcob="${c.id}">Editar</button></div></div>`;
  }
  function telaCobrancas() {
    const abertas = D.cobrancas.filter(aberta).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    const vencidas = abertas.filter(c => c.vencimento <= D.hoje), futuras = abertas.filter(c => c.vencimento > D.hoje);
    const pagas = D.cobrancas.filter(c => c.pago_em).sort((a, b) => b.pago_em.localeCompare(a.pago_em)).slice(0, 60);
    const totV = vencidas.reduce((s, c) => s + (+c.valor || 0), 0);
    return `<div class="cab"><div><h2>Cobranças</h2><p>${vencidas.length ? `${R$(totV)} para receber hoje ou atrasado` : "Nada atrasado"}</p></div>
      <div class="seg" role="group" aria-label="Filtro"><button type="button" data-fcob="aberto" aria-pressed="${filtroCob === "aberto"}">Em aberto</button><button type="button" data-fcob="pago" aria-pressed="${filtroCob === "pago"}">Pagas</button></div></div>
      ${!D.frota.pix_chave ? `<div class="aviso-demo">Cadastre sua chave Pix em <button class="btn peq" type="button" data-ir="config">Configurações</button> para a cobrança já ir com o Pix copia e cola.</div>` : ""}
      ${filtroCob === "aberto" ? `
        <section class="secao"><h3>Atrasadas e de hoje</h3>${vencidas.length ? `<div class="lista">${vencidas.map(cardCob).join("")}</div>` : `<div class="vazio">Ninguém devendo.</div>`}</section>
        <section class="secao"><h3>Próximos 7 dias</h3>${futuras.length ? `<div class="lista">${futuras.map(cardCob).join("")}</div>` : `<div class="vazio">Nenhuma cobrança nos próximos dias.</div>`}</section>`
      : `<section class="secao">${pagas.length ? `<div class="lista">${pagas.map(cardCob).join("")}</div>` : `<div class="vazio">Nenhum pagamento registrado ainda.</div>`}</section>`}
      <button class="fab" type="button" data-avulsa="">+ Cobrança</button>`;
  }
  function formPagar(c) {
    const m = mot(c.motorista_id);
    abrirFolha("Registrar pagamento", `<form id="fP" class="secao"><p style="margin:0">${esc(m ? m.nome : "")} · venc. ${dt(c.vencimento)}</p>
      <div class="grade2"><div class="campo"><label for="pVal">Valor recebido</label><input id="pVal" type="number" inputmode="decimal" step="0.01" value="${esc(c.valor)}" required></div>
      <div class="campo"><label for="pDt">Data</label><input id="pDt" type="date" value="${D.hoje}" required></div></div>
      <button class="btn pri cheio" type="submit">Confirmar recebimento</button></form>`);
    $("fP").onsubmit = e => { e.preventDefault(); salvar("frota_cobrancas", { id: c.id, pago_em: $("pDt").value, valor_pago: num($("pVal").value) }, "Pagamento registrado"); };
  }
  function formCobranca(c, mid) {
    c = c || { motorista_id: mid || "", vencimento: D.hoje };
    const ms = D.motoristas.filter(m => m.ativo || m.id === c.motorista_id);
    abrirFolha(c.id ? "Editar cobrança" : "Nova cobrança", `<form id="fC" class="secao">
      <div class="campo"><label for="cMot">Motorista</label><select id="cMot" required><option value="">Escolha</option>${ms.map(m => `<option value="${m.id}" ${c.motorista_id === m.id ? "selected" : ""}>${esc(m.nome)}</option>`).join("")}</select></div>
      <div class="campo"><label for="cObs">Descrição</label><input id="cObs" value="${esc((c.obs || "").replace(/\s*\[[^\]]*\]/, ""))}" placeholder="Ex.: Multa, franquia do seguro, caução"></div>
      <div class="grade2"><div class="campo"><label for="cVal">Valor</label><input id="cVal" type="number" inputmode="decimal" step="0.01" value="${esc(c.valor)}" required></div>
      <div class="campo"><label for="cVen">Vencimento</label><input id="cVen" type="date" value="${esc(c.vencimento)}" required></div></div>
      <button class="btn pri cheio" type="submit">Salvar cobrança</button>
      ${c.id ? `<button class="btn perigo cheio" type="button" id="cDel">Apagar cobrança</button>` : ""}</form>`);
    $("fC").onsubmit = e => { e.preventDefault(); const mm = mot($("cMot").value); const tag = (c.obs || "").match(/\s*\[[^\]]*\]/); salvar("frota_cobrancas", { id: c.id, motorista_id: $("cMot").value, veiculo_id: c.veiculo_id || (mm && mm.veiculo_id) || null, obs: ($("cObs").value.trim() || "") + (tag ? tag[0] : "") || null, valor: num($("cVal").value), vencimento: $("cVen").value }, "Cobrança salva"); };
    if (c.id) $("cDel").onclick = () => confirmar("Apagar esta cobrança?", () => apagar("frota_cobrancas", c.id, "Cobrança apagada"));
  }
  function mostrarPix(c) {
    const p = pix(c.valor);
    if (!p) return toast("Cadastre a chave Pix em Mais › Configurações.");
    abrirFolha("Pix copia e cola", `<p style="margin:0">${R$(c.valor)} · ${esc(mot(c.motorista_id)?.nome || "")}</p><div class="pix" id="pixTxt">${esc(p)}</div>
      <button class="btn pri cheio" type="button" id="pixCp">Copiar código</button><p class="campo"><span class="ajuda">O motorista cola esse código no app do banco, na opção Pix copia e cola. O valor já vem preenchido.</span></p>`);
    $("pixCp").onclick = () => copiar(p, $("pixTxt"));
  }
  function copiar(t, el) {
    try { navigator.clipboard.writeText(t).then(() => toast("Copiado"), () => selecionar(el)); } catch (_) { selecionar(el); }
  }
  function selecionar(el) { const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); toast("Texto selecionado. Toque em copiar."); }

  // ---------- mais ----------
  function telaMais() {
    return `<div class="cab"><div><h2>Mais</h2></div></div><div class="mais">
      <button type="button" data-ir="despesas"><b>Despesas</b><span>Combustível, oficina, seguro, multas</span></button>
      <button type="button" data-ir="manutencao"><b>Manutenção</b><span>Troca de óleo, correia, pneus</span></button>
      <button type="button" data-ir="oficinas"><b>Oficinas</b><span>Contatos, gastos e histórico</span></button>
      <button type="button" data-ir="vencimentos"><b>Vencimentos</b><span>IPVA, licenciamento, seguro</span></button>
      <button type="button" data-ir="config"><b>Configurações</b><span>Nome da frota, chave Pix, código</span></button></div>`;
  }
  const voltar = t => `<button class="btn peq" type="button" data-voltar="1">‹ Voltar</button><div class="cab"><div><h2>${t}</h2></div></div>`;
  const SUBTELAS = {
    despesas() {
      const lista = D.despesas.filter(x => doMes(x.data, mesRef));
      const porCat = {}; lista.forEach(x => porCat[x.categoria] = (porCat[x.categoria] || 0) + (+x.valor || 0));
      const tot = lista.reduce((s, x) => s + (+x.valor || 0), 0);
      return voltar("Despesas") + `<div class="cab"><p>${R$(tot)} em ${nomeMes(mesRef)}</p><div class="mes"><button type="button" data-mes="-1" aria-label="Mês anterior">‹</button><span>${nomeMes(mesRef)}</span><button type="button" data-mes="1" aria-label="Próximo mês">›</button></div></div>
        ${Object.keys(porCat).length ? `<div class="item barras">${Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="barra"><span style="min-width:110px">${esc(CAT[k] || k)}</span><div class="trilho"><i class="neg" style="width:${(v / tot * 100).toFixed(1)}%;background:var(--muted)"></i></div><span class="v">${R0(v)}</span></div>`).join("")}</div>` : ""}
        ${lista.length ? `<div class="lista">${lista.map(x => { const v = veic(x.veiculo_id), m = mot(x.motorista_id); return `<button type="button" class="item clicavel" data-acao="desp" data-id="${x.id}"><div class="t"><b>${esc(CAT[x.categoria] || x.categoria)}</b><span class="valor">${R$(x.valor)}</span></div><div class="meta"><span>${dt(x.data)}</span>${v ? `<span class="placa">${esc(v.placa)}</span>` : "<span>Frota toda</span>"}<span>${esc(x.descricao || "")}</span>${ofi(x.oficina_id) ? `<span>${esc(ofi(x.oficina_id).nome)}</span>` : ""}${x.repassar && m ? `<span class="chip acc">Repassar a ${esc(m.nome)}</span>` : ""}</div></button>`; }).join("")}</div>` : `<div class="vazio">Nenhuma despesa neste mês.</div>`}
        <button class="fab" type="button" data-novadesp="">+ Despesa</button>`;
    },
    manutencao() {
      const itens = D.manutencoes.map(x => ({ x, s: manutStatus(x), v: veic(x.veiculo_id) })).filter(o => o.v).sort((a, b) => ({ crit: 0, warn: 1, ok: 2 }[a.s.nivel] - { crit: 0, warn: 1, ok: 2 }[b.s.nivel]));
      return voltar("Manutenção") + `<p style="margin:0;color:var(--muted)">O aviso usa o km atualizado de cada carro e a data da última troca. Atualize o km dos carros toda semana.</p>
        ${itens.length ? `<div class="lista">${itens.map(o => `<button type="button" class="item clicavel" data-acao="manut" data-id="${o.x.id}"><div class="t"><div><span class="placa">${esc(o.v.placa)}</span> <b>${esc(o.x.item)}</b></div><span class="chip ${o.s.nivel}">${esc(o.s.txt)}</span></div><div class="meta"><span>A cada ${[o.x.intervalo_km ? km(o.x.intervalo_km) : null, o.x.intervalo_dias ? o.x.intervalo_dias + " dias" : null].filter(Boolean).join(" ou ")}</span><span>Última: ${dt(o.x.ultima_data)} · ${km(o.x.ultima_km)}</span></div></button>`).join("")}</div>` : `<div class="vazio">Nenhum item de manutenção. Abra um carro e toque em "Usar plano padrão".</div>`}
        <button class="fab" type="button" data-novamanut="">+ Item</button>`;
    },
    oficinas() {
      const umAno = addD(D.hoje, -365);
      const lista = (D.oficinas || []).map(o => {
        const serv = D.despesas.filter(x => x.oficina_id === o.id);
        const ano = serv.filter(x => x.data >= umAno);
        return { o, gasto: ano.reduce((s, x) => s + (+x.valor || 0), 0), n: ano.length, ultima: serv.reduce((m, x) => x.data > m ? x.data : m, ""), carros: D.veiculos.filter(v => v.status === "oficina" && v.oficina_id === o.id) };
      }).sort((a, b) => b.gasto - a.gasto);
      return voltar("Oficinas") + `<p style="margin:0;color:var(--muted)">Gasto e serviços dos últimos 12 meses, pelas despesas lançadas com a oficina.</p>
        ${lista.length ? `<div class="lista">${lista.map(({ o, gasto, n, ultima, carros }) => `<div class="item">
          <button type="button" class="t" data-ofi="${o.id}" style="all:unset;cursor:pointer;display:flex;justify-content:space-between;gap:10px"><div><b>${esc(o.nome)}</b><div class="meta"><span>${esc(o.especialidade || "")}</span>${o.nota ? `<span style="color:var(--warn)" aria-label="Nota ${o.nota} de 5">${estrelas(o.nota)}</span>` : ""}</div></div><span class="valor">${R0(gasto)}</span></button>
          <div class="meta"><span>${n} serviço${n === 1 ? "" : "s"}</span><span>${ultima ? "Última vez em " + dt(ultima) : "Nenhum serviço lançado"}</span>${carros.map(v => `<span class="chip warn">${esc(v.placa)} lá agora</span>`).join("")}</div>
          <div class="acoes">${o.telefone ? `<a class="btn zap peq" href="${zapOficina(o)}" target="_blank" rel="noopener">WhatsApp</a><a class="btn peq" href="tel:${esc(String(o.telefone).replace(/\D/g, ""))}">Ligar</a>` : ""}${o.endereco ? `<a class="btn peq" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.endereco)}" target="_blank" rel="noopener">Mapa</a>` : ""}<button class="btn peq" type="button" data-ofi="${o.id}">Ver serviços</button></div></div>`).join("")}</div>`
        : `<div class="vazio">Nenhuma oficina cadastrada. Cadastre as que você usa para ter o contato à mão e saber quanto gasta em cada uma.</div>`}
        <button class="fab" type="button" data-novaofi="1">+ Oficina</button>`;
    },
    vencimentos() {
      const abertos = D.vencimentos.filter(x => !x.pago), pagos = D.vencimentos.filter(x => x.pago).slice(-10).reverse();
      const card = x => { const v = veic(x.veiculo_id), m = mot(x.motorista_id), d = dias(x.vencimento, D.hoje); return `<button type="button" class="item clicavel" data-acao="venc" data-id="${x.id}"><div class="t"><b>${esc(x.tipo)}</b><span class="valor">${x.valor ? R$(x.valor) : ""}</span></div><div class="meta">${v ? `<span class="placa">${esc(v.placa)}</span>` : m ? `<span>${esc(m.nome)}</span>` : "<span>Frota toda</span>"}<span>${dt(x.vencimento)}</span>${x.pago ? '<span class="chip ok">Pago</span>' : d < 0 ? `<span class="chip crit">Venceu há ${-d} dias</span>` : d <= 15 ? `<span class="chip warn">Em ${d} dias</span>` : ""}</div></button>`; };
      return voltar("Vencimentos") + (abertos.length ? `<div class="lista">${abertos.map(card).join("")}</div>` : `<div class="vazio">Nenhum vencimento cadastrado.</div>`) +
        (pagos.length ? `<div class="secao"><h3>Pagos</h3><div class="lista">${pagos.map(card).join("")}</div></div>` : "") + `<button class="fab" type="button" data-novovenc="1">+ Vencimento</button>`;
    },
    config() {
      const f = D.frota, link = location.origin + location.pathname + "?c=" + encodeURIComponent(codigo);
      return voltar("Configurações") + `<form id="fCfg" class="secao">
        <div class="campo"><label for="gNome">Nome da frota</label><input id="gNome" value="${esc(f.nome)}"></div>
        <div class="campo"><label for="gDono">Seu nome</label><input id="gDono" value="${esc(f.dono)}"></div>
        <h3 style="font-size:19px">Pix para receber dos motoristas</h3>
        <div class="campo"><label for="gChave">Chave Pix</label><input id="gChave" value="${esc(f.pix_chave)}" placeholder="CPF, CNPJ, e-mail, celular ou chave aleatória"></div>
        <div class="grade2"><div class="campo"><label for="gPN">Nome no Pix</label><input id="gPN" value="${esc(f.pix_nome)}" placeholder="Como aparece no banco"></div>
        <div class="campo"><label for="gPC">Cidade</label><input id="gPC" value="${esc(f.pix_cidade)}"></div></div>
        <button class="btn pri cheio" type="submit">Salvar</button></form>
        <div class="item"><b>Código de acesso: <span class="num" style="font-family:var(--mono)">${esc(codigo)}</span></b>
          <div class="meta">Com esse código qualquer pessoa entra na frota. Guarde com você e não divulgue.</div>
          <div class="pix" id="cfgLink">${esc(link)}</div><button class="btn peq" type="button" id="cfgCp">Copiar link de acesso</button></div>`;
    }
  };

  function formDespesa(x, vid) {
    x = x || { data: D.hoje, categoria: "combustivel", veiculo_id: vid || "" };
    abrirFolha(x.id ? "Editar despesa" : "Nova despesa", `<form id="fD" class="secao">
      <div class="grade2"><div class="campo"><label for="dCat">Tipo</label><select id="dCat">${Object.entries(CAT).map(([k, l]) => `<option value="${k}" ${x.categoria === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="campo"><label for="dVal">Valor</label><input id="dVal" type="number" inputmode="decimal" step="0.01" value="${esc(x.valor)}" required></div></div>
      <div class="grade2"><div class="campo"><label for="dVei">Carro</label><select id="dVei"><option value="">Frota toda</option>${D.veiculos.map(v => `<option value="${v.id}" ${x.veiculo_id === v.id ? "selected" : ""}>${esc(v.placa)}</option>`).join("")}</select></div>
      <div class="campo"><label for="dDt">Data</label><input id="dDt" type="date" value="${esc(x.data)}" required></div></div>
      <div class="campo"><label for="dDesc">Descrição</label><input id="dDesc" value="${esc(x.descricao)}" placeholder="Ex.: Troca de óleo, posto Shell"></div>
      <div class="campo"><label for="dOf">Oficina ou fornecedor (opcional)</label><select id="dOf">${optOficinas(x.oficina_id)}</select></div>
      <div class="campo"><label for="dKm">Km no dia (opcional)</label><input id="dKm" type="number" inputmode="numeric" value="${esc(x.km)}"></div>
      <div id="dMulta" class="secao" ${x.categoria === "multa" ? "" : "hidden"}>
        <div class="campo"><label for="dMot">Motorista responsável</label><select id="dMot"><option value="">Ninguém</option>${D.motoristas.map(m => `<option value="${m.id}" ${x.motorista_id === m.id ? "selected" : ""}>${esc(m.nome)}</option>`).join("")}</select></div>
        <label class="check"><input type="checkbox" id="dRep" ${x.repassar ? "checked" : ""}> Cobrar a multa do motorista</label></div>
      <button class="btn pri cheio" type="submit">Salvar despesa</button>
      ${x.id ? `<button class="btn perigo cheio" type="button" id="dDel">Apagar despesa</button>` : ""}</form>`);
    $("dCat").onchange = () => { $("dMulta").hidden = $("dCat").value !== "multa"; };
    $("dVei").onchange = () => { const m = motDoVeic($("dVei").value); if (m && !$("dMot").value) $("dMot").value = m.id; };
    $("fD").onsubmit = async e => {
      e.preventDefault();
      const multa = $("dCat").value === "multa", rep = multa && $("dRep").checked && $("dMot").value;
      const dado = { id: x.id, categoria: $("dCat").value, valor: num($("dVal").value), veiculo_id: $("dVei").value || null, data: $("dDt").value, descricao: $("dDesc").value.trim() || null, km: num($("dKm").value), oficina_id: $("dOf").value || null, motorista_id: multa ? ($("dMot").value || null) : null, repassar: !!rep };
      try {
        const salvo = await rpc("frota_salvar", { cod: codigo, tabela: "frota_despesas", dado });
        if (rep && !D.cobrancas.some(c => (c.obs || "").includes(salvo.id.slice(0, 8)))) {
          await rpc("frota_salvar", { cod: codigo, tabela: "frota_cobrancas", dado: { motorista_id: dado.motorista_id, veiculo_id: dado.veiculo_id, valor: dado.valor, vencimento: addD(D.hoje, 7), obs: `Multa: ${dado.descricao || "infração"} [${salvo.id.slice(0, 8)}]` } });
        }
        if (dado.km && dado.veiculo_id) { const v = veic(dado.veiculo_id); if (v && (v.km_atual || 0) < dado.km) await rpc("frota_salvar", { cod: codigo, tabela: "frota_veiculos", dado: { id: v.id, km_atual: dado.km } }); }
        await carregar(); fecharFolha(); render(); toast(rep ? "Despesa salva e multa lançada para o motorista" : "Despesa salva");
      } catch (err) { toast("Não salvou: " + err.message); }
    };
    if (x.id) $("dDel").onclick = () => confirmar("Apagar esta despesa?", () => apagar("frota_despesas", x.id, "Despesa apagada"));
  }
  function formManut(x, vid) {
    x = x || { veiculo_id: vid || "", intervalo_km: 10000, intervalo_dias: 180 };
    const v = veic(x.veiculo_id);
    abrirFolha(x.id ? `${x.item}${v ? " · " + v.placa : ""}` : "Novo item de manutenção", `
      ${x.id ? `<div class="item"><div class="t"><b>Fez agora?</b></div><div class="meta">Registra hoje com o km atual do carro (${km(v && v.km_atual)}). Se tiver custo, já lança a despesa.</div>
        <div class="linha"><input id="mxCusto" type="number" inputmode="decimal" step="0.01" placeholder="Custo (opcional)" aria-label="Custo" style="flex:1;min-width:0;border:1px solid var(--line);border-radius:10px;padding:0 12px;min-height:44px;background:var(--surface)"><button class="btn pri" type="button" id="mxFeito">Marcar como feita</button></div>
        ${(D.oficinas || []).length ? `<select id="mxOf" aria-label="Oficina" style="border:1px solid var(--line);border-radius:10px;padding:0 12px;min-height:44px;background:var(--surface)">${optOficinas("").replace("Nenhuma", "Feita em qual oficina? (opcional)")}</select>` : ""}</div>` : ""}
      <form id="fMx" class="secao">
        <div class="campo"><label for="xVei">Carro</label><select id="xVei" required>${D.veiculos.map(c => `<option value="${c.id}" ${x.veiculo_id === c.id ? "selected" : ""}>${esc(c.placa)} · ${esc(c.modelo || "")}</option>`).join("")}</select></div>
        <div class="campo"><label for="xItem">Item</label><input id="xItem" value="${esc(x.item)}" placeholder="Ex.: Troca de óleo" required></div>
        <div class="grade2"><div class="campo"><label for="xIk">A cada (km)</label><input id="xIk" type="number" inputmode="numeric" value="${esc(x.intervalo_km)}"></div>
        <div class="campo"><label for="xId">Ou a cada (dias)</label><input id="xId" type="number" inputmode="numeric" value="${esc(x.intervalo_dias)}"></div></div>
        <div class="grade2"><div class="campo"><label for="xUd">Última vez (data)</label><input id="xUd" type="date" value="${esc(x.ultima_data)}"></div>
        <div class="campo"><label for="xUk">Última vez (km)</label><input id="xUk" type="number" inputmode="numeric" value="${esc(x.ultima_km)}"></div></div>
        <button class="btn ${x.id ? "" : "pri"} cheio" type="submit">Salvar item</button>
        ${x.id ? `<button class="btn perigo cheio" type="button" id="xDel">Apagar item</button>` : ""}</form>`);
    $("fMx").onsubmit = e => { e.preventDefault(); salvar("frota_manutencoes", { id: x.id, veiculo_id: $("xVei").value, item: $("xItem").value.trim(), intervalo_km: num($("xIk").value), intervalo_dias: num($("xId").value), ultima_data: $("xUd").value || null, ultima_km: num($("xUk").value) }, "Item salvo"); };
    if (x.id) {
      $("xDel").onclick = () => confirmar("Apagar este item do plano?", () => apagar("frota_manutencoes", x.id, "Item apagado"));
      $("mxFeito").onclick = async () => {
        try {
          await rpc("frota_salvar", { cod: codigo, tabela: "frota_manutencoes", dado: { id: x.id, ultima_data: D.hoje, ultima_km: v ? v.km_atual : x.ultima_km } });
          const custo = num($("mxCusto").value);
          if (custo) await rpc("frota_salvar", { cod: codigo, tabela: "frota_despesas", dado: { veiculo_id: x.veiculo_id, categoria: /pneu/i.test(x.item) ? "pneus" : "manutencao", descricao: x.item, valor: custo, data: D.hoje, km: v ? v.km_atual : null, oficina_id: ($("mxOf") && $("mxOf").value) || null } });
          await carregar(); fecharFolha(); render(); toast("Manutenção registrada");
        } catch (err) { toast("Não salvou: " + err.message); }
      };
    }
  }
  function zapOficina(o, v) {
    let tel = String(o.telefone || "").replace(/\D/g, ""); if (tel.length <= 11) tel = "55" + tel;
    const txt = `Olá! Aqui é ${D.frota.dono ? D.frota.dono + ", da " : "da "}${D.frota.nome}.` + (v ? ` Sobre o carro ${v.placa} (${v.modelo || ""}): ` : " ");
    return `https://wa.me/${tel}?text=${encodeURIComponent(txt)}`;
  }
  function formOficina(o) {
    o = o || {};
    abrirFolha(o.id ? "Editar oficina" : "Nova oficina", `<form id="fO" class="secao">
      <div class="campo"><label for="oNome">Nome</label><input id="oNome" value="${esc(o.nome)}" required></div>
      <div class="campo"><label for="oTel">WhatsApp ou telefone</label><input id="oTel" inputmode="tel" value="${esc(o.telefone)}" placeholder="(31) 99999-9999"></div>
      <div class="campo"><label for="oEnd">Endereço</label><input id="oEnd" value="${esc(o.endereco)}" placeholder="Rua, número, bairro, cidade"></div>
      <div class="campo"><label for="oEsp">O que faz</label><input id="oEsp" list="espOf" value="${esc(o.especialidade)}" placeholder="Ex.: Mecânica geral"><datalist id="espOf"><option>Mecânica geral</option><option>Pneus, alinhamento e balanceamento</option><option>Funilaria e pintura</option><option>Elétrica</option><option>Embreagem e câmbio</option><option>Ar-condicionado</option><option>Autopeças</option><option>Guincho</option><option>Lava-jato</option></datalist></div>
      <div class="campo"><label for="oNota">Sua nota</label><select id="oNota"><option value="">Sem nota</option>${[5, 4, 3, 2, 1].map(n => `<option value="${n}" ${+o.nota === n ? "selected" : ""}>${estrelas(n)} (${n})</option>`).join("")}</select></div>
      <div class="campo"><label for="oObs">Observações</label><textarea id="oObs" placeholder="Ex.: dá 10% à vista, entrega no mesmo dia">${esc(o.obs)}</textarea></div>
      <button class="btn pri cheio" type="submit">Salvar oficina</button>
      ${o.id ? `<button class="btn perigo cheio" type="button" id="oDel">Apagar oficina</button>` : ""}</form>`);
    $("fO").onsubmit = e => { e.preventDefault(); salvar("frota_oficinas", { id: o.id, nome: $("oNome").value.trim(), telefone: $("oTel").value.replace(/\D/g, "") || null, endereco: $("oEnd").value.trim() || null, especialidade: $("oEsp").value.trim() || null, nota: num($("oNota").value), obs: $("oObs").value.trim() || null }, "Oficina salva"); };
    if (o.id) $("oDel").onclick = () => confirmar("Apagar esta oficina? Os serviços antigos continuam nas despesas.", () => apagar("frota_oficinas", o.id, "Oficina apagada"));
  }
  function detalheOficina(id) {
    const o = ofi(id); if (!o) return;
    const serv = D.despesas.filter(x => x.oficina_id === id);
    const tot = serv.reduce((s, x) => s + (+x.valor || 0), 0);
    const porCarro = {}; serv.forEach(x => { const k = x.veiculo_id || "frota"; porCarro[k] = (porCarro[k] || 0) + (+x.valor || 0); });
    abrirFolha(o.nome, `
      <div class="item"><div class="meta"><span>${esc(o.especialidade || "")}</span>${o.nota ? `<span style="color:var(--warn)">${estrelas(o.nota)}</span>` : ""}${o.telefone ? `<span>${esc(fone(o.telefone))}</span>` : ""}${o.endereco ? `<span>${esc(o.endereco)}</span>` : ""}</div>
        ${o.obs ? `<div class="meta">${esc(o.obs)}</div>` : ""}
        <div class="acoes">${o.telefone ? `<a class="btn zap peq" href="${zapOficina(o)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}<button class="btn peq" type="button" id="doEdit">Editar</button></div></div>
      <div class="kpis" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="kpi"><span class="v">${R0(tot)}</span><span class="l">gasto no total</span></div><div class="kpi"><span class="v">${serv.length}</span><span class="l">serviço${serv.length === 1 ? "" : "s"} lançado${serv.length === 1 ? "" : "s"}</span></div></div>
      ${Object.keys(porCarro).length ? `<div class="item barras">${Object.entries(porCarro).sort((a, b) => b[1] - a[1]).map(([k, val]) => `<div class="barra">${k === "frota" ? "<span>Frota toda</span>" : `<span class="placa">${esc(veic(k)?.placa || "–")}</span>`}<div class="trilho"><i class="neg" style="width:${(val / tot * 100).toFixed(1)}%;background:var(--muted)"></i></div><span class="v">${R0(val)}</span></div>`).join("")}</div>` : ""}
      <div class="secao"><h3>Serviços</h3>${serv.length ? `<div class="lista">${serv.map(x => `<button type="button" class="item clicavel" data-acao="desp" data-id="${x.id}"><div class="t"><b>${esc(x.descricao || CAT[x.categoria] || "")}</b><span class="valor">${R$(x.valor)}</span></div><div class="meta"><span>${dt(x.data)}</span>${veic(x.veiculo_id) ? `<span class="placa">${esc(veic(x.veiculo_id).placa)}</span>` : ""}${x.km ? `<span>${km(x.km)}</span>` : ""}</div></button>`).join("")}</div>` : `<div class="vazio">Nenhum serviço lançado. Ao lançar uma despesa, escolha esta oficina.</div>`}</div>`);
    $("doEdit").onclick = () => formOficina(o);
  }
  const PLANO = [["Troca de óleo e filtro", 10000, 180], ["Alinhamento e balanceamento", 10000, null], ["Rodízio de pneus", 10000, null], ["Pastilhas de freio (revisar)", 20000, null], ["Filtro de ar e de cabine", 15000, 365], ["Correia dentada", 60000, null]];
  async function planoPadrao(vid) {
    const v = veic(vid), tem = new Set(D.manutencoes.filter(x => x.veiculo_id === vid).map(x => x.item.toLowerCase()));
    try {
      for (const [item, ik, id] of PLANO) if (!tem.has(item.toLowerCase())) await rpc("frota_salvar", { cod: codigo, tabela: "frota_manutencoes", dado: { veiculo_id: vid, item, intervalo_km: ik, intervalo_dias: id, ultima_data: null, ultima_km: null } });
      await carregar(); render(); detalheVeiculo(vid); toast("Plano criado. Informe quando foi feita a última de cada item.");
    } catch (err) { toast("Não salvou: " + err.message); }
  }
  function formVenc(x) {
    x = x || { tipo: "IPVA", vencimento: D.hoje };
    abrirFolha(x.id ? "Editar vencimento" : "Novo vencimento", `
      ${x.id && !x.pago ? `<button class="btn pri cheio" type="button" id="vgPago">Paguei${x.valor ? " " + R$(x.valor) : ""} (lança como despesa)</button>` : ""}
      <form id="fVg" class="secao">
      <div class="grade2"><div class="campo"><label for="gTipo">Tipo</label><input id="gTipo" list="tiposVenc" value="${esc(x.tipo)}" required><datalist id="tiposVenc"><option>IPVA</option><option>Licenciamento</option><option>Seguro</option><option>Parcela do financiamento</option><option>Rastreador</option><option>Vistoria</option></datalist></div>
      <div class="campo"><label for="gVal">Valor</label><input id="gVal" type="number" inputmode="decimal" step="0.01" value="${esc(x.valor)}"></div></div>
      <div class="grade2"><div class="campo"><label for="gVei">Carro</label><select id="gVei"><option value="">Frota toda</option>${D.veiculos.map(v => `<option value="${v.id}" ${x.veiculo_id === v.id ? "selected" : ""}>${esc(v.placa)}</option>`).join("")}</select></div>
      <div class="campo"><label for="gDt">Vence em</label><input id="gDt" type="date" value="${esc(x.vencimento)}" required></div></div>
      <button class="btn cheio ${x.id ? "" : "pri"}" type="submit">Salvar</button>
      ${x.id ? `<button class="btn perigo cheio" type="button" id="gDel">Apagar</button>` : ""}</form>`);
    $("fVg").onsubmit = e => { e.preventDefault(); salvar("frota_vencimentos", { id: x.id, tipo: $("gTipo").value.trim(), valor: num($("gVal").value), veiculo_id: $("gVei").value || null, vencimento: $("gDt").value, pago: !!x.pago }, "Vencimento salvo"); };
    if (x.id) $("gDel").onclick = () => confirmar("Apagar este vencimento?", () => apagar("frota_vencimentos", x.id, "Apagado"));
    if (x.id && !x.pago) $("vgPago").onclick = async () => {
      try {
        await rpc("frota_salvar", { cod: codigo, tabela: "frota_vencimentos", dado: { id: x.id, pago: true } });
        if (x.valor) await rpc("frota_salvar", { cod: codigo, tabela: "frota_despesas", dado: { veiculo_id: x.veiculo_id, categoria: /seguro/i.test(x.tipo) ? "seguro" : /parcela|financ/i.test(x.tipo) ? "parcela" : /rastread/i.test(x.tipo) ? "rastreador" : "documentacao", descricao: x.tipo, valor: x.valor, data: D.hoje } });
        await carregar(); fecharFolha(); render(); toast("Pago e lançado nas despesas");
      } catch (err) { toast("Não salvou: " + err.message); }
    };
  }

  // ---------- folha, confirmação ----------
  let focoAntes = null;
  function abrirFolha(titulo, html) {
    fecharFolha(true); focoAntes = document.activeElement;
    const f = document.createElement("div"); f.className = "folha"; f.id = "folha";
    f.innerHTML = `<div class="fundo" data-fechar="1"></div><div class="cx" role="dialog" aria-modal="true" aria-labelledby="fTit"><div class="h"><h3 id="fTit">${esc(titulo)}</h3><button class="fechar" type="button" data-fechar="1" aria-label="Fechar">×</button></div>${html}</div>`;
    document.body.appendChild(f); document.body.style.overflow = "hidden";
    f.addEventListener("click", e => { if (e.target.closest("[data-fechar]")) fecharFolha(); });
    ligar(f);
    const p = f.querySelector("input,select,button:not(.fechar)"); if (p && matchMedia("(min-width:640px)").matches) p.focus(); else f.querySelector(".fechar").focus();
  }
  function fecharFolha(semFoco) { const f = $("folha"); if (f) { f.remove(); document.body.style.overflow = ""; if (!semFoco && focoAntes && focoAntes.isConnected) focoAntes.focus(); } }
  function confirmar(msg, ok) {
    abrirFolha("Confirmar", `<p style="margin:0">${esc(msg)}</p><div class="grade2"><button class="btn" type="button" data-fechar="1">Cancelar</button><button class="btn perigo" type="button" id="cfOk">Apagar</button></div>`);
    $("cfOk").onclick = ok;
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape") fecharFolha(); });
  const num = s => { if (s === "" || s == null) return null; const n = parseFloat(String(s).replace(",", ".")); return isFinite(n) ? n : null; };

  // ---------- cliques ----------
  function ligar(el) {
    el.addEventListener("click", e => {
      const t = e.target.closest("button,a"); if (!t || t.tagName === "A") return;
      const d = t.dataset;
      if (d.mes) { mesRef = mudaMes(mesRef, +d.mes); render(); }
      else if (d.novo === "veiculo") formVeiculo();
      else if (d.novo === "motorista") formMotorista();
      else if (d.veic) detalheVeiculo(d.veic);
      else if (d.mot) detalheMotorista(d.mot);
      else if (d.pagar) formPagar(D.cobrancas.find(c => c.id === d.pagar));
      else if (d.desfaz) salvar("frota_cobrancas", { id: d.desfaz, pago_em: null, valor_pago: null }, "Pagamento desfeito");
      else if (d.editcob) formCobranca(D.cobrancas.find(c => c.id === d.editcob));
      else if (d.pix) mostrarPix(D.cobrancas.find(c => c.id === d.pix));
      else if (d.avulsa !== undefined) formCobranca(null, d.avulsa);
      else if (d.fcob) { filtroCob = d.fcob; render(); }
      else if (d.ir) { fecharFolha(); aba = "mais"; sub = d.ir; render(); window.scrollTo(0, 0); }
      else if (d.voltar) { sub = null; render(); }
      else if (d.novadesp !== undefined) formDespesa(null, d.novadesp);
      else if (d.novamanut !== undefined) formManut(null, d.novamanut);
      else if (d.novovenc) formVenc();
      else if (d.plano) planoPadrao(d.plano);
      else if (d.novaofi) formOficina();
      else if (d.ofi) detalheOficina(d.ofi);
      else if (d.acao) {
        const id = d.id;
        if (d.acao === "cobrar") detalheMotorista(id);
        else if (d.acao === "manut") formManut(D.manutencoes.find(x => x.id === id));
        else if (d.acao === "venc") formVenc(D.vencimentos.find(x => x.id === id));
        else if (d.acao === "mot") formMotorista(mot(id));
        else if (d.acao === "desp") formDespesa(D.despesas.find(x => x.id === id));
      }
    });
    const cfg = el.querySelector("#fCfg");
    if (cfg) {
      cfg.onsubmit = e => { e.preventDefault(); salvar("frota_frotas", { nome: $("gNome").value.trim(), dono: $("gDono").value.trim() || null, pix_chave: $("gChave").value.trim() || null, pix_nome: $("gPN").value.trim() || null, pix_cidade: $("gPC").value.trim() || null }, "Configurações salvas"); };
      $("cfgCp").onclick = () => copiar($("cfgLink").textContent, $("cfgLink"));
    }
  }

  // ---------- início ----------
  const q = new URLSearchParams(location.search).get("c");
  if (q) { try { history.replaceState(null, "", location.pathname); } catch (_) { /* */ } }
  const salvo = q || LS.get("fm_codigo");
  if (salvo) entrar(salvo); else telaEntrada();
})();
