/*
   Editor de XML NF-e — DFSystem  |  JS estável (revisado)
    */
/* 
   Funções auxiliares para formatação de valores monetários
    */

document.addEventListener('DOMContentLoaded', function() {
  // Seu código que manipula o DOM vai aqui
  renderTable();  // Chama a função renderTable() após o DOM ser carregado
});

function parseXML(xml) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const perr = doc.querySelector('parsererror');
    
    if (perr) {
      console.error('[parseXML] parsererror', perr.textContent);
      alert('Não foi possível ler o XML da NF-e.');
      return;
    }

    // Extração de dados do XML
    state._doc = doc; 
    state._xmlText = xml;

    // Verificando se o ID da NFe é encontrado
    let ch = null;
    const infNFe = doc.getElementsByTagName('infNFe')[0];
    if (infNFe && infNFe.getAttribute('Id')) {
      ch = infNFe.getAttribute('Id').replace(/^NFe/i, '');
    }
    if (!ch) {
      const chEl = doc.getElementsByTagName('chNFe')[0];
      if (chEl) ch = chEl.textContent.trim();
    }
    state.chNFe = ch || '';

    // Emissor, destinatário e data
    const emit = doc.getElementsByTagName('emit')[0];
    const dest = doc.getElementsByTagName('dest')[0];
    const ide = doc.getElementsByTagName('ide')[0];

    state.emit = emit ? textOf(emit, 'xNome') : 'Desconhecido';  // Valor padrão
    state.dest = dest ? textOf(dest, 'xNome') : 'Desconhecido';  // Valor padrão
    const dhEmi = ide ? (textOf(ide, 'dhEmi') || textOf(ide, 'dEmi')) : '';
    state.dataEmi = formatDateBR(dhEmi);

    // Documento do destinatário
    const docCNPJ = dest ? textOf(dest, 'CNPJ') : '';
    const docCPF = dest ? textOf(dest, 'CPF') : '';
    if (docCNPJ) state.destDoc = { tipo: 'CNPJ', valor: soDigitos(docCNPJ) };
    else if (docCPF) state.destDoc = { tipo: 'CPF', valor: soDigitos(docCPF) };
    else state.destDoc = { tipo: null, valor: null };

    // Extração dos itens do XML
    const dets = Array.from(doc.getElementsByTagName('det'));
    console.log('Itens extraídos do XML:', dets);  // Log para depuração

    state.itens = dets.map(det => {
      const nItem = det.getAttribute('nItem') || '';  // Garantir que nItem seja obtido
      const prod = det.getElementsByTagName('prod')[0];
      const cProd = prod ? textOf(prod, 'cProd') : 'Produto não encontrado';
      const xProd = prod ? textOf(prod, 'xProd') : 'Descrição não encontrada';
      const uCom = prod ? textOf(prod, 'uCom') : '';  // Unidade
      const qCom = toNumber(prod ? textOf(prod, 'qCom') : 0);  // Garantir que qCom seja um número
      const vUnComNF = toNumber(prod ? textOf(prod, 'vUnCom') : 0);  // Valor unitário
      const vProdNF = toNumber(prod ? textOf(prod, 'vProd') : 0);  // Valor total
      const custoUnit = vUnComNF;

      return { nItem, cProd, xProd, uCom, qCom, vUnComNF, vProdNF, custoUnit };
    });

    console.log('Itens do estado após extração:', state.itens); // Log para depuração

    renderMeta();  // Atualiza os metadados
    renderTable(); // Renderiza a tabela com os itens
  } catch (err) {
    console.error('[parseXML] erro:', err);
    alert('Erro ao interpretar XML: ' + (err?.message || err));
  }
}

// Para valores com 2 casas decimais (moeda)
function formatBRL2(n) {
  const v = Number(n || 0);
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(v);
  } catch {
    return 'R$ ' + v.toFixed(2).replace('.', ',');
  }
}

// Para valores com 4 casas decimais (moeda)
function formatBRL4(n) {
  const v = Number(n || 0);
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(v);
  } catch {
    return 'R$ ' + v.toFixed(4).replace('.', ',');
  }
}


