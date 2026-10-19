import eslintJs from "@eslint/js";
import prettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintDocsConfig = [
  {
    ignores: [
      ".forum/**",
      ".next/**",
      "node_modules/**",
      "flatpack-docs/scripts/**",
      "flatpack-docs/layers/**",
      "flatpack-docs/extensions/**",
      "mp-lb-run/scripts/**",
      "mp-lb-run/templates/**",
    ],
  },
  eslintJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.js", "**/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
  prettier,
];

export default eslintDocsConfig;
