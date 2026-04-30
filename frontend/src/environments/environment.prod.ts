export const environment = {
  production: true,
  gaMeasurementId: (globalThis  as any).__env?.gaMeasurementId || 'G-Q6614CGTFQ',
  apiUrl: (globalThis  as any).__env?.apiUrl || 'http://192.168.1.126:8081',
  config: (globalThis  as any).__env?.config || {
    authuser: 'auth-user',
    authtoken: 'auth-token',
  }
};
