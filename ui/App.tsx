import { useState, useEffect } from "react"
import { useToast } from "./hooks/useToast"
import { DashboardPage } from "./pages/DashboardPage"
import { TestPage } from "./pages/TestPage"
import { SettingsPage } from "./pages/SettingsPage"
import { DocsPage } from "./pages/DocsPage"
import { API, PAGE_META, apiFetch } from "./types"
import type { Page } from "./types"

// ── Nav items ──────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode }[] = [
  {
    id: "status",
    label: "仪表盘",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "test",
    label: "截图调试",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "系统设置",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    id: "docs",
    label: "接口文档",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
]

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>("status")
  const [connected, setConnected] = useState<boolean | null>(null)
  const { showToast, ToastContainer } = useToast()

  useEffect(() => {
    const check = async () => {
      try {
        const res = await apiFetch(`${API}/status`)
        const data = await res.json()
        setConnected(data.code === 0 ? data.data.browser.connected : false)
      } catch {
        setConnected(false)
      }
    }
    check()
    const t = setInterval(check, 5000)
    return () => clearInterval(t)
  }, [])

  const meta = PAGE_META[page]

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-52 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="px-5 pt-5 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-primary-foreground text-base select-none shadow-md shadow-primary/20">
              P
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm leading-tight tracking-tight">Puppeteer</h1>
              <p className="text-[10px] text-sidebar-foreground uppercase tracking-[0.08em] mt-px opacity-60">Render Service</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto scrollbar-thin">
          {NAV_ITEMS.map(item => {
            const active = page === item.id
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 text-left w-full group
                  ${active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-muted hover:text-foreground"
                  }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-primary rounded-r-full" />
                )}
                <span className={`transition-colors ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Bottom status pill */}
        <div className="px-3 pb-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-[11px]">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
              connected === null ? "bg-muted-foreground/40" :
              connected ? "bg-emerald-500" : "bg-red-500"
            }`} />
            <span className="text-muted-foreground truncate">
              {connected === null ? "检查中" : connected ? "服务正常" : "服务断开"}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-8 py-5 border-b bg-background/80 backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{meta.title}</h2>
            <p className="text-muted-foreground text-xs mt-0.5">{meta.desc}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-medium">
            <span className={`w-1.5 h-1.5 rounded-full ${
              connected === null ? "bg-muted-foreground/40" :
              connected ? "bg-emerald-500" : "bg-red-500"
            }`} />
            <span className="text-muted-foreground">
              {connected === null ? "检查中..." : connected ? "在线" : "离线"}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 pb-8 scrollbar-thin">
          {page === "status"   && <DashboardPage showToast={showToast} />}
          {page === "test"     && <TestPage      showToast={showToast} />}
          {page === "settings" && <SettingsPage  showToast={showToast} />}
          {page === "docs"     && <DocsPage />}
        </main>
      </div>

      {ToastContainer}
    </div>
  )
}
