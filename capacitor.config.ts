import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.meteodeiconigli.app',
  appName: 'Meteo dei Conigli',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    overrideUserAgent: 'MeteoConigli/1.0',
    backgroundColor: '#020617',
    toolbarColor: '#020617',
    navigationBarColor: '#020617',
    statusBarColor: '#020617',
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
    preferredContentMode: 'mobile',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#020617',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
  server: {
    cleartext: true,
    androidScheme: 'https',
  },
};

export default config;