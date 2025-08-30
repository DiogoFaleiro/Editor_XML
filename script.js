// Função para registrar o Service Worker e configurar o PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/Editor_XML/sw.js')  // Caminho correto para o SW
      .then((registration) => {
        console.log('Service Worker registrado com sucesso:', registration);
      })
      .catch((error) => {
        console.log('Falha ao registrar o Service Worker:', error);
      });
  });
}

// Função para mostrar ou esconder o indicador de carregamento
function setLoading(isLoading) {
  const loadingElement = document.getElementById('loading');
  if (isLoading) {
    loadingElement.classList.remove('hidden');
  } else {
    loadingElement.classList.add('hidden');
  }
}

// Função para carregar e processar o XML
async function loadXMLFile(file) {
  try {
    setLoading(true);  // Exibe o loading

    // Lê o arquivo como array de bytes
    const ab = await file.arrayBuffer();

    // Usar UTF-8 como padrão para decodificar
    const enc = 'utf-8';
    let dec = new TextDecoder(enc);

    // Decodificando o conteúdo do arquivo
    const xmlText = dec.decode(ab);

    // Alerta de sucesso
    alert('XML carregado com sucesso!');

    // Passa o conteúdo para ser processado
    parseXML(xmlText);
  } catch (err) {
    console.error('[loadXMLFile] erro:', err);
    alert('Erro ao ler o arquivo: ' + (err?.message || err));
  } finally {
    setLoading(false);  // Sempre limpa o loading após execução
  }
}

// Função para processar o XML e extrair os dados
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

    let ch = null;
    const infNFe = doc.getElementsByTagName('infNFe')[0];
    if (infNFe && infNFe.getAttribute('Id')) ch = infNFe.getAttribute('Id').replace(/^NFe/i, '');
    if (!ch) {
      const chEl = doc.getElementsByTagName('chNFe')[0];
      if (chEl) ch = chEl.textContent.trim();
    }
    state.chNFe = ch || '';

    // Emissor, destinatário e data
    const emit = doc.getElementsByTagName('emit')[0];
    const dest = doc.getElementsByTagName('dest')[0];
    const ide = doc.getElementsByTagName('ide')[0];

    state.emit = emit ? textOf(emit, 'xNome') : 'Desconhecido';
    state.dest = dest ? textOf(dest, 'xNome') : 'Desconhecido';
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
    state.itens = dets.map(det => {
      const nItem = det.getAttribute('nItem') || '';
      const prod = det.getElementsByTagName('prod')[0];
      const cProd = prod ? textOf(prod, 'cProd') : 'Produto não encontrado';
      const xProd = prod ? textOf(prod, 'xProd') : 'Descrição não encontrada';
      const uCom = prod ? textOf(prod, 'uCom') : '';
      const qCom = toNumber(prod ? textOf(prod, 'qCom') : 0);
      const vUnComNF = toNumber(prod ? textOf(prod, 'vUnCom') : 0);
      const vProdNF = toNumber(prod ? textOf(prod, 'vProd') : 0);
      const custoUnit = vUnComNF;

      return { nItem, cProd, xProd, uCom, qCom, vUnComNF, vProdNF, custoUnit };
    });

    renderMeta();
    renderTable(); // Atualiza a tabela com os itens
  } catch (err) {
    console.error('[parseXML] erro:', err);
    alert('Erro ao interpretar XML: ' + (err?.message || err));
  }
}

// Função renderTable que preenche a tabela com os dados do XML
function renderTable() {
  const tbody = document.getElementById('tbody');
  
  if (!tbody) {
    console.error('Elemento <tbody> não encontrado!');
    return;
  }

  if (!state.itens || state.itens.length === 0) {
    console.error('Nenhum item encontrado em state.itens');
    return;
  }

  tbody.innerHTML = '';  // Limpa a tabela antes de preenchê-la com novos dados

  state.itens.forEach((it, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${it.nItem || (idx + 1)}</td>
      <td>${it.cProd}</td>
      <td>${it.xProd}</td>
      <td>${formatBRL2(it.vUnComNF)}</td>
      <td>${formatBRL2(it.vProdNF)}</td>
      <td>${formatBRL2((it.qCom || 0) * (it.custoUnit || 0))}</td>
      <td>${formatQty(it.qCom)}</td>
      <td>${it.uCom}</td>
    `;
    tbody.appendChild(tr);
  });

  updateSum();
}

// Função para calcular a soma dos custos totais
function updateSum() {
  let sum = 0;
  state.itens.forEach(item => {
    sum += (item.qCom || 0) * (item.custoUnit || 0);
  });
  document.getElementById('somaCustos').innerHTML = formatBRL2(sum);
}

// Função de limpar todos os dados
function limparTudo() {
  state.itens = [];
  renderTable();
  alert('Todos os dados foram limpos!');
}

// Função para exportar XML alterado (uso interno)
function exportAlteredNFeXML() {
  const xml = new XMLSerializer().serializeToString(state._doc);
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'NFe_Alterada.xml';
  a.click();
  URL.revokeObjectURL(url);
}

// Função para formatar valores em BRL com 2 casas decimais
function formatBRL2(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Função para formatar valores inteiros de quantidade
function formatQty(value) {
  return Number(value).toFixed(0);  // Arredonda para 0 casas decimais
}