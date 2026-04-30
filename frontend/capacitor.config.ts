import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kz.diploma.delivery',
  appName: 'Доставка Курьер',
  webDir: 'dist',
  plugins: {
    BackgroundGeolocation: {
      backgroundMessage: 'Передаём ваше местоположение диспетчеру',
      backgroundTitle: 'Доставка активна',
      requestPermissions: true,
      stale: false,
      distanceFilter: 10, // обновлять каждые 10 метров
    },
  },
};

export default config;
