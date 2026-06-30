const { PedidoBuilder } = require('../builders/PedidoBuilder');
const {
  criarCheckoutServiceParaTeste
} = require('../doubles/CheckoutDoubles');

describe('CheckoutService - testes adicionais para mutação', () => {
  test('trata resposta vazia do gateway como pagamento recusado', async () => {
    const pedido = new PedidoBuilder().build();

    const { service, pedidoRepository, emailService } =
      criarCheckoutServiceParaTeste({
        respostasGateway: [null]
      });

    const resultado = await service.processar(pedido);

    expect(pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FALHOU'
      })
    );

    expect(emailService.enviarConfirmacao).not.toHaveBeenCalled();
    expect(resultado).toBeNull();
  });

  test('respeita maxRetries igual a zero e tenta cobrar apenas uma vez', async () => {
    const pedido = new PedidoBuilder().build();

    const { service, gatewayPagamento, pedidoRepository } =
      criarCheckoutServiceParaTeste({
        respostasGateway: [
          new Error('Gateway fora do ar'),
          { status: 'APROVADO' }
        ],
        options: {
          maxRetries: 0,
          backoffMs: 0
        }
      });

    const resultado = await service.processar(pedido);

    expect(gatewayPagamento.cobrar).toHaveBeenCalledTimes(1);

    expect(pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ERRO_GATEWAY'
      })
    );

    expect(resultado).toBeNull();
  });

  test('respeita maxRetries igual a um e tenta cobrar duas vezes', async () => {
    const pedido = new PedidoBuilder().build();

    const { service, gatewayPagamento, pedidoRepository } =
      criarCheckoutServiceParaTeste({
        respostasGateway: [
          new Error('Falha temporária'),
          new Error('Falha novamente')
        ],
        options: {
          maxRetries: 1,
          backoffMs: 0
        }
      });

    const resultado = await service.processar(pedido);

    expect(gatewayPagamento.cobrar).toHaveBeenCalledTimes(2);

    expect(pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ERRO_GATEWAY'
      })
    );

    expect(resultado).toBeNull();
  });

  test('usa backoff quando existe nova tentativa configurada', async () => {
    const pedido = new PedidoBuilder().build();

    const inicio = Date.now();

    const { service, gatewayPagamento } =
      criarCheckoutServiceParaTeste({
        respostasGateway: [
          new Error('Falha temporária'),
          { status: 'APROVADO' }
        ],
        options: {
          maxRetries: 1,
          backoffMs: 20
        }
      });

    const resultado = await service.processar(pedido);
    const duracao = Date.now() - inicio;

    expect(gatewayPagamento.cobrar).toHaveBeenCalledTimes(2);
    expect(duracao).toBeGreaterThanOrEqual(15);

    expect(resultado).toEqual(
      expect.objectContaining({
        status: 'PROCESSADO'
      })
    );
  });

  test('não aplica backoff quando não haverá nova tentativa', async () => {
    const pedido = new PedidoBuilder().build();

    const inicio = Date.now();

    const { service, gatewayPagamento, pedidoRepository } =
      criarCheckoutServiceParaTeste({
        respostasGateway: [
          new Error('Falha definitiva')
        ],
        options: {
          maxRetries: 0,
          backoffMs: 50
        }
      });

    const resultado = await service.processar(pedido);
    const duracao = Date.now() - inicio;

    expect(gatewayPagamento.cobrar).toHaveBeenCalledTimes(1);
    expect(duracao).toBeLessThan(50);

    expect(pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ERRO_GATEWAY'
      })
    );

    expect(resultado).toBeNull();
  });

  test('usa timeout configurado para interromper gateway lento', async () => {
    const pedido = new PedidoBuilder().build();

    const inicio = Date.now();

    const { service, gatewayPagamento, pedidoRepository } =
      criarCheckoutServiceParaTeste({
        respostasGateway: [
          () => new Promise(() => {})
        ],
        options: {
          timeoutMs: 10,
          maxRetries: 0,
          backoffMs: 0
        }
      });

    const resultado = await service.processar(pedido);
    const duracao = Date.now() - inicio;

    expect(gatewayPagamento.cobrar).toHaveBeenCalledTimes(1);
    expect(duracao).toBeGreaterThanOrEqual(8);

    expect(pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ERRO_GATEWAY'
      })
    );

    expect(resultado).toBeNull();
  });
});