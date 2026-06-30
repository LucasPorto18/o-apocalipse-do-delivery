const { CheckoutOptions } = require('./checkout/CheckoutOptions');
const {
  PagamentoStatusHandlerFactory
} = require('./checkout/PagamentoStatusHandlerFactory');

class CheckoutService {
  constructor(gatewayPagamento, pedidoRepository, emailService, options = {}) {
    this.gatewayPagamento = gatewayPagamento;
    this.pedidoRepository = pedidoRepository;
    this.options = new CheckoutOptions(options);

    this.pagamentoStatusHandlerFactory = new PagamentoStatusHandlerFactory(
      pedidoRepository,
      emailService
    );
  }

  async processar(pedido) {
    try {
      const resposta = await this.cobrarComResiliencia(pedido);
      const handler = this.pagamentoStatusHandlerFactory.obterHandler(resposta);

      return await handler.executar(pedido);
    } catch (error) {
      return await this.processarErroGateway(pedido, error);
    }
  }

  async cobrarComResiliencia(pedido) {
    let ultimoErro;
    const totalTentativas = this.options.maxRetries + 1;

    for (let tentativa = 1; tentativa <= totalTentativas; tentativa += 1) {
      try {
        return await this.executarComTimeout(() =>
          this.gatewayPagamento.cobrar(pedido.valor, pedido.cartao)
        );
      } catch (error) {
        ultimoErro = error;

        if (tentativa < totalTentativas) {
          await this.esperar(this.options.backoffMs);
        }
      }
    }

    throw ultimoErro;
  }

  executarComTimeout(operacao) {
    return Promise.race([
      operacao(),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout no gateway de pagamento'));
        }, this.options.timeoutMs);
      })
    ]);
  }

  async processarErroGateway(pedido, error) {
    console.error('Falha controlada no gateway bancário:', error.message);

    const pedidoComErro = {
      ...pedido,
      status: 'ERRO_GATEWAY'
    };

    await this.pedidoRepository.salvar(pedidoComErro);

    return null;
  }

  esperar(ms) {
    if (ms <= 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = { CheckoutService };