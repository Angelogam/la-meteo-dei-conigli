import { defineConfig } from "nitro";

export default defineConfig({
  serverDir: "./server",
  preset: "vercel",
  // Build for Vercel serverless functions
  rollupConfig: {
    external: ["nitro", "h3"],
  },
});
