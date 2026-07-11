import { knipConfig } from "@adamhl8/configs"

// knip sees `fd` in the bun shell template. It's a system prerequisite, not a package dependency.
const config = knipConfig({ ignoreBinaries: ["fd"] })
export default config
