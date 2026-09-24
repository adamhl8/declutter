import { tsdownConfig } from "@adamhl8/configs"
import { defineConfig } from "tsdown"

const config = tsdownConfig({ platform: "node", dts: false, attw: false })

export default defineConfig(config)
