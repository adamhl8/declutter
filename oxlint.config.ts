import { oxlintConfig } from "@adamhl8/configs"
import { defineConfig } from "oxlint"

const config = oxlintConfig({
  overrides: [
    {
      files: ["src/index.ts"],
      rules: { "no-await-in-loop": "off" },
    },
  ],
})

export default defineConfig(config)
