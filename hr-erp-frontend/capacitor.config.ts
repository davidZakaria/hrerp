import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.newjersey.hrerp',
  appName: 'HR ERP',
  webDir: 'build',
  server: {
    // Uncomment for live reload during development:
    // url: 'http://YOUR_IP:3000',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#667eea',
    },
  },
};

export default config;
