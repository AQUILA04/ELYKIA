// Configuration injectée au démarrage du conteneur web (docker-entrypoint.sh).
// Dans l'APK, le pipeline remplace le placeholder par l'URL de l'environnement cible.
window.__CUSTOMER_SPACE_ENV__ = {
  apiUrl: '__CUSTOMER_SPACE_API_URL__',
};
