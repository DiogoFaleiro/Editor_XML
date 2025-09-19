
# Editor de Custo por Item — XML NF-e

## Objetivo
Este projeto tem como objetivo fornecer uma ferramenta para editar o **custo por item** e **unidade de medida** de produtos contidos em um arquivo **XML de NF-e** (Nota Fiscal Eletrônica). O sistema permite carregar um arquivo XML, editar os valores de custo e unidade de medida dos itens, e salvar o XML alterado para **uso interno**, sem que o arquivo alterado seja um documento fiscal válido.

## Funcionalidades
- **Importação do XML**: Carregar um arquivo XML de NF-e.
- **Edição de Itens**: Alterar o preço de custo e a unidade de medida de cada item da NF-e.
- **Exportação**: Salvar o XML alterado para uso interno (sem assinatura).
- **Interface Responsiva**: Suporte completo para dispositivos móveis, com uma interface amigável e fácil de usar.

## Estrutura do Projeto
O projeto é composto por três arquivos principais:
1. **`index.html`**: Arquivo HTML que contém a estrutura da página e a interface do usuário.
2. **`style.css`**: Arquivo de estilos que define a aparência da interface.
3. **`script.js`**: Arquivo de JavaScript responsável pela lógica de funcionamento do sistema.

Além disso, há arquivos de configuração para **PWA (Progressive Web App)**, como **`manifest.json`** e **`sw.js`** (Service Worker), permitindo que a aplicação funcione offline e seja instalada como um aplicativo no dispositivo do usuário.

## Explicação do Código

### **index.html**
O arquivo `index.html` define a estrutura da interface do usuário e os metadados necessários para a página funcionar corretamente. Ele inclui:
- **Cabeçalho**: Título da página, descrição e logo da empresa.
- **Área de Importação de XML**: Um espaço interativo para carregar arquivos XML usando drag-and-drop ou clicando para selecionar um arquivo.
- **Tabela de Itens**: Exibe os itens da NF-e após o XML ser carregado, permitindo a edição do preço de custo e unidade.
- **Botões de Ação**: Botões para salvar o XML alterado ou limpar os dados.

### **script.js**
O arquivo `script.js` contém toda a lógica de funcionamento da aplicação:
1. **Função `setLoading(isLoading)`**: Exibe ou esconde o indicador de carregamento enquanto o XML está sendo processado.
2. **Função `loadXMLFile(file)`**: Carrega o arquivo XML e o decodifica. Ele usa o `TextDecoder` para ler o arquivo e chama a função `parseXML` para processar o conteúdo.
3. **Função `parseXML(xml)`**: Processa o XML carregado, extraindo informações dos itens da NF-e, como código do produto, descrição, quantidade, valor unitário, valor total e preço de custo. Além disso, extrai metadados, como CNPJ do destinatário e data de emissão.
4. **Função `renderTable()`**: Preenche a tabela com os dados extraídos do XML, exibindo informações de cada item de maneira organizada.
5. **Função `updateSum()`**: Calcula e exibe a soma total dos custos dos itens.
6. **Função `limparTudo()`**: Limpa todos os dados carregados e reinicia a tabela.
7. **Função `exportAlteredNFeXML()`**: Exporta o XML alterado, criando um link temporário para o download do arquivo.

### **style.css**
O arquivo `style.css` define o design da interface, incluindo:
- **Design Responsivo**: A aplicação se adapta a diferentes tamanhos de tela, especialmente em dispositivos móveis.
- **Estilo da Tabela**: Estilos para a tabela que exibe os itens da NF-e, como cores, bordas e espaçamentos.
- **Indicadores de Carregamento e Botões**: Estilos para os indicadores de progresso e os botões de ação.

### **PWA (Progressive Web App)**
- **`manifest.json`**: Este arquivo contém as configurações necessárias para o aplicativo ser reconhecido como um PWA e ser instalado na tela inicial do dispositivo.
- **`sw.js` (Service Worker)**: Registra o Service Worker para cache de arquivos e funcionalidade offline, garantindo que o aplicativo possa ser usado mesmo sem conexão com a internet.

## Como Usar

### 1. **Importar XML**
- Clique na área de importação de XML ou arraste um arquivo `.xml` da NF-e para carregar os dados.

### 2. **Editar Itens**
- Na tabela que será exibida após o carregamento do XML, você pode editar os valores de **Preço de Custo** e **Unidade de Medida** de cada item.

### 3. **Salvar XML Alterado**
- Após realizar as edições desejadas, clique no botão "Salvar XML alterado (uso interno)" para baixar o arquivo XML com os valores atualizados. Lembre-se de que o arquivo salvo é **apenas para uso interno** e **não é um documento fiscal válido**.

### 4. **Limpar Dados**
- Clique em "Limpar" para limpar todos os dados e começar novamente.

## Como Configurar e Rodar o Projeto Localmente

1. **Clone o Repositório**:
   ```bash
   git clone https://github.com/diogofaleiro/Editor_XML.git
   ```

2. **Abra o projeto no navegador**:
   - Navegue até a pasta do projeto e abra o `index.html` diretamente no seu navegador.

3. **Para Configuração de PWA**:
   - Acesse o aplicativo em um servidor local ou faça o deploy para um servidor web, pois o Service Worker e PWA funcionam apenas em um ambiente de servidor.

## Contribuindo
Se você deseja contribuir com o projeto, faça um **fork** do repositório, realize as modificações necessárias e envie um **pull request** com suas alterações.
