import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.optimize.elykia',
  appName: 'Elykia-mobile',
  webDir: 'www',
  server: {
    // Permettre les requêtes HTTP en cleartext
    cleartext: true,
    // Permettre les requêtes vers des IPs locales
    allowNavigation: [
      'http://192.168.1.*',
      'http://192.168.100.*',
      'http://localhost:*',
      'http://127.0.0.1:*'
    ]
  },
  android: {
    // Permettre le trafic HTTP non chiffré
    allowMixedContent: true,
    // Capturer les erreurs réseau
    captureInput: true
  }
};

export default config;
