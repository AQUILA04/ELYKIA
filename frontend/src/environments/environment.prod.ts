export const environment = {
  production: true,
  gaMeasurementId: (globalThis  as any).__env?.gaMeasurementId || 'G-Q6614CGTFQ',
  apiUrl: (globalThis  as any).__env?.apiUrl || 'http://159.89.225.112/api',
  config: (globalThis  as any).__env?.config || {
    authuser: 'auth-user',
    authtoken: 'auth-token',
  }
};
