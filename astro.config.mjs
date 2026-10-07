// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://shinnosuke-k.github.io",
  base: "/precon-clinics-tokyo",
  trailingSlash: "always",
  integrations: [sitemap()],
  build: {
    // ページを c/1.html ではなく c/1/index.html に出す（URLは /c/1/）
    format: "directory",
  },
});
