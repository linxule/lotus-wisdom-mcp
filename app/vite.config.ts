import { defineConfig } from "vite";
import { singleFileApp } from "./single-file.ts";

export default defineConfig({
  plugins: [singleFileApp()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rolldownOptions: {
      input: "mcp-app.html",
    },
  },
});
