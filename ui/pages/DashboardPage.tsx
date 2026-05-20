import { useState, useEffect, useCallback } from "react"
import { Card, CardHeader, CardContent, Label, Button } from "../components"
import { API, fmtUptime } from "../types"
import type { BrowserStatus, ToastType } from "../types"

interface Props {
  showToast: (msg: string, type?: ToastType) => void
}

const STAT_CARDS = (b: BrowserStatus | null) => [
  { label: "总渲染次数", value: b?.totalRenders ?? "—", color: "border-l-indigo-500/60" },
  { label: "失败次数",   value: b?.failedRenders ?? "—", color: "border-l-red-500/60" },
  { label: "当前页面数", value: b?.pageCount ?? "—",     color: "border-l-blue-500/60" },
  { label: "连接模式",   value: b ? (b.mode === "remote" ? "远程" : "本地") : "—", color: "border-l-green-500/60" },
]

export function DashboardPage({ showToast }: Props) {
  const [browser, setBrowser] = useState<BrowserStatus | null>(null)
  const [uptime, setUptime] = useState("—")

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/status`)
      const data = await res.json()
      if (data.code === 0) setBrowser(data.data.browser)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchStatus()
    const t = setInterval(fetchStatus, 5000)
    return () => clearInterval(t)
  }, [fetchStatus])

  useEffect(() => {
    if (!browser?.startTime) return
    const start = browser.startTime
    const t = setInterval(() => setUptime(fmtUptime(Date.now() - start)), 1000)
    return () => clearInterval(t)
  }, [browser?.startTime])

  const browserAction = async (action: "start" | "stop" | "restart") => {
    const labels = { start: "启动", stop: "停止", restart: "重启" }
    showToast(`正在${labels[action]}浏览器...`, "info")
    try {
      const res = await fetch(`${API}/browser/${action}`, { method: "POST" })
      const data = await res.json()
      showToast(data.message || `${labels[action]}成功`, data.code === 0 ? "success" : "error")
      setTimeout(fetchStatus, 1000)
    } catch (e: any) {
      showToast(`${labels[action]}失败: ${e.message}`, "error")
    }
  }

  const connected = browser?.connected ?? false

  return (
    <div className="flex flex-col gap-5 mt-2">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS(browser).map(s => (
          <Card key={s.label} className={`p-5 border-l-4 ${s.color}`}>
            <div className="text-muted-foreground text-xs font-medium mb-1.5">{s.label}</div>
            <div className="text-2xl font-bold tabular-nums">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* 运行时长 */}
      <Card className="p-5 border-l-4 border-l-violet-500/60">
        <div className="text-muted-foreground text-xs font-medium mb-1.5">运行时长</div>
        <div className="text-2xl font-bold tabular-nums font-mono">{uptime}</div>
      </Card>

      {/* 浏览器控制 */}
      <Card>
        <CardHeader>
          <Label>浏览器控制</Label>
          <p className="text-xs text-muted-foreground">控制 Puppeteer 浏览器生命周期</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => browserAction("start")}>
              <span className="text-emerald-600">▶</span> 启动
            </Button>
            <Button variant="secondary" onClick={() => browserAction("restart")}>
              <span className="text-amber-500">↺</span> 重启
            </Button>
            <Button variant="secondary" onClick={() => browserAction("stop")}>
              <span className="text-red-500">■</span> 停止
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 系统信息 */}
      <Card>
        <CardHeader>
          <Label>系统信息</Label>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between p-3 bg-muted/40 rounded-lg border">
              <span className="text-muted-foreground">连接状态</span>
              <span className={`flex items-center gap-1.5 font-medium ${connected ? "text-emerald-600" : "text-red-500"}`}>
                <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`} />
                {connected ? "已连接" : "未连接"}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-muted/40 rounded-lg border">
              <span className="text-muted-foreground">连接模式</span>
              <span className="font-medium">{browser ? (browser.mode === "remote" ? "远程连接" : "本地启动") : "—"}</span>
            </div>
            <div className="flex justify-between p-3 bg-muted/40 rounded-lg border">
              <span className="text-muted-foreground">浏览器版本</span>
              <span className="font-medium font-mono text-xs">{browser?.version || "—"}</span>
            </div>
            <div className="flex justify-between p-3 bg-muted/40 rounded-lg border">
              <span className="text-muted-foreground">页面数量</span>
              <span className="font-medium">{browser?.pageCount ?? "—"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
