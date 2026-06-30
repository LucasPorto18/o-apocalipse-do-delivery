import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95']
  }
};

export default function () {
  const payload = JSON.stringify({
    clienteEmail: `cliente-${__VU}-${__ITER}@teste.com`,
    valor: 89.9,
    cartao: {
      numero: '4111111111111111',
      validade: '12/30',
      cvv: '123'
    }
  });

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const res = http.post(`${BASE_URL}/api/v1/checkout`, payload, params);

  check(res, {
    'status é 200': (r) => r.status === 200,
    'tempo menor que 5s': (r) => r.timings.duration < 5000
  });

  sleep(1);
}