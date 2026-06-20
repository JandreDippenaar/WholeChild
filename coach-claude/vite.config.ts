import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Local-first dev server. Open http://localhost:5180 in Chrome.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    open: false,
  },
});
