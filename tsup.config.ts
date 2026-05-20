import { defineConfig } from "tsup";
import { builtinModules } from "node:module";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  sourcemap: false,
  minify: false,
  dts: false,
  external: [
    "@myfinal/plugin-runtime",
    "@myfinal/shared",
    ...builtinModules,
    ...builtinModules.map((m) => `node:${m}`),
  ],
  noExternal: ["reflect-metadata", "puppeteer-core"],
  esbuildOptions(options) {
    // 在每个输出文件顶部注入 createRequire，使 CJS __require shim 能正确解析 Node 内置模块
    options.banner = {
      js: `import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);`,
    };
  },
});
