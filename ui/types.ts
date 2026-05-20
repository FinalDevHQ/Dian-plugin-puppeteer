// ── API 基础路径 ──────────────────────────────────────────────────────────────
export const API = "/plugins/puppeteer/api"

// ── 页面标识 ──────────────────────────────────────────────────────────────────
export type Page = "status" | "test" | "settings"

export const PAGE_META: Record<Page, { title: string; desc: string }> = {
  status:   { title: "仪表盘",   desc: "查看浏览器状态和渲染统计" },
  test:     { title: "截图调试", desc: "测试 HTML 渲染效果" },
  settings: { title: "系统设置", desc: "插件配置与环境管理" },
}

// ── Toast ─────────────────────────────────────────────────────────────────────
export type ToastType = "success" | "error" | "info"

// ── 后端数据类型 ──────────────────────────────────────────────────────────────
export interface BrowserStatus {
  connected: boolean
  mode: "local" | "remote"
  version?: string
  pageCount: number
  totalRenders: number
  failedRenders: number
  startTime?: number
}

export interface BrowserProxyConfig {
  server?: string
  username?: string
  password?: string
  bypassList?: string
}

export interface PluginConfig {
  enabled: boolean
  debug: boolean
  browser: {
    executablePath?: string
    browserWSEndpoint?: string
    defaultViewportWidth: number
    defaultViewportHeight: number
    maxPages: number
    proxy?: BrowserProxyConfig
  }
}

export interface ChromeStatus {
  installed: boolean
  executablePath?: string
  version?: string
  installing: boolean
  progress?: {
    status?: string
    message?: string
    progress?: number
    speed?: string
    error?: string
  }
}

// ── 工具函数 ──────────────────────────────────────────────────────────────────
export function fmtUptime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = String(Math.floor(s / 3600)).padStart(2, "0")
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0")
  const sec = String(s % 60).padStart(2, "0")
  return `${h}:${m}:${sec}`
}
