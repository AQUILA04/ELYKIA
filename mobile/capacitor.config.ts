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
    allowMixedContent: true,
    captureInput: true,
    // Réserve l'espace pour la barre de statut / navigation (edge-to-edge Android 15+)
    adjustMarginsForEdgeToEdge: 'force',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#ffffffff',
    },
  },
};

export default config;
