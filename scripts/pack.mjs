/**
 * 将 dist/ 目录打包为可安装的 ZIP 文件（使用 fflate，纯 JS，跨平台）。
 * 用法：node scripts/pack.mjs
 */
import { zip } from "fflate";
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
  unlinkSync,
  cpSync,
  mkdirSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");

// 复制 UI 文件到 dist
const UI_SRC = resolve(ROOT, "src", "ui");
const UI_DIST = resolve(DIST, "ui");
if (existsSync(UI_SRC)) {
  if (!existsSync(UI_DIST)) {
    mkdirSync(UI_DIST, { recursive: true });
  }
  cpSync(UI_SRC, UI_DIST, { recursive: true });
  console.log("✅ 已复制 UI 文件到 dist/ui");
}

// 读取 package.json 并清理
const pkgPath = resolve(ROOT, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const pluginName = pkg.name;
const zipFile = resolve(ROOT, `${pluginName}.zip`);

if (existsSync(zipFile)) unlinkSync(zipFile);

/**
 * 递归收集目录下所有文件，返回 { 相对路径: Buffer } 映射。
 * @param {string} dir  扫描目录
 * @param {string} base 相对于 ZIP 根的前缀
 * @returns {Record<string, Buffer>}
 */
function collectFiles(dir, base = "") {
  /** @type {Record<string, Buffer>} */
  const result = {};
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    if (statSync(full).isDirectory()) {
      Object.assign(result, collectFiles(full, rel));
    } else {
      result[rel] = readFileSync(full);
    }
  }
  return result;
}

const files = collectFiles(DIST);

if (Object.keys(files).length === 0) {
  console.error("错误：dist/ 目录为空或不存在，请先执行 npm run build。");
  process.exit(1);
}

// 把 package.json 放到 zip 根目录，供运行时读取版本号等元数据
files["package.json"] = readFileSync(pkgPath);

// 转换为 fflate 所需格式：{ 路径: [Uint8Array, options] }
/** @type {import("fflate").AsyncZippable} */
const zippable = {};
for (const [name, buf] of Object.entries(files)) {
  zippable[name] = [new Uint8Array(buf), { level: 6 }];
}

zip(zippable, (err, data) => {
  if (err) {
    console.error("打包失败：", err.message);
    process.exit(1);
  }
  writeFileSync(zipFile, data);
  console.log(`\n打包完成：${pluginName}.zip`);
  console.log(`安装方法：`);
  console.log(`  - 推荐：在 Dian Web UI「插件」页点「上传插件」选择 ${pluginName}.zip，框架会自动热加载，无需重启`);
  console.log(`  - 或手动：将 ${pluginName}.zip 解压到 Dian 项目的 plugins/${pluginName}/ 目录，文件监听会自动识别新插件\n`);
});
