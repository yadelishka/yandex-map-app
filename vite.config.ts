import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],

    server: {
      port: 3002,
      proxy: {
        "/yandex-api": {
          target: "https://api-maps.yandex.ru",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/yandex-api/, ""),
        },
      },
    },

    define: {
      "import.meta.env.VITE_YANDEX_API_KEY": JSON.stringify(
        env.VITE_YANDEX_API_KEY
      ),
    },
  };
});
