// Garantindo que o código só seja executado depois do DOM estar carregado
document.addEventListener('DOMContentLoaded', function () {
  console.log('DOM completamente carregado');
  loadXMLFile();  // Chama a função para carregar o XML, exemplo
});

// Função para carregar e processar o XML
async function loadXMLFile(file) {
  try {
    setLoading(true);  // Exibe o loading

    const ab = await file.arrayBuffer();  // Lê o arquivo como array de bytes

    // Detecta a codificação do arquivo
    let enc = detectEncodingFromProlog(new Uint8Array(ab));
    if (!['utf-8', 'utf-16', 'iso-8859-1', 'windows-1252'].includes(enc)) enc = 'utf-8';

    let dec;
    try {
      dec = new TextDecoder(enc);
    } catch {
      dec = new TextDecoder('utf-8');
    }

    // Decodificando o conteúdo do arquivo
    const xmlText = dec.decode(ab);

    // Alerta de sucesso ao carregar o XML
    alert('XML carregado com sucesso!');

    // Passa o conteúdo para ser processado
    parseXML(xmlText);
  } catch (err) {
    console.error('[loadXMLFile] erro:', err);
    alert('Erro ao ler o arquivo: ' + (err?.message || err));  // Alerta caso ocorra um erro
  } finally {
    setLoading(false);  // Sempre limpa o loading após a execução
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

    renderMeta();  // Atualiza os metadados
    renderTable(); // Renderiza a tabela com os itens
  } catch (err) {
    console.error('[parseXML] erro:', err);
    alert('Erro ao interpretar XML: ' + (err?.message || err));
  }
}

// Função renderTable que preenche a tabela com os dados do XML
function renderTable() {
  const tbody = document.getElementById('tbody');
  
  // Verifica se o tbody existe
  if (!tbody) {
    console.error('Elemento <tbody> não encontrado!');
    return;  // Se não encontrar o tbody, sai da função
  }

  // Verifica se state.itens não está vazio
  if (!state.itens || state.itens.length === 0) {
    console.error('Nenhum item encontrado em state.itens');
    return;  // Se não houver itens, sai da função
  }

  tbody.innerHTML = '';  // Limpa a tabela antes de preenchê-la com novos dados

  // Percorre cada item da lista de itens e renderiza uma linha na tabela
  state.itens.forEach((it, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${it.nItem || (idx + 1)}</td>  <!-- Número do item -->
      <td>${it.cProd}</td>  <!-- Código do produto -->
      <td>${it.xProd}</td>  <!-- Descrição do produto -->
      <td>${formatBRL2(it.vUnComNF)}</td>  <!-- Vlr Unit. NF-e com 2 casas -->
      <td>${formatBRL2(it.vProdNF)}</td>  <!-- Vlr Total NF-e com 2 casas -->
      <td>${formatBRL2((it.qCom || 0) * (it.custoUnit || 0))}</td>  <!-- Custo Total com 2 casas -->
      <td>${formatQty(it.qCom)}</td>  <!-- Quantidade (Inteiro) -->
      <td>${it.uCom}</td>  <!-- Unidade -->
    `;
    tbody.appendChild(tr);
  });

  updateSum();  // Atualiza a soma total
}

// Função para calcular a soma dos custos totais
function updateSum() {
  let sum = 0;
  state.itens.forEach(item => {
    sum += (item.qCom || 0) * (item.custoUnit || 0); // Cálculo da soma
  });
  document.getElementById('somaCustos').innerHTML = formatBRL2(sum);  // Aplica a formatação com 2 casas
}

// Função de limpar todos os dados
function limparTudo() {
  state.itens = [];  // Limpa a lista de itens
  renderTable();  // Re-renderiza a tabela vazia
  alert('Todos os dados foram limpos!');
}

// Função para exportar XML alterado (uso interno)
function exportAlteredNFeXML() {
  const xml = new XMLSerializer().serializeToString(state._doc);
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);

  // Cria um link temporário para download
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