// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Set to the real domain when deploying (used for canonical/hreflang URLs).
  site: 'https://yakikotoba.example',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
