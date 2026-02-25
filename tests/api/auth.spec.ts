import { test, expect } from '@playwright/test';

test.describe('Authentication API', () => {
  const BASE_URL = process.env.API_URL || 'http://localhost:8080';

  test('POST /api/auth/signin - should return token for valid credentials', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/signin`, {
      data: {
        username: 'admin', // Replace with valid test user
        password: 'password' // Replace with valid test password
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
    expect(body).toHaveProperty('username');
  });

  test('POST /api/auth/signin - should return 401 for invalid credentials', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/auth/signin`, {
      data: {
        username: 'wronguser',
        password: 'wrongpassword'
      }
    });

    // Note: Spring Security might return 401 or 403 depending on config
    expect([401, 403]).toContain(response.status());
  });
});
