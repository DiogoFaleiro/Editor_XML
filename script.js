/*
   Editor de XML NF-e — DFSystem  |  JS estável (revisado)
    */

// Botão "Voltar ao topo" — compatível com qualquer navegador/contêiner
(function setupBackToTop(){
  const fabTop = document.getElementById('fabTop');
  if (!fabTop) return;

  function smoothScrollToTop(duration = 500){
    // Pega todos os candidatos que podem estar rolando
    const candidates = [
      document.scrollingElement || document.documentElement,
      document.documentElement,
      document.body,
      document.querySelector('main')
    ].filter(el => el && el.scrollHeight > el.clientHeight);

    // Se nada encontrado, tenta o window.scrollTo como fallback
    if (candidates.length === 0){
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Anima manualmente o scrollTop de todos os candidatos
    const starts = candidates.map(el => el.scrollTop || 0);
    const t0 = performance.now();

    function step(t){
      const k = Math.min(1, (t - t0) / duration);
      const ease = 1 - Math.pow(1 - k, 3); // easing cúbico
      candidates.forEach((el, i) => {
        el.scrollTop = starts[i] * (1 - ease);
      });
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  fabTop.addEventListener('click', (e) => {
    e.preventDefault();
    smoothScrollToTop(550);
  });
})();
   
// Mantém as linhas selecionadas mesmo após re-render
let selectedRows = new Set();

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

    document.getElementById('bulkBar')?.classList.remove('hidden');

    console.log('Itens do estado após extração:', state.itens); // Log para depuração

    renderMeta();  // Atualiza os metadados
    renderTable(); // Renderiza a tabela com os itens
  } catch (err) {
    console.error('[parseXML] erro:', err);
    alert('Erro ao interpretar XML: ' + (err?.message || err));
  }
  // >>> INSERIR AO FINAL DO SUCESSO DO CARREGAMENTO DO XML
renderTable();
if (typeof updateSum === 'function') updateSum();

// mostra UI de trabalho e trava o botão Importar
document.getElementById('toolbar')?.classList.remove('hidden');
document.getElementById('tableWrap')?.classList.remove('hidden');
document.getElementById('bulkBar')?.classList.remove('hidden');
disableImport(true);

document.getElementById('fabTop')?.classList.remove('hidden');

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


// Passo 2: Detectando quando o PWA pode ser instalado (pop-up central)
let deferredPrompt;
const installModal = document.getElementById('installModal');
const installBtn   = document.getElementById('installBtn');
const dismissBtn   = document.getElementById('dismissBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installModal.classList.add('show');  // abre modal central
});

installBtn.addEventListener('click', () => {
  installModal.classList.remove('show'); // fecha modal
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      // 🎉 dispara confete ao aceitar instalação
      confettiCelebrate('🎉 App adicionado com sucesso!');
    }
    deferredPrompt = null;
  });
});

dismissBtn.addEventListener('click', () => {
  installModal.classList.remove('show'); // fecha modal
  // 🧹 dispara vassourinha ao recusar instalação
  sweepClean();
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

// Modal central (extra interações)
// fecha ao clicar fora do conteúdo
installModal.addEventListener('click', (e) => {
  if (e.target === installModal) installModal.classList.remove('show');
});

// fecha com ESC
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') installModal.classList.remove('show');
});

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

// Retorna os índices conforme o escopo escolhido
function getBulkIndices(scope){
  if (scope === 'all') return state.itens.map((_, i) => i);
  // default: selecionados
  return Array.from(selectedRows);
}

// Aplica nova unidade nos itens do escopo
function bulkApplyUnit(newUnit, scope){
  const unit = (newUnit || '').trim().toUpperCase();
  if (!unit) { alert('Informe a nova unidade.'); return; }

  const idxs = getBulkIndices(scope);
  if (!idxs.length) { alert('Nenhum item no escopo.'); return; }

  idxs.forEach(i => {
    const it = state.itens[i];
    if (!it) return;
    it.uCom = unit;                 // altera a unidade comercial
  });

  renderTable();                    // re-render
  if (typeof updateSum === 'function') updateSum();
}


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

