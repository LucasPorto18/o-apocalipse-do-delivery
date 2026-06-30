import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    flush_cache: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      startTime: '5s',
      exec: 'flushCache'
    },

    checkout_massivo: {
      executor: 'constant-arrival-rate',
      rate: 200,
      timeUnit: '1s',
      duration: '50s',
      preAllocatedVUs: 200,
      maxVUs: 1000,
      exec: 'checkout'
    }
  },

  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.95']
  }
};

export function flushCache() {
  const res = http.post(`${BASE_URL}/api/v1/cache/flush`);

  check(res, {
    'cache flush respondeu 200': (r) => r.status === 200
  });
}

export function checkout() {
  const payload = JSON.stringify({
    clienteEmail: `herd-${__VU}-${__ITER}@teste.com`,
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
    'checkout respondeu 200': (r) => r.status === 200,
    'checkout abaixo de 5s': (r) => r.timings.duration < 5000
  });
}