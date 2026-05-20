import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardHeader, CardContent, Label, Input, Button } from "../components"
import { API } from "../types"
import type { ChromeStatus, PluginConfig, ToastType } from "../types"

interface Props {
  showToast: (msg: string, type?: ToastType) => void
}

export function SettingsPage({ showToast }: Props) {
  const [executablePath, setExecutablePath] = useState("")
  const [wsEndpoint, setWsEndpoint] = useState("")
  const [width, setWidth] = useState("800")
  const [height, setHeight] = useState("600")
  const [maxPages, setMaxPages] = useState("10")
  const [saving, setSaving] = useState(false)

  const [chrome, setChrome] = useState<ChromeStatus | null>(null)
  const chromePollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── 数据加载 ────────────────────────────────────────────────────────────────

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/config`)
      const data = await res.json()
      if (data.code === 0) {
        const c: PluginConfig = data.data
        setExecutablePath(c.browser?.executablePath || "")
        setWsEndpoint(c.browser?.browserWSEndpoint || "")
        setWidth(String(c.browser?.defaultViewportWidth ?? 800))
        setHeight(String(c.browser?.defaultViewportHeight ?? 600))
        setMaxPages(String(c.browser?.maxPages ?? 10))
      }
    } catch { /* ignore */ }
  }, [])

  const fetchChrome = useCallback(async () => {
    try {
      const res = await fetch(`${API}/chrome/status`)
      const data = await res.json()
      if (data.code === 0) {
        setChrome(data.data as ChromeStatus)
        if (!data.data.installing && chromePollingRef.current) {
          clearInterval(chromePollingRef.current)
          chromePollingRef.current = null
        }
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchConfig()
    fetchChrome()
    return () => {
      if (chromePollingRef.current) clearInterval(chromePollingRef.current)
    }
  }, [fetchConfig, fetchChrome])

  // ── 操作 ────────────────────────────────────────────────────────────────────

  const saveConfig = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          browser: {
            executablePath,
            browserWSEndpoint: wsEndpoint,
            defaultViewportWidth: parseInt(width) || 800,
            defaultViewportHeight: parseInt(height) || 600,
            maxPages: parseInt(maxPages) || 10,
          },
        }),
      })
      const data = await res.json()
      showToast(
        data.code === 0 ? "配置已保存" : "保存失败: " + data.message,
        data.code === 0 ? "success" : "error",
      )
    } catch (e: any) {
      showToast("保存失败: " + e.message, "error")
    } finally {
      setSaving(false)
    }
  }

  const installChrome = async () => {
    showToast("正在启动 Chrome 安装任务...", "info")
    try {
      const res = await fetch(`${API}/chrome/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
      const data = await res.json()
      if (data.code === 0) {
        showToast(data.message)
        if (!chromePollingRef.current) {
          chromePollingRef.current = setInterval(fetchChrome, 1500)
        }
        setTimeout(fetchChrome, 500)
      } else {
        showToast(data.message || "安装启动失败", "error")
      }
    } catch (e: any) {
      showToast("安装失败: " + e.message, "error")
    }
  }

  const uninstallChrome = async () => {
    if (!confirm("确定要卸载集成 Chrome 吗？")) return
    try {
      const res = await fetch(`${API}/chrome/uninstall`, { method: "POST" })
      const data = await res.json()
      showToast(data.message, data.code === 0 ? "success" : "error")
      setTimeout(fetchChrome, 500)
    } catch (e: any) {
      showToast("卸载失败: " + e.message, "error")
    }
  }

  // ── 渲染 ────────────────────────────────────────────────────────────────────

  const progress = chrome?.progress
  const isInstalling = chrome?.installing ?? false
  const showProgress = isInstalling
    || progress?.status === "completed"
    || progress?.status === "failed"

  return (
    <div className="max-w-2xl mt-2 flex flex-col gap-6">
      {/* Chrome 管理 */}
      <Card>
        <CardHeader>
          <Label>Chrome 管理</Label>
          <p className="text-xs text-muted-foreground">
            自动安装或管理集成浏览器（部署到 Linux 时推荐使用）
          </p>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted/40 rounded-lg border mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  {isInstalling
                    ? "正在安装 Chrome..."
                    : chrome?.installed
                    ? "Chrome 已安装"
                    : "未安装集成浏览器"}
                </div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">
                  {isInstalling
                    ? (progress?.message || "准备中...")
                    : chrome?.installed
                    ? `${chrome.version || ""} · ${chrome.executablePath || ""}`
                    : "点击安装自动下载 Chrome for Testing（推荐 Linux 部署使用）"}
                </div>
              </div>
              <div className="flex gap-2">
                {!isInstalling && !chrome?.installed && (
                  <Button onClick={installChrome}>安装</Button>
                )}
                {!isInstalling && chrome?.installed && (
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={uninstallChrome}
                  >
                    卸载
                  </Button>
                )}
              </div>
            </div>

            {showProgress && (
              <div className="mt-3">
                <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      progress?.status === "failed" ? "bg-destructive" : "bg-primary"
                    }`}
                    style={{
                      width: `${Math.min(progress?.progress ?? (isInstalling ? 0 : 100), 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    {progress?.status === "completed"
                      ? "安装完成"
                      : progress?.status === "failed"
                      ? (progress.error || "安装失败")
                      : (progress?.message || "")}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {progress?.speed || ""}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 浏览器配置 */}
      <Card>
        <CardHeader>
          <Label>浏览器配置</Label>
          <p className="text-xs text-muted-foreground">配置 Puppeteer 浏览器连接方式和启动参数</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">浏览器可执行路径</span>
              <Input
                value={executablePath}
                onChange={e => setExecutablePath(e.target.value)}
                placeholder="留空自动检测（如 /usr/bin/google-chrome）"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">远程浏览器地址（WebSocket）</span>
              <Input
                value={wsEndpoint}
                onChange={e => setWsEndpoint(e.target.value)}
                placeholder="ws://localhost:3000"
                className="font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 视口与性能 */}
      <Card>
        <CardHeader>
          <Label>视口与性能</Label>
          <p className="text-xs text-muted-foreground">默认截图尺寸和并发控制</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "宽度 (px)",    value: width,    setter: setWidth },
              { label: "高度 (px)",    value: height,   setter: setHeight },
              { label: "最大并发页面", value: maxPages, setter: setMaxPages },
            ].map(f => (
              <div key={f.label} className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">{f.label}</span>
                <Input
                  type="number"
                  min={1}
                  value={f.value}
                  onChange={e => f.setter(e.target.value)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveConfig} disabled={saving} className="self-start px-6">
        {saving ? "保存中…" : "保存配置"}
      </Button>
    </div>
  )
}
