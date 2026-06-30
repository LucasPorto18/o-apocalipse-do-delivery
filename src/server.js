const express = require('express');
const { CheckoutService } = require('./services/CheckoutService');

const app = express();
app.use(express.json());

let cacheVersion = 1;

const gatewayPagamento = {
  cobrar: async (valor, cartao) => {
    const gatewayUrl = process.env.GATEWAY_URL;

    if (!gatewayUrl) {
      return new Promise((resolve) =>
        setTimeout(() => resolve({ status: 'APROVADO' }), 300)
      );
    }

    const resposta = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ valor, cartao })
    });

    if (!resposta.ok) {
      throw new Error(`Gateway retornou HTTP ${resposta.status}`);
    }

    return resposta.json();
  }
};

const pedidoRepositoryMock = {
  salvar: async (pedido) => {
    return {
      ...pedido,
      id: Math.floor(Math.random() * 10000),
      cacheVersion
    };
  }
};

const emailServiceMock = {
  enviarConfirmacao: async (email) => {
    console.log(`E-mail enviado para ${email}`);
    return true;
  }
};

const checkoutService = new CheckoutService(
  gatewayPagamento,
  pedidoRepositoryMock,
  emailServiceMock,
  {
    timeoutMs: Number(process.env.CHECKOUT_TIMEOUT_MS || 1000),
    maxRetries: Number(process.env.CHECKOUT_MAX_RETRIES || 1),
    backoffMs: Number(process.env.CHECKOUT_BACKOFF_MS || 100)
  }
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'checkout' });
});

app.post('/api/v1/checkout', async (req, res) => {
  const { clienteEmail, valor, cartao } = req.body;

  if (!clienteEmail || !valor || !cartao) {
    return res.status(400).json({ erro: 'Dados incompletos para checkout' });
  }

  const pedido = {
    clienteEmail,
    valor,
    cartao,
    status: 'PENDENTE'
  };

  const resultado = await checkoutService.processar(pedido);

  if (resultado && resultado.status === 'PROCESSADO') {
    return res.status(200).json({
      mensagem: 'Pedido finalizado com sucesso!',
      pedido: resultado
    });
  }

  return res.status(500).json({
    erro: 'Não foi possível processar seu pagamento. Tente mais tarde.'
  });
});

app.post('/api/v1/cache/flush', (req, res) => {
  cacheVersion += 1;

  console.log('CACHE LIMPO ABRUPTAMENTE! Nova versão:', cacheVersion);

  res.json({
    status: 'cache_invalidated',
    cacheVersion
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor da EntregasJá rodando na porta ${PORT}`);
});