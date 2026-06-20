import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Local-first dev server. Open http://localhost:5180 in Chrome.
// VITE_BASE lets CI build under a sub-path (GitHub Pages: /WholeChild/coach/).
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  server: {
    port: 5180,
    open: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          charts: ["recharts"],
        },
      },
    },
  },
});