// === Util: sincroniza o mestre com o estado atual ===
function syncMasterCheckbox() {
  const tbody  = document.getElementById('tbody');
  const master = document.getElementById('selectAllRows');
  if (!tbody || !master) return;

  const all     = tbody.querySelectorAll('.row-select');
  const checked = tbody.querySelectorAll('.row-select:checked');

  if (all.length === 0) {
    master.checked = false;
    master.indeterminate = false;
    return;
  }
  master.checked = checked.length === all.length;
  master.indeterminate = checked.length > 0 && checked.length < all.length;
}

// === Render principal da tabela ===
function renderTable() {
  const tbody = document.getElementById('tbody');
  if (!tbody) { console.error('tbody não encontrado'); return; }
  if (!state.itens || state.itens.length === 0) { tbody.innerHTML = ''; updateSum?.(); syncMasterCheckbox(); return; }

  tbody.innerHTML = '';

  // Linhas
  state.itens.forEach((it, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <!-- Seleção -->
      <td style="text-align:center;">
        <input class="row-select" type="checkbox" data-idx="${idx}"
               ${selectedRows.has(idx) ? 'checked' : ''}
               aria-label="Selecionar item ${idx + 1}">
      </td>

      <!-- Código / Descrição -->
      <td>${it.cProd ?? ''}</td>
      <td>${it.xProd ?? ''}</td>

      <!-- Unid. (editável) -->
      <td class="ucom">
        <input class="ucom-input" data-idx="${idx}" type="text" maxlength="6"
               value="${(it.uCom || '').toUpperCase()}">
      </td>

      <!-- Quantidade e valores da NF-e -->
      <td>${formatQty(it.qCom)}</td>
      <td>${formatBRL2(it.vUnComNF)}</td>
      <td>${formatBRL2(it.vProdNF)}</td>

      <!-- Custo unitário (editável) e custo total calculado -->
      <td class="costCol">
        <input class="cost" data-idx="${idx}" type="text" inputmode="decimal"
               value="${numToInput(it.custoUnit, 2)}">
      </td>
      <td class="cTotal">${formatBRL2((it.qCom || 0) * (it.custoUnit || 0))}</td>
    `;
    tbody.appendChild(tr);
  });

  // Listeners dos inputs (custos + unidade)
  tbody.querySelectorAll('input.cost').forEach(inp => {
    inp.addEventListener('input', onCostChange);
    inp.addEventListener('blur', (e) => {
      e.target.value = numToInput(toNumber(e.target.value), 2); // força 2 casas
    });
  });
  tbody.querySelectorAll('input.ucom-input').forEach(inp => {
    inp.addEventListener('input', onUComChange);
  });

  // Delegado: seleção por linha (sem duplicar)
  if (!tbody.__rowSelectWired) {
    tbody.addEventListener('change', (e) => {
      const el = e.target;
      if (!el.classList.contains('row-select')) return;
      const idx = Number(el.dataset.idx);
      if (Number.isNaN(idx)) return;
      if (el.checked) selectedRows.add(idx); else selectedRows.delete(idx);
      syncMasterCheckbox();
    });
    tbody.__rowSelectWired = true;
  }

  // Delegado: toggle editor mobile (sem duplicar)
  if (!tbody.__mobileEditWired) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('.m-edit-toggle');
      if (!btn) return;
      const cell = btn.closest('td');
      const open = !cell.classList.contains('m-open');
      cell.classList.toggle('m-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    tbody.__mobileEditWired = true;
  }

  // Mestre: marcar/desmarcar todos (sem duplicar)
  const master = document.getElementById('selectAllRows');
  if (master && !master.__wired) {
    master.addEventListener('change', () => {
      const rows = tbody.querySelectorAll('.row-select');
      rows.forEach(cb => {
        cb.checked = master.checked;
        const i = Number(cb.dataset.idx);
        if (Number.isNaN(i)) return;
        if (master.checked) selectedRows.add(i);
        else selectedRows.delete(i);
      });
      master.indeterminate = false;
    });
    master.__wired = true;
  }

  // Totais e estado visual do mestre
  updateSum?.();
  syncMasterCheckbox();
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

// Ativa ou desativa o botão Importar XML
function disableImport(disable){
  const btn = document.getElementById('btnImportXML');
  const file = document.getElementById('file'); // input de arquivo escondido
  if (!btn || !file) return;

  btn.classList.toggle('is-disabled', !!disable);
  file.disabled = !!disable;
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
/* ========= Sweep Clean (fumaça + vassoura) ========= */
function limparComEfeito(){
  sweepClean(() => { limparTudo(); });
}

function sweepClean(done){
  // --- tenta canvas primeiro ---
  const cvs = document.createElement('canvas');
  cvs.className = 'smoke-canvas';
  document.body.appendChild(cvs);
  const ctx = cvs.getContext('2d', { alpha: true, willReadFrequently: false });

  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  function resize(){
    cvs.width  = innerWidth * dpr;
    cvs.height = innerHeight * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize();

  // vassoura
  const broom = document.createElement('div');
  broom.className = 'broom';
  broom.textContent = '🧹';
  document.body.appendChild(broom);

  const useDomFallback = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);

  // ------ Fallback DOM (funciona em 100% dos Androids) ------
  function spawnDomSmoke(){
    const COUNT = 24;
    for (let i=0;i<COUNT;i++){
      const s = document.createElement('div');
      s.className = 'smoke-puff';
      const left = 6 + Math.random()*88;          // %
      const size = 34 + Math.random()*34;         // px
      const delay = (i*18 + Math.random()*80);    // ms
      s.style.left = left + 'vw';
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.animationDelay = delay + 'ms';
      document.body.appendChild(s);
      setTimeout(()=> s.remove(), 1400 + delay);
    }
  }

  // ------ Canvas (desktop/onde renderiza bem) ------
  function spawnCanvasSmoke(){
    const N = 140, H0 = innerHeight * 0.72;
    const parts = Array.from({length:N}, () => ({
      x: Math.random()*innerWidth,
      y: H0 + Math.random()*80 - 40,
      r: 14 + Math.random()*22,
      vx: (Math.random()-.5)*0.9,
      vy: - (0.9 + Math.random()*1.3),
      a: .85 + Math.random()*.1,
      g: 185 + Math.random()*30
    }));
    const t0 = performance.now(), DUR = 1300;
    (function draw(t){
      const k = Math.min(1, (t - t0) / DUR);
      ctx.clearRect(0,0,innerWidth,innerHeight);
      for (const p of parts){
        p.x += p.vx*(1-k*0.3);
        p.y += p.vy*(1-k*0.2);
        const alpha = Math.max(0, p.a * (1 - k));
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.g},${p.g},${p.g},${alpha})`;
        ctx.arc(p.x, p.y, p.r*(1+ k*0.25), 0, Math.PI*2);
        ctx.fill();
      }
      if (k < 1) requestAnimationFrame(draw);
      else cvs.remove();
    })(t0);
  }

  // Dispara fumaça conforme o ambiente
  if (useDomFallback) {
    spawnDomSmoke();
  } else {
    try { spawnCanvasSmoke(); }
    catch { spawnDomSmoke(); }
  }

  // remove tudo ao final
  setTimeout(() => {
    broom.remove();
    cvs.remove();
    if (typeof done === 'function') done();
  }, 1400);
}


  const t0 = performance.now(), DUR = 1300;

  function draw(t){
    const k = (t - t0) / DUR;
    ctx.clearRect(0,0,innerWidth,innerHeight);
    for (const p of parts){
      // leve drift
      p.x += p.vx;
      p.y += p.vy * (1 - k*0.3);
      p.vx *= 0.99;
      p.vy *= 0.99;
      const alpha = Math.max(0, p.a * (1 - k));
      ctx.beginPath();
      ctx.fillStyle = `rgba(${p.g},${p.g},${p.g},${alpha})`;
      ctx.arc(p.x, p.y, p.r*(1+ k*0.2), 0, Math.PI*2);
      ctx.fill();
    }
    if (k < 1) requestAnimationFrame(draw);
    else {
      cvs.remove();
      broom.remove();
      if (typeof done === 'function') done();
    }
  }
  requestAnimationFrame(draw);

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
  // >>> INSERIR NO FINAL DE exportAlteredNFeXML(), APÓS GERAR E "CLICKAR" NO LINK
disableImport(false); // 🔓 libera Importar XML novamente

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
  
selectedRows?.clear?.();
disableImport(false); // 🔓 libera Importar XML
// (opcional) esconder a barra e a tabela até novo XML
document.getElementById('bulkBar')?.classList.add('hidden');
// document.getElementById('toolbar')?.classList.add('hidden');
// document.getElementById('tableWrap')?.classList.add('hidden');
document.getElementById('fabTop')?.classList.add('hidden');

}