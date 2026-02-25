// Factory for User data
export const createUserPayload = (overrides = {}) => ({
  username: 'testuser',
  password: 'password123',
  ...overrides,
});
