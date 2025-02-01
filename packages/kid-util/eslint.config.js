// @ts-check
import baseConfig from "@repo/eslint-config/base";
import tseslint from "typescript-eslint";

export default tseslint.config([
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.js", "jest.config.ts", "tsup.config.ts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    }
  },
  {
    ignores: ["**/dist/", "**/*.test.ts"],
  }
]);