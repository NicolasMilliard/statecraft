import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [...ultracite.ignorePatterns, "media/**"],
  sortTailwindcss: {
    ...ultracite.sortTailwindcss,
    stylesheet: "./apps/web/src/index.css",
  },
});
