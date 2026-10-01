import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    reservation_rush: {
      executor: 'per-vu-iterations',
      vus: 1000,
      iterations: 1,
      maxDuration: '30s',
    },
  },
};

const BASE_URL = 'http://localhost:3001/api'; // Or your deployed URL

export default function () {
  const vuId = __VU; // virtual user ID
  
  // 1. Authenticate (Assume we have a way to generate users or login, in this case, we register a new user on the fly or login)
  // For a pure load test, it's better to pre-register users and pass tokens, but here is a simple flow:
  const username = `k6_user_${__ITER}_${vuId}`;
  
  const authRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
    username,
    password: 'password123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  // Extract JWT from Set-Cookie header or response body (depending on impl)
  const token = authRes.cookies['jwt'] ? authRes.cookies['jwt'][0].value : '';
  const cookieHeader = authRes.headers['Set-Cookie'];

  // 2. Attempt reservation
  const res = http.post(`${BASE_URL}/reservations`, JSON.stringify({
    productId: 'TARGET_PRODUCT_ID', // Replaced before running
    size: 42
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader || '',
    },
  });

  check(res, {
    'reservation successful': (r) => r.status === 200,
    'waitlisted': (r) => r.status === 409 && r.body.includes('waitlist'),
    'inventory exhausted': (r) => r.status === 409 || r.status === 404,
  });
}
