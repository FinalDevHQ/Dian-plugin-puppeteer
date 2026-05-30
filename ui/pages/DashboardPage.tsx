import { useState, useEffect, useCallback } from "react"
import { Card, CardHeader, CardContent, Label, Button } from "../components"
import { API, apiFetch, fmtUptime } from "../types"
import type { BrowserStatus, PluginConfig, ToastType } from "../types"

interface Props {
  showToast: (msg: string, type?: ToastType) => void
}

// ── 信息行组件 ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-muted/40 rounded-lg border border-border/50">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  )
}

export function DashboardPage({ showToast }: Props) {
  const [browser, setBrowser] = useState<BrowserStatus | null>(null)
  const [config, setConfig] = useState<PluginConfig | null>(null)
  const [uptime, setUptime] = useState("—")

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/status`)
      const data = await res.json()
      if (data.code === 0) setBrowser(data.data.browser)
    } catch { /* ignore */ }
  }, [])

  const fetchConfig = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/config`)
      const data = await res.json()
      if (data.code === 0) setConfig(data.data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchStatus()
    fetchConfig()
    const t = setInterval(fetchStatus, 5000)
    return () => clearInterval(t)
  }, [fetchStatus, fetchConfig])

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
      const res = await apiFetch(`${API}/browser/${action}`, { method: "POST" })
      const data = await res.json()
      showToast(data.message || `${labels[action]}成功`, data.code === 0 ? "success" : "error")
      setTimeout(fetchStatus, 1000)
    } catch (e: any) {
      showToast(`${labels[action]}失败: ${e.message}`, "error")
    }
  }

  const connected = browser?.connected ?? false
  const proxy = config?.browser?.proxy

  return (
    <div className="flex flex-col gap-5 mt-2">

      {/* ── 顶部统计卡片 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "总渲染次数", value: browser?.totalRenders ?? "—", accent: "bg-primary/10 text-primary border-primary/20" },
          { label: "失败次数",   value: browser?.failedRenders ?? "—", accent: "bg-red-500/10 text-red-600 border-red-200" },
          { label: "当前页面数", value: browser?.pageCount ?? "—",     accent: "bg-blue-500/10 text-blue-600 border-blue-200" },
          { label: "连接模式",   value: browser ? (browser.mode === "remote" ? "远程" : "本地") : "—", accent: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
          { label: "运行时长",   value: uptime, accent: "bg-violet-500/10 text-violet-600 border-violet-200", mono: true },
        ].map(s => (
          <Card key={s.label} className="p-4 group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">{s.label}</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${s.accent}`}>
                {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
              </span>
            </div>
            <div className={`text-xl font-bold tabular-nums ${s.mono ? "font-mono" : ""}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* ── 浏览器控制 + 系统信息 并排 ── */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* 浏览器控制 */}
        <Card>
          <CardHeader>
            <Label>浏览器控制</Label>
            <p className="text-xs text-muted-foreground">控制 Puppeteer 浏览器生命周期</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => browserAction("start")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                启动
              </Button>
              <Button variant="secondary" onClick={() => browserAction("restart")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                重启
              </Button>
              <Button variant="secondary" onClick={() => browserAction("stop")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                停止
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
            <div className="flex flex-col gap-2">
              <InfoRow
                label="连接状态"
                value={
                  <span className={`flex items-center gap-1.5 ${connected ? "text-emerald-600" : "text-red-500"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`} />
                    {connected ? "已连接" : "未连接"}
                  </span>
                }
              />
              <InfoRow label="连接模式" value={browser ? (browser.mode === "remote" ? "远程连接" : "本地启动") : "—"} />
              <InfoRow label="浏览器版本" value={browser?.version || "—"} mono />
              <InfoRow label="当前页面数" value={browser?.pageCount ?? "—"} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 代理 & 网络信息 ── */}
      <Card>
        <CardHeader>
          <Label>网络 & 代理</Label>
          <p className="text-xs text-muted-foreground">当前生效的网络配置</p>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-2">
            <InfoRow
              label="代理状态"
              value={
                proxy?.server ? (
                  <span className="flex items-center gap-1.5 text-blue-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    已启用
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                    未配置
                  </span>
                )
              }
            />
            <InfoRow label="代理地址" value={proxy?.server || "—"} mono />
            <InfoRow label="代理认证" value={proxy?.username ? `${proxy.username} / ••••••` : "无"} />
            <InfoRow label="不走代理" value={proxy?.bypassList || "—"} mono />
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
