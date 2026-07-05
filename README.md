# Editor de Custo por Item — XML NF-e

Ferramenta web para ajustar o custo unitário de cada item de um XML de NF-e antes da importação no ERP. Elimina a redigitação manual no recebimento de mercadoria.

## Por que essa ferramenta existe

No recebimento de mercadoria, o lojista importa o XML da NF-e do fornecedor para dentro do ERP — mas o custo que precisa entrar no sistema nem sempre é o custo que veio na nota (frete rateado, desconto negociado, acréscimos). O resultado é redigitação manual, item por item, com risco de erro que contamina margem e precificação.

Esta ferramenta resolve isso na origem: carrega o XML, permite ajustar o custo unitário de cada item em segundos e gera um novo arquivo pronto para importação. Nasceu de uma dor real de clientes da [DFsystem](https://www.dfsystem.com.br/) no varejo e é usada em produção junto a sistemas de gestão.

> ⚠️ **Importante:** o arquivo gerado é para uso interno (entrada de custo no ERP). Não substitui nem altera o documento fiscal original.

## Como funciona

1. Carregue o XML da NF-e recebida do fornecedor
2. A ferramenta lista todos os itens da nota com seus valores
3. Ajuste o custo unitário dos itens que precisar
4. Baixe o novo XML pronto para importar no seu ERP

Tudo roda no navegador — **nenhum arquivo é enviado para servidor**. Seus dados fiscais não saem da sua máquina.

## Tecnologias

- HTML, CSS e JavaScript puro (sem dependências externas)
- Processamento de XML 100% no navegador (client-side)
- PWA — pode ser instalada e usada como aplicativo

## Como usar localmente

```bash
git clone https://github.com/DiogoFaleiro/Editor_XML.git
```

Abra o `index.html` no navegador. Pronto.

## Licença

Distribuído sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.

## Autor

**Diogo Faleiro** — Fundador da DFsystem Soluções Empresariais
Automação e Agentes de IA para pequenas empresas

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/dfaleiro/)
