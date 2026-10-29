import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { nitro } from "nitro/vite";

/* CesiumJS (vista 3D del terreno): gli asset statici (Workers, Assets, Widgets,
   ThirdParty) sono serviti da public/cesium/ — creati da scripts/copy-cesium.cjs
   (postinstall, ignorati da git). CESIUM_BASE_URL dice alla libreria dove trovarli.
   La libreria entra nel bundle come chunk LAZY: viene scaricata solo quando la
   sezione 3D arriva nel viewport. */

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [dyadComponentTagger(), react(), nitro()],
  define: {
    CESIUM_BASE_URL: JSON.stringify("/cesium"),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
}));
