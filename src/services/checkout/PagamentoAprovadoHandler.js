class PagamentoAprovadoHandler {
  constructor(pedidoRepository, emailService) {
    this.pedidoRepository = pedidoRepository;
    this.emailService = emailService;
  }

  async executar(pedido) {
    const pedidoProcessado = {
      ...pedido,
      status: 'PROCESSADO'
    };

    const pedidoSalvo = await this.pedidoRepository.salvar(pedidoProcessado);

    this.enviarConfirmacaoSemBloquearResposta(pedido.clienteEmail);

    return pedidoSalvo;
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
}

module.exports = { PagamentoAprovadoHandler };