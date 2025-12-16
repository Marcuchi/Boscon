import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.boscon.app',
  appName: 'Boscon',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample", // Icono por defecto en Android (debe existir en res/drawable)
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
  },
};

export default config;