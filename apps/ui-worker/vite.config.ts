import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
export default defineConfig({
  plugins: [
    react(),
    cloudflare({
      viteEnvironment: { name: 'ssr' },
      auxiliaryWorkers: [
        { configPath: '../domain-api-worker/wrangler.jsonc' },
        { configPath: '../wingman-agent-worker/wrangler.jsonc' },
        { configPath: '../po-workflow-worker/wrangler.jsonc' },
        { configPath: '../dev-agent-worker/wrangler.jsonc' },
      ],
    }),
  ],
});