/* ========== Boot seguro dos listeners ========== */
(function boot(){
  function $id(id){ return document.getElementById(id); }
  function on(el, ev, fn){ if (el) el.addEventListener(ev, fn, false); }

  function init(){
    try {
      fixStickyTop();

      const file = $id('file');
      const drop = $id('dropzone');


/* =========================================================
   Funções do Editor de XML NF-e
   ========================================================= */


      // Drag & drop (o click para abrir já está inline no HTML)
      on(drop, 'dragover', evtDragOver);
      on(drop, 'dragleave', evtDragLeave);
      on(drop, 'drop', evtDrop);

      // Seleção pelo input (além do onchange no HTML)
      on(file, 'change', (e)=>{
        const f = e.target.files && e.target.files[0];
        if (f) loadXMLFile(f);
      });

      console.log('[init] listeners prontos');
    } catch (err) {
      console.error('[init] erro:', err);
      alert('Erro ao iniciar a página: ' + (err?.message || err));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();

// Passo 2: Detectando quando o PWA pode ser instalado
let deferredPrompt;
const installModal = document.getElementById('installModal');
const installBtn = document.getElementById('installBtn');
const dismissBtn = document.getElementById('dismissBtn');

// Detecta se o navegador suporta PWA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installModal.style.display = 'block';
  document.body.classList.add('has-install-modal'); // <-- adiciona classe no body
});

// Quando o usuário clicar no botão de instalação
installBtn.addEventListener('click', () => {
  installModal.style.display = 'none';
  document.body.classList.remove('has-install-modal'); // <-- remove classe
  deferredPrompt.prompt();
  deferredPrompt.userChoice.finally(() => deferredPrompt = null);
});

// Quando o usuário clicar em "Não, obrigado"
dismissBtn.addEventListener('click', () => {
  installModal.style.display = 'none';
  document.body.classList.remove('has-install-modal'); // <-- remove classe
});

/* ========== Sticky thead offset ========== */
function fixStickyTop() {
  const h = (document.querySelector('header') || {}).offsetHeight || 0;
  document.documentElement.style.setProperty('--thead-top', (h + 20) + 'px');
}
window.addEventListener('load', fixStickyTop);
window.addEventListener('resize', fixStickyTop);

/* ========== Estado ========== */
let state = {
  chNFe:null, emit:null, dest:null, dataEmi:null,
  itens:[], _doc:null, _xmlText:'',
  destDoc:{ tipo:null, valor:null } // 'CNPJ' | 'CPF' | null
};

/* =========================================================
   Drag & drop / arquivo
   ========================================================= */
function evtDragOver(e){
  e.preventDefault();
  const dz = document.getElementById('dropzone');
  if (dz) dz.classList.add('drag');
}
function evtDragLeave(){
  const dz = document.getElementById('dropzone');
  if (dz) dz.classList.remove('drag');
}
function evtDrop(e){
  e.preventDefault();
  const dz = document.getElementById('dropzone');
  if (dz) dz.classList.remove('drag');
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) loadXMLFile(f);
}

function detectEncodingFromProlog(bytes){
  const ascii = new TextDecoder('ascii').decode(bytes.slice(0,200));
  const m = ascii.match(/encoding\s*=\s*["']([\w\-]+)["']/i);
  return m ? m[1].toLowerCase() : 'utf-8';
}

function setLoading(on){
  const el = document.getElementById('loading');
  if (el) el.classList.toggle('hidden', !on);
}

async function loadXMLFile(file){
  try {
    // Exibe o loading
    setLoading(true);

    const ab = await file.arrayBuffer();  // Lê o arquivo como array de bytes

    // Detecta a codificação e faz a leitura do arquivo com o TextDecoder
    let enc = detectEncodingFromProlog(new Uint8Array(ab));
    if(!['utf-8','utf8','iso-8859-1','windows-1252'].includes(enc)) enc = 'utf-8';

    let dec;
    try {
      dec = new TextDecoder(enc);
    } catch {
      dec = new TextDecoder('utf-8');
    }

    // Decodificando o conteúdo do arquivo
    const xmlText = dec.decode(ab);

    // Passa o conteúdo para ser processado
    parseXML(xmlText);

  } catch (err) {
    console.error('[loadXMLFile] erro:', err);
    alert('Erro ao ler arquivo: ' + (err?.message || err));
  } finally {
    setLoading(false);  // Sempre limpa o loading após a execução
  }
}

/* =========================================================
   Helpers
   ========================================================= */
function textOf(scope,tag){ const el=scope.getElementsByTagName(tag)[0]; return el ? (el.textContent||'').trim() : ''; }
function toNumber(str){ if (str == null) return 0; const s=String(str).replace(/\s+/g,'').replace(',','.'); const n=Number(s); return isFinite(n)?n:0; }
function formatBRL(n){ try{ return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:10}).format(n||0); }catch{ return (n||0).toFixed(2); } }
function formatQty(n){ try{ return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:10}).format(n||0); }catch{ return String(n||0); } }
function formatDateBR(d){ if(!d) return ''; const only=d.slice(0,10); const [y,m,da]=only.split('-'); return (y&&m&&da)?`${da}/${m}/${y}`:d; }
function numToInput(n, dec=2){
  const v = Number(n ?? 0);
  return v.toFixed(dec).replace('.', ',');
}
function soDigitos(s){ return (s || '').replace(/\D+/g, ''); }
function mascaraCNPJ(s){
  const d = soDigitos(s).slice(0,14);
  if (d.length <= 2)  return d;
  if (d.length <= 5)  return d.slice(0,2) + '.' + d.slice(2);
  if (d.length <= 8)  return d.slice(0,2) + '.' + d.slice(2,5) + '.' + d.slice(5);
  if (d.length <= 12) return d.slice(0,2) + '.' + d.slice(2,5) + '.' + d.slice(5,8) + '/' + d.slice(8);
  return d.slice(0,2) + '.' + d.slice(2,5) + '.' + d.slice(5,8) + '/' + d.slice(8,12) + '-' + d.slice(12);
}
function cnpjValido14(s){ return soDigitos(s).length === 14; }

