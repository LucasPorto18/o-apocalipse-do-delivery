const { PagamentoAprovadoHandler } = require('./PagamentoAprovadoHandler');
const { PagamentoRecusadoHandler } = require('./PagamentoRecusadoHandler');

class PagamentoStatusHandlerFactory {
  constructor(pedidoRepository, emailService) {
    this.handlers = {
      APROVADO: new PagamentoAprovadoHandler(pedidoRepository, emailService),
      DEFAULT: new PagamentoRecusadoHandler(pedidoRepository)
    };
  }

  obterHandler(respostaGateway) {
    const status = respostaGateway?.status;

    return this.handlers[status] ?? this.handlers.DEFAULT;
  }
}

module.exports = { PagamentoStatusHandlerFactory };