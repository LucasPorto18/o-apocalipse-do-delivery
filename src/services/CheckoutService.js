class CheckoutService {
  constructor(gatewayPagamento, pedidoRepository, emailService, options = {}) {
    this.gatewayPagamento = gatewayPagamento;
    this.pedidoRepository = pedidoRepository;
    this.emailService = emailService;

    this.timeoutMs = options.timeoutMs ?? 2000;
    this.maxRetries = options.maxRetries ?? 3;
    this.backoffMs = options.backoffMs ?? 500;
  }

  async processar(pedido) {
    try {
      const resposta = await this.cobrarComResiliencia(pedido);

      if (this.pagamentoFoiAprovado(resposta)) {
        return await this.processarPagamentoAprovado(pedido);
      }

      return await this.processarPagamentoRecusado(pedido);
    } catch (error) {
      return await this.processarErroGateway(pedido, error);
    }
  }

  async cobrarComResiliencia(pedido) {
    let ultimoErro;
    const totalTentativas = this.maxRetries + 1;

    for (let tentativa = 1; tentativa <= totalTentativas; tentativa += 1) {
      try {
        return await this.executarComTimeout(() =>
          this.gatewayPagamento.cobrar(pedido.valor, pedido.cartao)
        );
      } catch (error) {
        ultimoErro = error;

        if (tentativa < totalTentativas) {
          await this.esperar(this.backoffMs);
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
        }, this.timeoutMs);
      })
    ]);
  }

  pagamentoFoiAprovado(resposta) {
    return resposta && resposta.status === 'APROVADO';
  }

  async processarPagamentoAprovado(pedido) {
    const pedidoProcessado = {
      ...pedido,
      status: 'PROCESSADO'
    };

    const pedidoSalvo = await this.pedidoRepository.salvar(pedidoProcessado);

    this.enviarConfirmacaoSemBloquearResposta(pedido.clienteEmail);

    return pedidoSalvo;
  }

  async processarPagamentoRecusado(pedido) {
    const pedidoFalhou = {
      ...pedido,
      status: 'FALHOU'
    };

    await this.pedidoRepository.salvar(pedidoFalhou);

    return null;
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

  enviarConfirmacaoSemBloquearResposta(clienteEmail) {
    try {
      const envio = this.emailService.enviarConfirmacao(
        clienteEmail,
        'Pagamento Aprovado'
      );

      Promise.resolve(envio).catch((error) => {
        console.error('Falha ao enviar e-mail de confirmação:', error.message);
      });
    } catch (error) {
      console.error('Falha ao iniciar envio de e-mail de confirmação:', error.message);
    }
  }

  esperar(ms) {
    if (ms <= 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = { CheckoutService };