/* =========================================================
   UI: metas + CNPJ (com CHAVE editável + copiar)
   ========================================================= */
function renderMeta(){
  const meta = document.getElementById('meta');
  const parts = [];

  // CHAVE (EDITÁVEL + COPIAR)
  if (state.chNFe) {
    parts.push(`
      <div>
        <span>Chave:</span><br>
        <div class="meta-row">
          <input id="chKey" class="meta-input ch" type="text" inputmode="numeric"
                 maxlength="44" value="${state.chNFe}">
          <button type="button" id="copyKey" class="copy-btn" title="Copiar chave">Copiar</button>
        </div>
      </div>
    `);
  }

  if (state.emit)     parts.push(`<div><span>Emitente:</span><br><b>${state.emit}</b></div>`);
  if (state.dest)     parts.push(`<div><span>Destinatário:</span><br><b>${state.dest}</b></div>`);
  if (state.dataEmi)  parts.push(`<div><span>Emissão:</span><br><b>${state.dataEmi}</b></div>`);

  if (meta){
    meta.innerHTML = parts.join('');
    meta.classList.remove('hidden');
  }

  const tb = document.getElementById('toolbar'); if (tb) tb.classList.remove('hidden');
  const tw = document.getElementById('tableWrap'); if (tw) tw.classList.remove('hidden');

  // CNPJ do destinatário (opcional)
  const cWrap = document.getElementById('cnpjWrap');
  const cInput = document.getElementById('cnpjDest');
  const cHint  = document.getElementById('cnpjHint');

  if (cWrap && cInput && cHint) {
    if (state.destDoc.tipo === 'CNPJ') {
      cWrap.classList.remove('hidden');
      cInput.value = mascaraCNPJ(state.destDoc.valor || '');
      cInput.oninput = (e)=>{
        const v = soDigitos(e.target.value);
        e.target.value = mascaraCNPJ(v);
        state.destDoc.valor = v;
        const ok = cnpjValido14(v);
        cHint.textContent = ok ? 'CNPJ válido (14 dígitos).' : 'Digite 14 dígitos.';
        cHint.style.color = ok ? '#2d6cdf' : '#b54747';
        // opcional: manter cursor no fim
        const pos = e.target.value.length;
        if (e.target.setSelectionRange) e.target.setSelectionRange(pos, pos);
      };
    } else {
      cWrap.classList.add('hidden');
    }
  }

  // Listener da CHAVE (mantém só dígitos e atualiza o estado)
  const ch = document.getElementById('chKey');
  if (ch){
    ch.oninput = (e)=>{
      const only = (e.target.value || '').replace(/\D+/g, '').slice(0,44);
      e.target.value = only;
      state.chNFe = only;
    };
  }

  // Copiar chave
  const copy = document.getElementById('copyKey');
  if (copy){
    copy.onclick = async ()=>{
      try{
        await navigator.clipboard.writeText(state.chNFe || '');
        const old = copy.textContent;
        copy.textContent = 'Copiado!';
        setTimeout(()=> copy.textContent = old, 1200);
      }catch(err){
        alert('Não foi possível copiar a chave.');
      }
    };
  }
}

/* =========================================================
   UI: tabela (com editor mobile expandível)
   ========================================================= */

