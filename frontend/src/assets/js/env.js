// src/assets/env.js
(function(global) {
  global.__env = global.__env || {};
  global.__env.apiUrl = '${API_URL}';
  global.__env.gaMeasurementId = '${GA_MEASUREMENT_ID}';
  global.__env.production = true;
  global.__env.config = {
    authuser: 'auth-user',
    authtoken: 'auth-token'
  };
})(globalThis);
