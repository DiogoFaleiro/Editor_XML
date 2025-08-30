/* =========================================================
   Editor de XML NF-e — DFSystem
   Versão final
   ========================================================= */

/* ===== Boot seguro dos listeners (não quebra se faltar algo) ===== */
(function boot(){
  function $id(id){ return document.getElementById(id); }
  function on(el, ev, fn){ if (el) el.addEventListener(ev, fn, false); }

  function init(){
    // Ajusta sticky top ao carregar
    fixStickyTop();

    const file = $id('file');
    const drop = $id('dropzone');

    // Drag & drop (o click já está inline no HTML)
    on(drop, 'dragover', evtDragOver);
    on(drop, 'dragleave', evtDragLeave);
    on(drop, 'drop', evtDrop);

    // Seleção pelo input
    on(file, 'change', (e)=>{
      const f = e.target.files && e.target.files[0];
      console.log('[file change]', f && f.name);
      if (f) loadXMLFile(f);
    });

    console.log('[init] listeners prontos');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();

/* ===== Ajuste do sticky header da tabela ===== */
function fixStickyTop() {
  try{
    const h = document.querySelector('header')?.offsetHeight || 0;
    document.documentElement.style.setProperty('--thead-top', (h + 20) + 'px');
  }catch(e){ console.warn('[fixStickyTop]', e); }
}
window.addEventListener('load', fixStickyTop);
window.addEventListener('resize', fixStickyTop);

/* ===== Estado ===== */
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
  console.log('[drop]', f && f.name);
  if (f) loadXMLFile(f);
}

function detectEncodingFromProlog(bytes){
  const ascii = new TextDecoder('ascii').decode(bytes.slice(0,200));
  const m = ascii.match(/encoding\s*=\s*["']([\w\-]+)["']/i);
  return m ? m[1].toLowerCase() : 'utf-8';
}

async function loadXMLFile(file){
  try{
    const ab = await file.arrayBuffer();
    let enc = detectEncodingFromProlog(new Uint8Array(ab));
    if(!['utf-8','utf8','iso-8859-1','windows-1252'].includes(enc)) enc='utf-8';
    let dec; try{ dec = new TextDecoder(enc); }catch{ dec = new TextDecoder('utf-8'); }
    const xmlText = dec.decode(ab);
    console.log('[loadXMLFile] ok, encoding:', enc, 'bytes:', ab.byteLength);
    parseXML(xmlText);
  }catch(err){
    console.error('[loadXMLFile] erro:', err);
    alert('Erro ao ler arquivo: ' + (err?.message || err));
  }
}

/* =========================================================
   Parse
   ========================================================= */
function parseXML(xml){
  try{
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')){
      console.error('[parseXML] parsererror', doc.querySelector('parsererror')?.textContent);
      alert('Não foi possível ler o XML da NF-e.');
      return;
    }
    state._doc = doc; state._xmlText = xml;

    // chave
    let ch=null;
    const infNFe = doc.getElementsByTagName('infNFe')[0];
    if(infNFe && infNFe.getAttribute('Id')) ch = infNFe.getAttribute('Id').replace(/^NFe/i,'');
    if(!ch){ const chEl = doc.getElementsByTagName('chNFe')[0]; if(chEl) ch = chEl.textContent.trim(); }
    state.chNFe = ch || '';

    // emit, dest, data
    const emit = doc.getElementsByTagName('emit')[0];
    const dest = doc.getElementsByTagName('dest')[0];
    const ide  = doc.getElementsByTagName('ide')[0];
    state.emit = emit ? textOf(emit,'xNome') : '';
    state.dest = dest ? textOf(dest,'xNome') : '';
    const dhEmi = ide ? (textOf(ide,'dhEmi') || textOf(ide,'dEmi')) : '';
    state.dataEmi = formatDateBR(dhEmi);

    // documento do destinatário
    const docCNPJ = dest ? textOf(dest,'CNPJ') : '';
    const docCPF  = dest ? textOf(dest,'CPF')  : '';
    if (docCNPJ) state.destDoc = { tipo:'CNPJ', valor:soDigitos(docCNPJ) };
    else if (docCPF) state.destDoc = { tipo:'CPF', valor:soDigitos(docCPF) };
    else state.destDoc = { tipo:null, valor:null };

    // itens
    const dets = Array.from(doc.getElementsByTagName('det'));
    state.itens = dets.map(det=>{
      const nItem = det.getAttribute('nItem') || '';
      const prod = det.getElementsByTagName('prod')[0];
      const cProd = prod ? textOf(prod,'cProd') : '';
      const xProd = prod ? textOf(prod,'xProd') : '';
      const uCom  = prod ? textOf(prod,'uCom') : '';
      const qCom  = toNumber(prod ? textOf(prod,'qCom') : '0');
      const vUnComNF = toNumber(prod ? textOf(prod,'vUnCom') : '0');
      const vProdNF  = toNumber(prod ? textOf(prod,'vProd') : '0');
      const custoUnit = vUnComNF;
      return {nItem,cProd,xProd,uCom,qCom,vUnComNF,vProdNF,custoUnit};
    });

    renderMeta();
    renderTable();
  }catch(err){
    console.error('[parseXML] erro:', err);
    alert('Erro ao interpretar XML: ' + (err?.message || err));
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
function numToInput(n){ return (n ?? 0).toString().replace('.', ','); }
function soDigitos(s){ return (s || '').replace(/\D+/g, ''); }
function mascaraCNPJ(s) {
  const d = soDigitos(s).slice(0,14);
  let out = d;
  if (d.length > 2)  out = d.slice(0,2) + '.' + d.slice(2);
  if (d.length > 5)  out = out.slice(0,6) + '.' + d.slice(5);
  if (d.length > 8)  out = out.slice(0,10) + '/' + d.slice(8);
  if (d.length > 12) out = out.slice(0,15) + '-' + d.slice(12);
  return out;
}
function cnpjValido14(s){ return soDigitos(s).length === 14; } // validação simples

/* =========================================================
   UI: metas + CNPJ
   ========================================================= */
function renderMeta(){
  const meta = document.getElementById('meta');
  const parts = [];
  if (state.chNFe) parts.push(`<div><span>Chave:</span><br><b class="break">${state.chNFe}</b></div>`);
  if (state.emit)  parts.push(`<div><span>Emitente:</span><br><b>${state.emit}</b></div>`);
  if (state.dest)  parts.push(`<div><span>Destinatário:</span><br><b>${state.dest}</b></div>`);
  if (state.dataEmi) parts.push(`<div><span>Emissão:</span><br><b>${state.dataEmi}</b></div>`);
  if (meta){ meta.innerHTML = parts.join(''); meta.classList.remove('hidden'); }

  const tb = document.getElementById('toolbar'); if (tb) tb.classList.remove('hidden');
  const tw = document.getElementById('tableWrap'); if (tw) tw.classList.remove('hidden');

  // Campo CNPJ (opcional)
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
      };
    } else {
      cWrap.classList.add('hidden');
    }
  }
}

/* =========================================================
   UI: tabela (com editor mobile na descrição)
   ========================================================= */
function renderTable(){
  const tbody = document.getElementById('tbody'); if (!tbody) return;
  tbody.innerHTML='';

  state.itens.forEach((it, idx)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${it.nItem || (idx+1)}</td>
      <td>${it.cProd}</td>
      <td>
        ${it.xProd}
        <!-- Editor mobile -->
        <div class="mobile-edit">
          <div class="row">
            <div>
              <label>Unid.</label>
              <input type="text" value="${(it.uCom||'').toUpperCase()}"
                     data-idx="${idx}" class="ucom-input" maxlength="8">
            </div>
            <div>
              <label>Custo unit.</label>
              <input type="text" inputmode="decimal" value="${numToInput(it.custoUnit)}"
                     data-idx="${idx}" class="cost">
            </div>
            <div class="edit-note">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L7.5 21H3v-4.5L16.732 3.732z"/>
              </svg>
              Toque para editar
            </div>
          </div>
        </div>
      </td>
      <td class="ucom"><input type="text" value="${(it.uCom||'').toUpperCase()}" data-idx="${idx}" class="ucom-input" maxlength="8"></td>
      <td>${formatQty(it.qCom)}</td>
      <td>${formatBRL(it.vUnComNF)}</td>
      <td>${formatBRL(it.vProdNF)}</td>
      <td class="costCol"><input type="text" inputmode="decimal" value="${numToInput(it.custoUnit)}" data-idx="${idx}" class="cost"></td>
      <td class="cTotal">${formatBRL(it.qCom * it.custoUnit)}</td>
    `;
    tbody.appendChild(tr);
  });

  // listeners em TODAS as instâncias (desktop e mobile)
  tbody.querySelectorAll('input.cost').forEach(inp=> inp.addEventListener('input', onCostChange));
  tbody.querySelectorAll('input.ucom-input').forEach(inp=> inp.addEventListener('input', onUComChange));
  updateSum();
}

function onCostChange(e){
  const idx = Number(e.target.dataset.idx);
  const n = toNumber(e.target.value);
  state.itens[idx].custoUnit = n;
  const tr = e.target.closest('tr');
  if (tr){
    if (Math.abs(n - state.itens[idx].vUnComNF) > 1e-9) tr.classList.add('changed'); else tr.classList.remove('changed');
    const cell = tr.querySelector('.cTotal'); if (cell) cell.textContent = formatBRL((state.itens[idx].qCom||0) * n);
    // mantém espelhado em ambas instâncias do input
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
  // espelha no “gêmeo”
  const tr = e.target.closest('tr');
  if (tr){
    const twins = tr.querySelectorAll(`input.ucom-input[data-idx="${idx}"]`);
    twins.forEach(i => { if (i !== e.target) i.value = val; });
  }
}
function updateSum(){
  const total = state.itens.reduce((a,it)=> a + (it.qCom||0)*(it.custoUnit||0), 0);
  const s = document.getElementById('sum'); if (s) s.textContent = 'Soma dos custos: ' + formatBRL(total);
}

/* =========================================================
   Exportar XML alterado (cópia sem assinatura)
   ========================================================= */
function exportAlteredNFeXML(){
  if(!state._doc){ alert('Abra um XML da NF-e primeiro.'); return; }
  const ok = confirm('Isto gera uma CÓPIA do XML da NF-e com alterações (custos/unid. e CNPJ do destinatário, se informado). NÃO é fiscalmente válido. Continuar?');
  if(!ok) return;

  const doc = state._doc.cloneNode(true);

  // Atualiza itens
  const byNItem = new Map(state.itens.map(it=>[String(it.nItem||''),it]));
  Array.from(doc.getElementsByTagName('det')).forEach(det=>{
    const nItem = String(det.getAttribute('nItem') || '');
    const it = byNItem.get(nItem);
    if(!it) return;
    const prod = det.getElementsByTagName('prod')[0];
    if(!prod) return;
    setOrCreate(prod,'uCom',  it.uCom || 'UN');
    setOrCreate(prod,'vUnCom', formatXMLNumber(it.custoUnit, 2));
    setOrCreate(prod,'vProd',  formatXMLNumber((it.qCom||0)*(it.custoUnit||0), 2));
  });

  // Atualiza CNPJ do destinatário (se existir e for válido)
  if (state.destDoc && state.destDoc.tipo === 'CNPJ' && cnpjValido14(state.destDoc.valor)) {
    const dest = doc.getElementsByTagName('dest')[0];
    if (dest) {
      const cpf = dest.getElementsByTagName('CPF')[0];
      if (cpf) cpf.parentNode.removeChild(cpf);
      setOrCreate(dest, 'CNPJ', state.destDoc.valor);
    }
  }

  const xmlDecl = state._xmlText.startsWith('<?xml') ? '' : '<?xml version="1.0" encoding="UTF-8"?>\n';
  const xml = new XMLSerializer().serializeToString(doc);
  downloadFile(xmlDecl + xml, fileNameBase() + '_ALTERADA_sem_assinatura.xml','application/xml;charset=utf-8');
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
  const ids = ['meta','toolbar','tableWrap','tbody','sum','file','cnpjWrap'];
  ids.forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    if (id === 'tbody') el.innerHTML='';
    else if (id === 'sum') el.textContent='';
    else if (id === 'file') el.value='';
    else el.classList.add('hidden');
  });
}