function renderTable() {
  const tbody = document.getElementById('tbody');

  // Verifica se o tbody existe no DOM
  if (!tbody) {
    console.error('Elemento <tbody> não encontrado!');
    return;
  }

  // Verifica se o estado contém itens
  if (!state.itens || state.itens.length === 0) {
    console.error('Nenhum item encontrado em state.itens');
    return;
  }

  tbody.innerHTML = '';  // Limpa a tabela antes de preenchê-la com novos dados

  // Verifique o conteúdo de state.itens para debug
  console.log('Itens do XML:', state.itens);

  // Percorre cada item da lista de itens e renderiza uma linha na tabela
  state.itens.forEach((it, idx) => {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${it.nItem || (idx + 1)}</td>                         <!-- # -->
    <td>${it.cProd ?? ''}</td>                                 <!-- Código -->
    <td>${it.xProd ?? ''}</td>                                 <!-- Descrição -->
    <td class="ucom">                                          <!-- Unid. (editável) -->
      <input class="ucom-input" data-idx="${idx}" type="text"
             maxlength="6" value="${(it.uCom || '').toUpperCase()}">
    </td>
    <td>${formatQty(it.qCom)}</td>                             <!-- Qtd -->
    <td>${formatBRL2(it.vUnComNF)}</td>                        <!-- Vlr Unit. NF-e -->
    <td>${formatBRL2(it.vProdNF)}</td>                         <!-- Vlr Total NF-e -->
    <td class="costCol">
      <input class="cost" data-idx="${idx}" type="text" inputmode="decimal"
             value="${numToInput(it.custoUnit, 2)}">
    </td>
    <td class="cTotal">${formatBRL2((it.qCom || 0) * (it.custoUnit || 0))}</td>
  `;
  tbody.appendChild(tr);
});

  // Atualiza os inputs (desktop e mobile)
tbody.querySelectorAll('input.cost').forEach(inp => {
  inp.addEventListener('input', onCostChange);
  inp.addEventListener('blur', (e) => {
    e.target.value = numToInput(toNumber(e.target.value), 2); // força 2 casas ao sair
  });
});
tbody.querySelectorAll('input.ucom-input').forEach(inp => {
  inp.addEventListener('input', onUComChange);
});

  // Toggle do editor mobile (delegado)
  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.m-edit-toggle');
    if (!btn) return;
    const cell = btn.closest('td');
    const open = !cell.classList.contains('m-open');
    cell.classList.toggle('m-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  updateSum();  // Atualiza a soma total
}

function onCostChange(e){
  const idx = Number(e.target.dataset.idx);
  const n = toNumber(e.target.value);
  state.itens[idx].custoUnit = n;
  const tr = e.target.closest('tr');
  const cell = tr.querySelector('.cTotal');
if (cell) cell.textContent = formatBRL2((state.itens[idx].qCom || 0) * n);

  if (tr){
    if (Math.abs(n - state.itens[idx].vUnComNF) > 1e-9) tr.classList.add('changed'); else tr.classList.remove('changed');
    const cell = tr.querySelector('.cTotal');
    if (cell) cell.textContent = formatBRL((state.itens[idx].qCom||0) * n);

    // espelha no “gêmeo”
    const twins = tr.querySelectorAll(`input.cost[data-idx="${idx}"]`);
    twins.forEach(i => { if (i !== e.target) i.value = e.target.value; });
  }
  updateSum();
}
function onUComChange(e){
  const idx = Number(e.target.dataset.idx);
  const val = (e.target.value || '').toUpperCase();
  state.itens[idx].uCom = val;
  e.target.value = val;

  const tr = e.target.closest('tr');
  if (tr){
    const twins = tr.querySelectorAll(`.ucom-input[data-idx="${idx}"]`);
    twins.forEach(i => { if (i !== e.target) i.value = val; });
  }
}
// Exemplo de função para somar e formatar
function updateSum() {
  let sum = 0;
  state.itens.forEach(item => {
    sum += (item.qCom || 0) * (item.custoUnit || 0); // Cálculo da soma
  });
  document.getElementById('somaCustos').innerHTML = formatBRL2(sum);  // Aplica a formatação com 2 casas
}

/* ========= Confetti Celebrate ========= */

function confettiCelebrate(msg){
  const cvs = document.createElement('canvas');
  cvs.className = 'confetti-canvas';
  document.body.appendChild(cvs);
  const ctx = cvs.getContext('2d');

  const dpr = window.devicePixelRatio || 1;
  function resize(){
    cvs.width = innerWidth * dpr;
    cvs.height = innerHeight * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize();
  window.addEventListener('resize', resize);

  const colors = ['#0077C8','#00AEEF','#003B73','#06D6A0','#FFD166'];
  const N = 150;
  const parts = Array.from({length:N}, () => ({
    x: Math.random()*innerWidth,
    y: -10,
    w: 6 + Math.random()*6,
    h: 10 + Math.random()*14,
    angle: Math.random()*Math.PI,
    vx: (Math.random()-0.5)*6,
    vy: 4 + Math.random()*4,
    ay: 0.18,
    color: colors[(Math.random()*colors.length)|0],
    spin: (Math.random()-0.5)*0.25
  }));

  const start = performance.now();
  const dur = 1700;

  function draw(t){
    const elapsed = (t || performance.now()) - start;
    ctx.clearRect(0,0,innerWidth,innerHeight);
    for (const p of parts){
      p.vy += p.ay; p.x += p.vx; p.y += p.vy; p.angle += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    }
    if (elapsed < dur) requestAnimationFrame(draw);
    else cvs.remove();
  }
  requestAnimationFrame(draw);

  if (msg){
    const toast = document.createElement('div');
    toast.className = 'confetti-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(()=> toast.remove(), 2400);
  }
}

/* =========================================================
   Exportar XML alterado (cópia sem assinatura)
   ========================================================= */

function exportAlteredNFeXML(){
  if (!state._doc) { 
    alert('Abra um XML da NF-e primeiro.'); 
    return; 
  }
  const ok = confirm('Isto gera uma CÓPIA do XML da NF-e com alterações (custos/unid. e CNPJ do destinatário, se informado). NÃO é fiscalmente válido. Continuar?');
  if (!ok) return;

  const doc = state._doc.cloneNode(true);

  // Atualiza itens
  const byNItem = new Map(state.itens.map(it => [String(it.nItem || ''), it]));
  Array.from(doc.getElementsByTagName('det')).forEach(det => {
    const nItem = String(det.getAttribute('nItem') || '');
    const it = byNItem.get(nItem);
    if (!it) return;
    const prod = det.getElementsByTagName('prod')[0];
    if (!prod) return;
    setOrCreate(prod, 'uCom',  it.uCom || 'UN');
    setOrCreate(prod, 'vUnCom', formatXMLNumber(it.custoUnit, 2));
    setOrCreate(prod, 'vProd',  formatXMLNumber((it.qCom || 0) * (it.custoUnit || 0), 2));
  });

  // Atualiza CNPJ do destinatário (se válido)
  if (state.destDoc && state.destDoc.tipo === 'CNPJ' && cnpjValido14(state.destDoc.valor)) {
    const dest = doc.getElementsByTagName('dest')[0];
    if (dest) {
      const cpf = dest.getElementsByTagName('CPF')[0];
      if (cpf) cpf.parentNode.removeChild(cpf);
      setOrCreate(dest, 'CNPJ', state.destDoc.valor);
    }
  }

  // Serializa e baixa
  const xmlDecl = state._xmlText.startsWith('<?xml') ? '' : '<?xml version="1.0" encoding="UTF-8"?>\n';
  const xml = new XMLSerializer().serializeToString(doc);
  downloadFile(xmlDecl + xml, fileNameBase() + '_ALTERADA_sem_assinatura.xml', 'application/xml;charset=utf-8');

  // 🎉 Parabéns com confete nas cores da marca
  confettiCelebrate('✅ XML salvo com sucesso!');

  // Limpa UI em seguida
  setTimeout(limparTudo, 120);
}

/* =========================================================
   Utils
   ========================================================= */
function setOrCreate(parent, tag, value){
  let el = parent.getElementsByTagName(tag)[0];
  if(!el){ el = parent.ownerDocument.createElement(tag); parent.appendChild(el); }
  el.textContent = value;
}
function formatXMLNumber(n, decimals){ const v = Number(n||0); return v.toFixed(decimals).replace(',','.'); }
function fileNameBase(){ return state.chNFe ? ('NFe_' + state.chNFe) : 'NFe_custos'; }
function downloadFile(content, filename, mime){
  const blob = new Blob([content], {type: mime || 'application/octet-stream'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },0);
}

function limparTudo(){
  state = { chNFe:null, emit:null, dest:null, dataEmi:null, itens:[], _doc:null, _xmlText:'', destDoc:{tipo:null, valor:null} };

  const meta = document.getElementById('meta');
  if (meta){ meta.innerHTML=''; meta.classList.add('hidden'); }

  const tb = document.getElementById('toolbar');
  if (tb){ tb.classList.add('hidden'); }

  const tw = document.getElementById('tableWrap');
  if (tw){ tw.classList.add('hidden'); }

  const tbody = document.getElementById('tbody');
  if (tbody){ tbody.innerHTML=''; }

  const sum = document.getElementById('sum');
  if (sum){ sum.textContent=''; }

  const cWrap = document.getElementById('cnpjWrap');
  if (cWrap){ cWrap.classList.add('hidden'); }

  const file = document.getElementById('file');
  if (file){ file.value=''; }
}