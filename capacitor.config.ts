import type { CapacitorConfig } from "@capacitor/cli";

/**
 * StreamBox mobile app (Capacitor WebView wrapper).
 *
 * ⚠️ IMPORTANT — how the URL works:
 * StreamBox is a server app (it has /api/* routes that talk to the
 * MovieBox API), so the app loads a RUNNING web server, not static files.
 *
 *  1. ANDROID EMULATOR:  "http://10.0.2.2:3000"  (10.0.2.2 = your computer)
 *  2. REAL PHONE:        "http://YOUR-PC-LAN-IP:3000"  (phone + PC on same Wi-Fi)
 *  3. PRODUCTION (best): "https://your-streambox.vercel.app" (deploy once,
 *                        update this URL, rebuild — then it works anywhere)
 *
 * After changing the URL:  npm run build  &&  npx cap sync android
 */
const config: CapacitorConfig = {
  appId: "com.streambox.app",
  appName: "StreamBox",
  webDir: "out",
  server: {
    url: "http://10.0.2.2:3000",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
