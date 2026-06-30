const { PagamentoAprovadoHandler } = require('../../src/services/checkout/PagamentoAprovadoHandler');
const { PagamentoRecusadoHandler } = require('../../src/services/checkout/PagamentoRecusadoHandler');
const { PagamentoStatusHandlerFactory } = require('../../src/services/checkout/PagamentoStatusHandlerFactory');
const { PedidoBuilder } = require('../builders/PedidoBuilder');

describe('Handlers de pagamento', () => {
  test('PagamentoAprovadoHandler salva pedido como PROCESSADO e envia e-mail', async () => {
    const pedido = new PedidoBuilder().build();

    const pedidoRepository = {
      salvar: jest.fn(async (pedidoAtualizado) => ({
        ...pedidoAtualizado,
        id: 1
      }))
    };

    const emailService = {
      enviarConfirmacao: jest.fn(async () => true)
    };

    const handler = new PagamentoAprovadoHandler(
      pedidoRepository,
      emailService
    );

    const resultado = await handler.executar(pedido);

    expect(pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PROCESSADO'
      })
    );

    expect(emailService.enviarConfirmacao).toHaveBeenCalledWith(
      pedido.clienteEmail,
      'Pagamento Aprovado'
    );

    expect(resultado).toEqual(
      expect.objectContaining({
        id: 1,
        status: 'PROCESSADO'
      })
    );
  });

  test('PagamentoAprovadoHandler não quebra o fluxo quando o e-mail lança erro síncrono', async () => {
    const pedido = new PedidoBuilder().build();

    const pedidoRepository = {
      salvar: jest.fn(async (pedidoAtualizado) => ({
        ...pedidoAtualizado,
        id: 2
      }))
    };

    const emailService = {
      enviarConfirmacao: jest.fn(() => {
        throw new Error('Erro no serviço de e-mail');
      })
    };

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const handler = new PagamentoAprovadoHandler(
      pedidoRepository,
      emailService
    );

    const resultado = await handler.executar(pedido);

    expect(resultado).toEqual(
      expect.objectContaining({
        id: 2,
        status: 'PROCESSADO'
      })
    );

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('PagamentoAprovadoHandler não quebra o fluxo quando o envio de e-mail rejeita promise', async () => {
    const pedido = new PedidoBuilder().build();

    const pedidoRepository = {
      salvar: jest.fn(async (pedidoAtualizado) => ({
        ...pedidoAtualizado,
        id: 3
      }))
    };

    const emailService = {
      enviarConfirmacao: jest.fn(() =>
        Promise.reject(new Error('Falha assíncrona no e-mail'))
      )
    };

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const handler = new PagamentoAprovadoHandler(
      pedidoRepository,
      emailService
    );

    const resultado = await handler.executar(pedido);

    await new Promise((resolve) => setImmediate(resolve));

    expect(resultado).toEqual(
      expect.objectContaining({
        id: 3,
        status: 'PROCESSADO'
      })
    );

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('PagamentoRecusadoHandler salva pedido como FALHOU e retorna null', async () => {
    const pedido = new PedidoBuilder().build();

    const pedidoRepository = {
      salvar: jest.fn(async (pedidoAtualizado) => ({
        ...pedidoAtualizado,
        id: 4
      }))
    };

    const handler = new PagamentoRecusadoHandler(pedidoRepository);

    const resultado = await handler.executar(pedido);

    expect(pedidoRepository.salvar).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FALHOU'
      })
    );

    expect(resultado).toBeNull();
  });

  test('factory retorna handler de aprovado quando status é APROVADO', () => {
    const pedidoRepository = {
      salvar: jest.fn()
    };

    const emailService = {
      enviarConfirmacao: jest.fn()
    };

    const factory = new PagamentoStatusHandlerFactory(
      pedidoRepository,
      emailService
    );

    const handler = factory.obterHandler({ status: 'APROVADO' });

    expect(handler).toBeInstanceOf(PagamentoAprovadoHandler);
  });

  test('factory retorna handler padrão quando status não é APROVADO', () => {
    const pedidoRepository = {
      salvar: jest.fn()
    };

    const emailService = {
      enviarConfirmacao: jest.fn()
    };

    const factory = new PagamentoStatusHandlerFactory(
      pedidoRepository,
      emailService
    );

    const handler = factory.obterHandler({ status: 'RECUSADO' });

    expect(handler).toBeInstanceOf(PagamentoRecusadoHandler);
  });

  test('factory retorna handler padrão quando resposta do gateway é vazia', () => {
    const pedidoRepository = {
      salvar: jest.fn()
    };

    const emailService = {
      enviarConfirmacao: jest.fn()
    };

    const factory = new PagamentoStatusHandlerFactory(
      pedidoRepository,
      emailService
    );

    const handler = factory.obterHandler(null);

    expect(handler).toBeInstanceOf(PagamentoRecusadoHandler);
  });
});