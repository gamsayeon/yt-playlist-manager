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
          ...(env.VITE_EXTENSION_KEY ? { key: env.VITE_EXTENSION_KEY } : {}),
          oauth2: {
            ...manifest.oauth2,
            ...(env.VITE_OAUTH_CLIENT_ID ? { client_id: env.VITE_OAUTH_CLIENT_ID } : manifest.oauth2.client_id ? {} : {}),
          },
        }),
      }),
    ],
  };
});