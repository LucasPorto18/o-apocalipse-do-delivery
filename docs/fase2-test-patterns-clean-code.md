# Fase 2 — Test Patterns e Clean Code

Nesta etapa, foram aplicados padrões de teste e práticas de Clean Code para reduzir o acoplamento dos testes e evitar o cheiro de código conhecido como Obscure Setup.

## Data Builder

Para a criação dos pedidos usados nos testes, foi aplicado o padrão Data Builder por meio da classe `PedidoBuilder`, localizada em `tests/builders/PedidoBuilder.js`.

Esse padrão foi utilizado para evitar a repetição da montagem manual de objetos de pedido em cada teste. Dessa forma, os testes ficam mais legíveis e focados no comportamento esperado, e não nos detalhes de criação dos dados.

Exemplo de uso:

```js
const pedido = new PedidoBuilder().build();