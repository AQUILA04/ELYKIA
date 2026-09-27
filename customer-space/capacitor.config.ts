import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.optimize.elykia.customer',
  appName: 'ELYKIA Client',
  webDir: 'www',
  plugins: {
    Geolocation: {
      // Demande runtime Android via @capacitor/geolocation.requestPermissions()
    },
  },
};

export default config;
