import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.courseforge.app',
  appName: 'CourseForge',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
};

export default config;
