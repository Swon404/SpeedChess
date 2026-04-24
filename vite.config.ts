import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/SpeedChess/",
  server: {
    port: 5180,
    strictPort: true
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "SpeedChess",
        short_name: "SpeedChess",
        description: "Kid-friendly chess with timers, bots, and learning tools.",
        theme_color: "#1f2937",
        background_color: "#0f172a",
        display: "standalone",
        start_url: ".",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ],
  test: {
    globals: true,
    environment: "node"
  }
});
