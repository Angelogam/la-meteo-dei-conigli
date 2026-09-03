import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.meteodeiconigli.app',
  appName: 'Meteo dei Conigli',
  webDir: 'dist',
  webRoot: '/',
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
    backgroundColor: '#020617',
  },
}