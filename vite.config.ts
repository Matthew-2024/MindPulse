import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5180,
    strictPort: false
  },
  preview: {
    host: "127.0.0.1",
    port: 5181,
    strictPort: false
  },
  build: {
    target: "es2020",
    sourcemap: true
  }
});
