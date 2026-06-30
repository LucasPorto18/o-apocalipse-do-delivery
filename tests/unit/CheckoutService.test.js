const { CheckoutService } = require('../../src/services/CheckoutService');
const { PedidoBuilder } = require('../builders/PedidoBuilder');

function criarDependencias({ respostasGateway = [] } = {}) {
  let indiceResposta = 0;

  const gatewayPagamento = {
    cobrar: jest.fn(async () => {
      const resposta = respostasGateway[indiceResposta];
      indiceResposta += 1;

      if (resposta instanceof Error) {
        throw resposta;
      }

      return resposta;
    })
  };

  const pedidoRepository = {
    salvar: jest.fn(async (pedido) => ({ ...pedido, id: 101 }))
  };

  const emailService = {
    enviarConfirmacao: jest.fn(async () => true)
  };

  return { gatewayPagamento, pedidoRepository, emailService };
}

describe('CheckoutService - Ciclo TDD', () => {
  test('processa pedido aprovado, salva no repositório e envia e-mail de confirmação', async () => {
    const pedido = new PedidoBuilder().build();

    const dependencias = criarDependencias({
      respostasGateway: [{ status: 'APROVADO' }]
    });

    const service = new CheckoutService(
      dependencias.gatewayPagamento,
      dependencias.pedidoRepository,
      dependencias.emailService,
      { timeoutMs: 50, backoffMs: 0 }
    );

    const resultado = await service.processar(pedido);

    expect(dependencias.gatewayPagamento.cobrar).toHaveBeenCalledWith(pedido.valor, pedido.cartao);

    expect(dependencias.pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PROCESSADO' })
    );

    expect(dependencias.emailService.enviarConfirmacao).toHaveBeenCalledWith(
      pedido.clienteEmail,
      'Pagamento Aprovado'
    );

    expect(resultado).toEqual(
      expect.objectContaining({ id: 101, status: 'PROCESSADO' })
    );
  });

  test('marca pedido como FALHOU quando o pagamento é recusado e não envia e-mail', async () => {
    const pedido = new PedidoBuilder().build();

    const dependencias = criarDependencias({
      respostasGateway: [{ status: 'RECUSADO' }]
    });

    const service = new CheckoutService(
      dependencias.gatewayPagamento,
      dependencias.pedidoRepository,
      dependencias.emailService,
      { timeoutMs: 50, backoffMs: 0 }
    );

    const resultado = await service.processar(pedido);

    expect(dependencias.pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FALHOU' })
    );

    expect(dependencias.emailService.enviarConfirmacao).not.toHaveBeenCalled();
    expect(resultado).toBeNull();
  });

  test('realiza retry quando ocorre falha temporária no gateway e depois processa o pedido', async () => {
    const pedido = new PedidoBuilder().build();

    const dependencias = criarDependencias({
      respostasGateway: [
        new Error('Gateway indisponível'),
        { status: 'APROVADO' }
      ]
    });

    const service = new CheckoutService(
      dependencias.gatewayPagamento,
      dependencias.pedidoRepository,
      dependencias.emailService,
      { timeoutMs: 50, backoffMs: 0, maxRetries: 3 }
    );

    const resultado = await service.processar(pedido);

    expect(dependencias.gatewayPagamento.cobrar).toHaveBeenCalledTimes(2);

    expect(dependencias.pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PROCESSADO' })
    );

    expect(dependencias.emailService.enviarConfirmacao).toHaveBeenCalledTimes(1);

    expect(resultado).toEqual(
      expect.objectContaining({ status: 'PROCESSADO' })
    );
  });

  test('aciona fallback e marca ERRO_GATEWAY após esgotar as tentativas', async () => {
    const pedido = new PedidoBuilder().build();

    const dependencias = criarDependencias({
      respostasGateway: [
        new Error('Erro de infraestrutura'),
        new Error('Erro de infraestrutura'),
        new Error('Erro de infraestrutura'),
        new Error('Erro de infraestrutura')
      ]
    });

    const service = new CheckoutService(
      dependencias.gatewayPagamento,
      dependencias.pedidoRepository,
      dependencias.emailService,
      { timeoutMs: 50, backoffMs: 0, maxRetries: 3 }
    );

    const resultado = await service.processar(pedido);

    expect(dependencias.gatewayPagamento.cobrar).toHaveBeenCalledTimes(4);

    expect(dependencias.pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ERRO_GATEWAY' })
    );

    expect(dependencias.emailService.enviarConfirmacao).not.toHaveBeenCalled();
    expect(resultado).toBeNull();
  });

  test('interrompe a cobrança por timeout e salva o pedido como ERRO_GATEWAY', async () => {
    const pedido = new PedidoBuilder().build();

    const gatewayPagamento = {
      cobrar: jest.fn(() => new Promise(() => {}))
    };

    const pedidoRepository = {
      salvar: jest.fn(async (pedidoAtualizado) => ({ ...pedidoAtualizado, id: 202 }))
    };

    const emailService = {
      enviarConfirmacao: jest.fn(async () => true)
    };

    const service = new CheckoutService(
      gatewayPagamento,
      pedidoRepository,
      emailService,
      { timeoutMs: 5, backoffMs: 0, maxRetries: 0 }
    );

    const resultado = await service.processar(pedido);

    expect(gatewayPagamento.cobrar).toHaveBeenCalledTimes(1);

    expect(pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ERRO_GATEWAY' })
    );

    expect(emailService.enviarConfirmacao).not.toHaveBeenCalled();
    expect(resultado).toBeNull();
  });

  test('não bloqueia o retorno do checkout aguardando o envio de e-mail', async () => {
    const pedido = new PedidoBuilder().build();

    const gatewayPagamento = {
      cobrar: jest.fn(async () => ({ status: 'APROVADO' }))
    };

    const pedidoRepository = {
      salvar: jest.fn(async (pedidoAtualizado) => ({ ...pedidoAtualizado, id: 303 }))
    };

    const emailService = {
      enviarConfirmacao: jest.fn(() => new Promise(() => {}))
    };

    const service = new CheckoutService(
      gatewayPagamento,
      pedidoRepository,
      emailService,
      { timeoutMs: 50, backoffMs: 0 }
    );

    const resultado = await Promise.race([
      service.processar(pedido),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Checkout ficou bloqueado pelo e-mail')), 30)
      )
    ]);

    expect(resultado).toEqual(
      expect.objectContaining({ status: 'PROCESSADO' })
    );

    expect(emailService.enviarConfirmacao).toHaveBeenCalledTimes(1);
  });
});