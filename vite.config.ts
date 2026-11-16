import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    plugins: ["eslint", "typescript", "unicorn", "oxc", "import", "react", "node", "promise"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    categories: {
      correctness: "error",
      suspicious: "error",
      pedantic: "error",
      perf: "error",
    },
    env: { builtin: true, es2024: true, node: true },
    ignorePatterns: ["dist/**", "raycast-env.d.ts"],
    rules: {
      // Type-aware rules (typescript-eslint strict-type-checked equivalents).
      "typescript/await-thenable": "error",
      "typescript/consistent-type-imports": "error",
      "typescript/no-floating-promises": "error",
      "typescript/no-misused-promises": "error",
      "typescript/no-unnecessary-condition": "error",
      "typescript/no-unnecessary-type-assertion": "error",
      "typescript/no-unsafe-argument": "error",
      "typescript/no-unsafe-assignment": "error",
      "typescript/no-unsafe-call": "error",
      "typescript/no-unsafe-member-access": "error",
      "typescript/no-unsafe-return": "error",
      "typescript/only-throw-error": "error",
      "typescript/prefer-nullish-coalescing": "error",
      "typescript/prefer-optional-chain": "error",
      "typescript/require-await": "error",
      "typescript/restrict-template-expressions": "error",
      "typescript/return-await": "error",
      "typescript/strict-boolean-expressions": "error",
      "typescript/switch-exhaustiveness-check": "error",
      "typescript/no-explicit-any": "error",
      "typescript/no-non-null-assertion": "error",
      "typescript/ban-ts-comment": "error",

      // General hygiene.
      eqeqeq: "error",
      "no-console": "error",
      "no-var": "error",
      "prefer-const": "error",
      "import/no-cycle": "error",
      "import/no-duplicates": "error",
      "vite-plus/prefer-vite-plus-imports": "error",

      // Raycast commands must be default exports, and React 17+ JSX needs no React import.
      "import/no-default-export": "off",
      "react/react-in-jsx-scope": "off",
      // Fires on third-party callback parameters (SDK and Node types) we can't make readonly.
      "typescript/prefer-readonly-parameter-types": "off",
    },
    overrides: [
      {
        files: ["scripts/**"],
        // CLI script: printing results is its job, and samples run one at a time on purpose.
        rules: { "no-console": "off", "no-await-in-loop": "off" },
      },
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    printWidth: 120,
    singleQuote: false,
    sortPackageJson: false,
    sortImports: {},
    ignorePatterns: ["raycast-env.d.ts"],
  },
});
