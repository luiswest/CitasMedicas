import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.west.citasmedicas',
  appName: 'Citas Médicas',
  webDir: 'dist/Presentation/browser',
  server: {
    // La WebView sirve la app desde http://localhost (no https) para que las
    // llamadas a la capa Business por HTTP no sean bloqueadas como "mixed content".
    androidScheme: 'http',
    // Permite tráfico HTTP sin cifrar hacia la API (10.0.2.2 / IP de la LAN).
    cleartext: true,
  },  
};

export default config;
