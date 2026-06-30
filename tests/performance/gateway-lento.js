import http from 'k6/http';
import { check, sleep } from 'k6';

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 599 }));

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '20s', target: 30 },
    { duration: '1m', target: 30 },
    { duration: '20s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    checks: ['rate>0.90']
  }
};

export default function () {
  const payload = JSON.stringify({
    clienteEmail: `chaos-${__VU}-${__ITER}@teste.com`,
    valor: 89.9,
    cartao: {
      numero: '4111111111111111',
      validade: '12/30',
      cvv: '123'
    }
  });

  const res = http.post(`${BASE_URL}/api/v1/checkout`, payload, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  check(res, {
    'resposta controlada 200 ou 500': (r) => r.status === 200 || r.status === 500,
    'não travou acima de 5s': (r) => r.timings.duration < 5000
  });

  sleep(1);
}