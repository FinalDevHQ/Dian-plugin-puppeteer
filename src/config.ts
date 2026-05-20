/**
 * 插件配置模块
 * 定义默认配置和配置加载/保存逻辑
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { PluginConfig, BrowserConfig } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, "config.json");

/** 默认浏览器启动参数 */
const DEFAULT_BROWSER_ARGS = [
  '--disable-gpu',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--no-zygote',
  '--disable-extensions',
  '--disable-dev-shm-usage',
  '--disable-background-networking',
  '--disable-sync',
  '--disable-crash-reporter',
  '--disable-translate',
  '--disable-notifications',
  '--disable-device-discovery-notifications',
  '--disable-accelerated-2d-canvas',
];

/** 默认浏览器配置 */
export const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  executablePath: '',
  browserWSEndpoint: '',
  headless: true,
  args: DEFAULT_BROWSER_ARGS,
  maxPages: 10,
  timeout: 30000,
  defaultViewportWidth: 800,
  defaultViewportHeight: 600,
  deviceScaleFactor: 1,
};

/** 默认配置 */
export const DEFAULTS: PluginConfig = {
  enabled: true,
  browser: { ...DEFAULT_BROWSER_CONFIG },
  debug: false,
};

// 浏览器路径检测已移至 services/chrome-installer.ts

/**
 * 类型守卫：判断是否为对象
 */
function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}

/**
 * 配置清洗函数
 * 确保从文件读取的配置符合预期类型
 */
function sanitizeConfig(raw: unknown): PluginConfig {
  if (!isObject(raw)) return getDefaultConfig();
  const base = getDefaultConfig();
  const out: PluginConfig = { ...base };

  // enabled
  if (typeof raw['enabled'] === 'boolean') {
    out.enabled = raw['enabled'];
  }

  // debug
  if (typeof raw['debug'] === 'boolean') {
    out.debug = raw['debug'];
  }

  // browser config
  const rawBrowser = raw['browser'];
  if (isObject(rawBrowser)) {
    const browserConfig: BrowserConfig = { ...DEFAULT_BROWSER_CONFIG };
    const b = rawBrowser as Record<string, unknown>;

    if (typeof b['executablePath'] === 'string') {
      browserConfig.executablePath = b['executablePath'];
    }
    if (typeof b['browserWSEndpoint'] === 'string') {
      browserConfig.browserWSEndpoint = b['browserWSEndpoint'];
    }
    if (typeof b['headless'] === 'boolean') {
      browserConfig.headless = b['headless'];
    }
    if (Array.isArray(b['args'])) {
      browserConfig.args = b['args'] as string[];
    }
    if (typeof b['maxPages'] === 'number' && b['maxPages'] > 0) {
      browserConfig.maxPages = b['maxPages'];
    }
    if (typeof b['timeout'] === 'number' && b['timeout'] > 0) {
      browserConfig.timeout = b['timeout'];
    }
    if (typeof b['defaultViewportWidth'] === 'number' && b['defaultViewportWidth'] > 0) {
      browserConfig.defaultViewportWidth = b['defaultViewportWidth'];
    }
    if (typeof b['defaultViewportHeight'] === 'number' && b['defaultViewportHeight'] > 0) {
      browserConfig.defaultViewportHeight = b['defaultViewportHeight'];
    }
    if (typeof b['deviceScaleFactor'] === 'number' && b['deviceScaleFactor'] > 0) {
      browserConfig.deviceScaleFactor = b['deviceScaleFactor'];
    }

    // proxy config
    const rawProxy = b['proxy'];
    if (isObject(rawProxy)) {
      const proxy = rawProxy as Record<string, unknown>;
      browserConfig.proxy = {
        server: typeof proxy['server'] === 'string' ? proxy['server'] : undefined,
        username: typeof proxy['username'] === 'string' ? proxy['username'] : undefined,
        password: typeof proxy['password'] === 'string' ? proxy['password'] : undefined,
        bypassList: typeof proxy['bypassList'] === 'string' ? proxy['bypassList'] : undefined,
      };
    }

    out.browser = browserConfig;
  }

  return out;
}

/**
 * 获取默认配置的副本
 */
export function getDefaultConfig(): PluginConfig {
  return {
    ...DEFAULTS,
    browser: { ...DEFAULT_BROWSER_CONFIG },
  };
}

/**
 * 加载配置
 */
export function loadConfig(): PluginConfig {
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
      return sanitizeConfig(raw);
    }
  } catch {
    /* 读取失败时使用默认值 */
  }
  return getDefaultConfig();
}

/**
 * 保存配置
 */
export function saveConfig(cfg: PluginConfig): void {
  try {
    const configDir = dirname(CONFIG_PATH);
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (error) {
    console.error('[puppeteer] 保存配置失败:', error);
  }
}
