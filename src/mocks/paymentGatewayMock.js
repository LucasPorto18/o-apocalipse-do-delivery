const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4001;
const DELAY_MS = Number(process.env.PAYMENT_GATEWAY_DELAY_MS || 300);

app.post('/charge', async (req, res) => {
  const { valor, cartao } = req.body;

  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));

  if (!valor || !cartao) {
    return res.status(400).json({ status: 'RECUSADO', motivo: 'Dados inválidos' });
  }

  if (cartao.numero === '4000000000000002') {
    return res.json({ status: 'RECUSADO' });
  }

  return res.json({ status: 'APROVADO' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'payment-gateway-mock' });
});

app.listen(PORT, () => {
  console.log(`Gateway de pagamento mock rodando na porta ${PORT}`);
});