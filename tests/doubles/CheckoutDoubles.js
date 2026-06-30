const { CheckoutService } = require('../../src/services/CheckoutService');

function criarGatewayPagamentoStub(respostas = [{ status: 'APROVADO' }]) {
  let indiceResposta = 0;

  return {
    cobrar: jest.fn(async () => {
      const respostaAtual =
        respostas[indiceResposta] ?? respostas[respostas.length - 1];

      indiceResposta += 1;

      if (respostaAtual instanceof Error) {
        throw respostaAtual;
      }

      if (typeof respostaAtual === 'function') {
        return respostaAtual();
      }

      return respostaAtual;
    })
  };
}

function criarPedidoRepositoryMock({ idGerado = 101 } = {}) {
  return {
    salvar: jest.fn(async (pedido) => ({
      ...pedido,
      id: idGerado
    }))
  };
}

function criarEmailServiceMock({ travarEnvio = false } = {}) {
  return {
    enviarConfirmacao: jest.fn(() => {
      if (travarEnvio) {
        return new Promise(() => {});
      }

      return Promise.resolve(true);
    })
  };
}

function criarCheckoutServiceParaTeste({
  respostasGateway = [{ status: 'APROVADO' }],
  pedidoRepository = criarPedidoRepositoryMock(),
  emailService = criarEmailServiceMock(),
  options = {}
} = {}) {
  const gatewayPagamento = criarGatewayPagamentoStub(respostasGateway);

  const service = new CheckoutService(
    gatewayPagamento,
    pedidoRepository,
    emailService,
    {
      timeoutMs: 50,
      maxRetries: 3,
      backoffMs: 0,
      ...options
    }
  );

  return {
    service,
    gatewayPagamento,
    pedidoRepository,
    emailService
  };
}

module.exports = {
  criarGatewayPagamentoStub,
  criarPedidoRepositoryMock,
  criarEmailServiceMock,
  criarCheckoutServiceParaTeste
};