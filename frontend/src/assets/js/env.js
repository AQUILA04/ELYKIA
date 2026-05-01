// src/assets/js/env.js
// TEMPLATE FILE — do NOT use ${VAR} shell syntax here.
// At container startup, the Docker entrypoint replaces __API_URL__ and
// __GA_MEASUREMENT_ID__ with the actual environment variable values via sed/envsubst.
// See frontend/docker-entrypoint.sh for the substitution logic.
(function(global) {
  global.__env = global.__env || {};
  global.__env.apiUrl = '__API_URL__';
  global.__env.gaMeasurementId = '__GA_MEASUREMENT_ID__';
  global.__env.production = true;
  global.__env.config = {
    authuser: 'auth-user',
    authtoken: 'auth-token'
  };
})(globalThis);
