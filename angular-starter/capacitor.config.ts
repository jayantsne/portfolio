import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tech.learnwithai.app',
  appName: 'LearnWithAI',
  webDir: 'dist/angular-starter',
  server: { androidScheme: 'https' },
  plugins: {
    SystemBars: {
      hidden: true,
      insetsHandling: 'disable'
    }
  }
};

export default config;
