class PagamentoRecusadoHandler {
  constructor(pedidoRepository) {
    this.pedidoRepository = pedidoRepository;
  }

  async executar(pedido) {
    const pedidoFalhou = {
      ...pedido,
      status: 'FALHOU'
    };

    await this.pedidoRepository.salvar(pedidoFalhou);

    return null;
  }
}

module.exports = { PagamentoRecusadoHandler };