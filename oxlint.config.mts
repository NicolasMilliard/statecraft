import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";

export default defineConfig({
  env: { ...core.env, node: true },
  extends: [core, react],
  ignorePatterns: [...core.ignorePatterns, "media/**"],
  options: {
    denyWarnings: true,
    reportUnusedDisableDirectives: "error",
    typeAware: true,
  },
  overrides: [
    ...core.overrides,
    {
      // Scanner input deliberately has no installed framework dependencies.
      files: ["examples/storefront/**"],
      rules: {
        "typescript/no-unsafe-assignment": "off",
        "typescript/no-unsafe-call": "off",
        "typescript/no-unsafe-member-access": "off",
        "typescript/no-unsafe-return": "off",
        "typescript/no-unsafe-type-assertion": "off",
      },
    },
    {
      files: ["**/*.tsx"],
      rules: {
        "unicorn/filename-case": [
          "error",
          { cases: { pascalCase: true, kebabCase: true } },
        ],
      },
    },
    {
      files: ["**/use[A-Z]*.ts"],
      rules: {
        "unicorn/filename-case": ["error", { case: "camelCase" }],
      },
    },
  ],
  rules: {
    // Named declarations preserve hoisting and scanner entity identities.
    "func-style": ["error", "declaration", { allowArrowFunctions: true }],
    "no-use-before-define": ["error", { functions: false }],
    // The app uses React 19 without the optional React Compiler.
    "react/todo": "off",
    // Hook methods passed as props retain their domain names (editor.save, etc.).
    "react/jsx-handler-names": ["error", { eventHandlerPrefix: false }],
    // ARIA groups and the keyboard-managed combobox are intentional widgets.
    "jsx-a11y/prefer-tag-over-role": "off",
    // Named node:path imports keep the scanner's filesystem operations explicit.
    "unicorn/import-style": [
      "error",
      { styles: { "node:path": { named: true } } },
    ],
  },
});
