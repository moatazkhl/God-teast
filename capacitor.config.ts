import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.logmasaas.app',
  appName: 'لقمة ساس - Logma',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
