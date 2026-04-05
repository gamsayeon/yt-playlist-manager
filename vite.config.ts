import { defineConfig, loadEnv } from "vite";
import webExtension from "vite-plugin-web-extension";
import manifest from "./manifest.config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      webExtension({
        manifest: () => ({
          ...manifest,
          oauth2: {
            ...manifest.oauth2,
            client_id: env.VITE_OAUTH_CLIENT_ID || "",
          },
        }),
      }),
    ],
  };
});