import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native app wrapper (Play Store / App Store).
 *
 * The web app is a TanStack Start SSR application, so the native WebView loads
 * the LIVE website URL instead of bundled static files. This keeps every
 * server-rendered feature working (auth, Razorpay, orders) and means any change
 * you push to the website shows up in the app instantly.
 *
 * Set your real production domain below (e.g. https://retailgrandzone.vercel.app).
 */
const APP_URL = process.env.CAPACITOR_APP_URL ?? "https://www.thegrandzone.shop";

const config: CapacitorConfig = {
  appId: "com.grandzone.store",
  appName: "The Grand Zone",
  webDir: "dist",
  server: {
    url: APP_URL,
    cleartext: false,
  },
  android: {
    backgroundColor: "#0d0d0d",
  },
  ios: {
    backgroundColor: "#0d0d0d",
  },
};

export default config;
