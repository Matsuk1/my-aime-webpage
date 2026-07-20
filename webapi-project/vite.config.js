import { defineConfig } from "vite";
import { copyFileSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  root: "public",
  publicDir: false,
  plugins: [
    {
      name: "copy-service-worker",
      closeBundle() {
        const assetsDir = resolve("dist/assets");
        for (const file of readdirSync(assetsDir)) {
          if (file.startsWith("ort-wasm") && file.endsWith(".wasm")) {
            rmSync(resolve(assetsDir, file));
          }
        }

        copyFileSync(resolve("public/sw.js"), resolve("dist/sw.js"));
      },
    },
  ],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
