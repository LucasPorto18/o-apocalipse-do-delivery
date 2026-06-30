const { PedidoBuilder } = require('../builders/PedidoBuilder');
const {
  criarCheckoutServiceParaTeste,
  criarPedidoRepositoryMock,
  criarEmailServiceMock
} = require('../doubles/CheckoutDoubles');

describe('CheckoutService - Test Patterns e Clean Code', () => {
  test('processa pedido aprovado, salva no repositório e envia e-mail de confirmação', async () => {
    const pedido = new PedidoBuilder().build();

    const { service, gatewayPagamento, pedidoRepository, emailService } =
      criarCheckoutServiceParaTeste({
        respostasGateway: [{ status: 'APROVADO' }]
      });

    const resultado = await service.processar(pedido);

    expect(gatewayPagamento.cobrar).toHaveBeenCalledWith(
      pedido.valor,
      pedido.cartao
    );

    expect(pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PROCESSADO' })
    );

    expect(emailService.enviarConfirmacao).toHaveBeenCalledWith(
      pedido.clienteEmail,
      'Pagamento Aprovado'
    );

    expect(resultado).toEqual(
      expect.objectContaining({
        id: 101,
        status: 'PROCESSADO'
      })
    );
  });

  test('marca pedido como FALHOU quando o pagamento é recusado e não envia e-mail', async () => {
    const pedido = new PedidoBuilder().build();

    const { service, pedidoRepository, emailService } =
      criarCheckoutServiceParaTeste({
        respostasGateway: [{ status: 'RECUSADO' }]
      });

    const resultado = await service.processar(pedido);

    expect(pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FALHOU' })
    );

    expect(emailService.enviarConfirmacao).not.toHaveBeenCalled();
    expect(resultado).toBeNull();
  });

  test('realiza retry quando ocorre falha temporária no gateway e depois processa o pedido', async () => {
    const pedido = new PedidoBuilder().build();

    const { service, gatewayPagamento, pedidoRepository, emailService } =
      criarCheckoutServiceParaTeste({
        respostasGateway: [
          new Error('Gateway indisponível'),
          { status: 'APROVADO' }
        ],
        options: {
          maxRetries: 3
        }
      });

    const resultado = await service.processar(pedido);

    expect(gatewayPagamento.cobrar).toHaveBeenCalledTimes(2);

    expect(pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PROCESSADO' })
    );

    expect(emailService.enviarConfirmacao).toHaveBeenCalledTimes(1);

    expect(resultado).toEqual(
      expect.objectContaining({ status: 'PROCESSADO' })
    );
  });

  test('aciona fallback e marca ERRO_GATEWAY após esgotar as tentativas', async () => {
    const pedido = new PedidoBuilder().build();

    const { service, gatewayPagamento, pedidoRepository, emailService } =
      criarCheckoutServiceParaTeste({
        respostasGateway: [
          new Error('Erro de infraestrutura'),
          new Error('Erro de infraestrutura'),
          new Error('Erro de infraestrutura'),
          new Error('Erro de infraestrutura')
        ],
        options: {
          maxRetries: 3
        }
      });

    const resultado = await service.processar(pedido);

    expect(gatewayPagamento.cobrar).toHaveBeenCalledTimes(4);

    expect(pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ERRO_GATEWAY' })
    );

    expect(emailService.enviarConfirmacao).not.toHaveBeenCalled();
    expect(resultado).toBeNull();
  });

  test('interrompe a cobrança por timeout e salva o pedido como ERRO_GATEWAY', async () => {
    const pedido = new PedidoBuilder().build();

    const pedidoRepository = criarPedidoRepositoryMock({ idGerado: 202 });
    const emailService = criarEmailServiceMock();

    const { service, gatewayPagamento } = criarCheckoutServiceParaTeste({
      respostasGateway: [() => new Promise(() => {})],
      pedidoRepository,
      emailService,
      options: {
        timeoutMs: 5,
        maxRetries: 0
      }
    });

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

    const pedidoRepository = criarPedidoRepositoryMock({ idGerado: 303 });
    const emailService = criarEmailServiceMock({ travarEnvio: true });

    const { service } = criarCheckoutServiceParaTeste({
      respostasGateway: [{ status: 'APROVADO' }],
      pedidoRepository,
      emailService
    });

    const resultado = await Promise.race([
      service.processar(pedido),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Checkout ficou bloqueado pelo e-mail')),
          30
        )
      )
    ]);

    expect(resultado).toEqual(
      expect.objectContaining({ status: 'PROCESSADO' })
    );

    expect(emailService.enviarConfirmacao).toHaveBeenCalledTimes(1);
  });
});