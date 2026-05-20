import { useState, useEffect } from "react"
import { useToast } from "./hooks/useToast"
import { DashboardPage } from "./pages/DashboardPage"
import { TestPage } from "./pages/TestPage"
import { SettingsPage } from "./pages/SettingsPage"
import { API, PAGE_META } from "./types"
import type { Page } from "./types"

// ── Nav items (keep SVG icons here alongside routing) ───────────────────────

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode }[] = [
  {
    id: "status",
    label: "仪表盘",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: "test",
    label: "截图调试",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "系统设置",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
        const res = await fetch(`${API}/status`)
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
      <aside className="w-56 flex-shrink-0 border-r flex flex-col">
        <div className="p-5 flex items-center gap-3 mb-2">
          <div className="w-8 h-8 flex items-center justify-center bg-foreground rounded-lg text-background text-lg select-none">
            🎨
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight">Puppeteer</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Render Service</p>
          </div>
        </div>

        <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left w-full
                ${page === item.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-5 border-b">
          <div>
            <h2 className="text-xl font-bold">{meta.title}</h2>
            <p className="text-muted-foreground text-sm mt-0.5">{meta.desc}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium">
            <span className={`w-2 h-2 rounded-full ${connected === null ? "bg-muted-foreground" : connected ? "bg-emerald-500" : "bg-red-500"}`} />
            <span className="text-muted-foreground">
              {connected === null ? "检查中..." : connected ? "服务正常" : "服务断开"}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 pb-8">
          {page === "status"   && <DashboardPage showToast={showToast} />}
          {page === "test"     && <TestPage      showToast={showToast} />}
          {page === "settings" && <SettingsPage  showToast={showToast} />}
        </main>
      </div>

      {ToastContainer}
    </div>
  )
}
