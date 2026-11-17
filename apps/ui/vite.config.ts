import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  lint: {
    ignorePatterns: ["dist/**"],
    options: { typeAware: true, typeCheck: true },
  },
});
