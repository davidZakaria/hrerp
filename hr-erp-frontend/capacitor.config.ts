import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.newjersey.hrerp',
  appName: 'HR ERP',
  webDir: 'build',
  // Live reload when CAPACITOR_DEV=1 (10.0.2.2 = host from Android emulator)
  // For physical device: set CAPACITOR_SERVER_URL=http://YOUR_LAN_IP:3000
  ...(process.env.CAPACITOR_DEV === '1' && {
    server: {
      url: process.env.CAPACITOR_SERVER_URL || 'http://10.0.2.2:3000',
      cleartext: true,
    },
  }),
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
