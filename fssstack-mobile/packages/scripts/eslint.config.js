import { createBaseEslintConfig } from "@mp-lb/fssstack-config/eslint";

export default createBaseEslintConfig({ project: ["./tsconfig.json"], tsconfigRootDir: import.meta.dirname });
