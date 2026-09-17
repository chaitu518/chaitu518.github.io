// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Your GitHub Pages URL. Because the repo is named "chaitu518.github.io",
  // the site serves at the root, so no `base` is needed.
  site: 'https://chaitu518.github.io',
  build: {
    format: 'directory',
  },
});
