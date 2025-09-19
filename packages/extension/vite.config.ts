import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-assets",
      generateBundle() {
        // Copy manifest.json to dist folder
        copyFileSync(
          resolve(__dirname, "manifest.json"),
          resolve(__dirname, "dist", "manifest.json")
        );
        
        // Create icons directory in dist if it doesn't exist
        const iconsDistDir = resolve(__dirname, "dist", "icons");
        if (!existsSync(iconsDistDir)) {
          mkdirSync(iconsDistDir, { recursive: true });
        }
        
        // Copy all icon files
        const iconSizes = ["16", "32", "48", "128"];
        iconSizes.forEach(size => {
          copyFileSync(
            resolve(__dirname, "icons", `icon-${size}.svg`),
            resolve(__dirname, "dist", "icons", `icon-${size}.svg`)
          );
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared/src'),
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "index.html"),
        options: resolve(__dirname, "options.html"),
        'content-script': resolve(__dirname, "src/content/content-script.ts"),
        'service-worker': resolve(__dirname, "src/background/standalone-service-worker.ts")
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'content-script') {
            return 'src/content/content-script.js';
          }
          if (chunkInfo.name === 'service-worker') {
            return 'src/background/service-worker.js';
          }
          return 'assets/[name]-[hash].js';
        }
      }
    }
  }
});
