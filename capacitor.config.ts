import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.superaaryanadventure.game',
  appName: 'Super Aaryan Adventure',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
