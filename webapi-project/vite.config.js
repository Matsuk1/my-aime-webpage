import { defineConfig } from "vite";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  root: "public",
  publicDir: false,
  plugins: [
    {
      name: "copy-service-worker",
      closeBundle() {
        copyFileSync(resolve("public/sw.js"), resolve("dist/sw.js"));
      },
    },
  ],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
