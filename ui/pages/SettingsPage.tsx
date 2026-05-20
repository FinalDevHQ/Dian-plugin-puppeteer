import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardHeader, CardContent, Label, Input, Button, Badge } from "../components"
import { API } from "../types"
import type { ChromeStatus, PluginConfig, ToastType } from "../types"

interface Props {
  showToast: (msg: string, type?: ToastType) => void
}

// ── 图标 ──────────────────────────────────────────────────────────────────────

function IconChrome() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <line x1="21.17" y1="8" x2="12" y2="8" />
      <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
      <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

function IconMonitor() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

function IconProxy() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

// ── 分区标题 ──────────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 px-5 pt-5 pb-3">
      <div className="mt-0.5 w-7 h-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold leading-tight">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
    </div>
  )
}

// ── 表单字段 ──────────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

export function SettingsPage({ showToast }: Props) {
  const [executablePath, setExecutablePath] = useState("")
  const [wsEndpoint, setWsEndpoint] = useState("")
  const [width, setWidth] = useState("800")
  const [height, setHeight] = useState("600")
  const [maxPages, setMaxPages] = useState("10")
  const [saving, setSaving] = useState(false)

  // 代理
  const [proxyServer, setProxyServer] = useState("")
  const [proxyUser, setProxyUser] = useState("")
  const [proxyPass, setProxyPass] = useState("")
  const [proxyBypass, setProxyBypass] = useState("")

  const [chrome, setChrome] = useState<ChromeStatus | null>(null)
  const chromePollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
        setProxyServer(c.browser?.proxy?.server || "")
        setProxyUser(c.browser?.proxy?.username || "")
        setProxyPass(c.browser?.proxy?.password || "")
        setProxyBypass(c.browser?.proxy?.bypassList || "")
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
    return () => { if (chromePollingRef.current) clearInterval(chromePollingRef.current) }
  }, [fetchConfig, fetchChrome])

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
            proxy: proxyServer.trim() ? {
              server: proxyServer.trim(),
              username: proxyUser.trim() || undefined,
              password: proxyPass || undefined,
              bypassList: proxyBypass.trim() || undefined,
            } : undefined,
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

  const progress = chrome?.progress
  const isInstalling = chrome?.installing ?? false
  const showProgress = isInstalling || progress?.status === "completed" || progress?.status === "failed"

  // Chrome 状态徽标
  const chromeBadge = isInstalling
    ? <Badge className="border-amber-500/40 bg-amber-50 text-amber-700">安装中</Badge>
    : chrome?.installed
    ? <Badge className="border-emerald-500/40 bg-emerald-50 text-emerald-700">已安装</Badge>
    : <Badge className="border-border bg-muted/60 text-muted-foreground">未安装</Badge>

  return (
    <div className="mt-2 flex flex-col gap-5">

      {/* ── Chrome 管理 ── */}
      <Card>
        <SectionHeader
          icon={<IconChrome />}
          title="Chrome 管理"
          desc="自动安装或管理集成浏览器（部署到 Linux 时推荐）"
        />
        <div className="h-px bg-border mx-5" />
        <CardContent className="pt-4">
          {/* 状态行 */}
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* 状态指示点 */}
              <span className={`shrink-0 w-2 h-2 rounded-full ${
                isInstalling ? "bg-amber-400 animate-pulse" :
                chrome?.installed ? "bg-emerald-500" : "bg-muted-foreground/40"
              }`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {isInstalling ? "正在安装 Chrome..." : chrome?.installed ? "Chrome 已安装" : "未安装集成浏览器"}
                  </span>
                  {chromeBadge}
                </div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                  {isInstalling
                    ? (progress?.message || "准备中...")
                    : chrome?.installed
                    ? `${chrome.version || ""}  ${chrome.executablePath || ""}`
                    : "点击「安装」自动下载 Chrome for Testing"}
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {!isInstalling && !chrome?.installed && (
                <Button onClick={installChrome} className="h-8 px-4 text-xs">安装</Button>
              )}
              {!isInstalling && chrome?.installed && (
                <Button
                  variant="ghost"
                  className="h-8 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={uninstallChrome}
                >
                  卸载
                </Button>
              )}
            </div>
          </div>

          {/* 进度条 */}
          {showProgress && (
            <div className="mt-3 px-1">
              <div className="w-full bg-border rounded-full h-1 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progress?.status === "failed" ? "bg-destructive" :
                    progress?.status === "completed" ? "bg-emerald-500" : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(progress?.progress ?? (isInstalling ? 5 : 100), 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground">
                  {progress?.status === "completed" ? "安装完成"
                    : progress?.status === "failed" ? (progress.error || "安装失败")
                    : (progress?.message || "")}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">{progress?.speed || ""}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 浏览器配置 + 视口与性能 并排 ── */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <SectionHeader
            icon={<IconSettings />}
            title="浏览器配置"
            desc="配置 Puppeteer 的连接方式与启动参数"
          />
          <div className="h-px bg-border mx-5" />
          <CardContent className="pt-4 flex flex-col gap-4">
            <Field label="可执行文件路径" hint="留空则自动检测">
              <Input
                value={executablePath}
                onChange={e => setExecutablePath(e.target.value)}
                placeholder="/usr/bin/google-chrome"
                className="font-mono text-xs"
              />
            </Field>
            <Field label="远程 WebSocket 地址" hint="优先于本地启动">
              <Input
                value={wsEndpoint}
                onChange={e => setWsEndpoint(e.target.value)}
                placeholder="ws://localhost:3000"
                className="font-mono text-xs"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <SectionHeader
            icon={<IconMonitor />}
            title="视口与性能"
            desc="默认截图尺寸和最大并发页面数"
          />
          <div className="h-px bg-border mx-5" />
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "宽度",   hint: "px", value: width,    setter: setWidth },
                { label: "高度",   hint: "px", value: height,   setter: setHeight },
                { label: "并发页面", hint: "个", value: maxPages, setter: setMaxPages },
              ].map(f => (
                <Field key={f.label} label={f.label} hint={f.hint}>
                  <Input
                    type="number"
                    min={1}
                    value={f.value}
                    onChange={e => f.setter(e.target.value)}
                    className="tabular-nums"
                  />
                </Field>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 代理配置（独占一行，内容两列） ── */}
      <Card>
        <SectionHeader
          icon={<IconProxy />}
          title="代理配置"
          desc="访问国外网站时走代理，留空则直连（仅本地启动模式有效）"
        />
        <div className="h-px bg-border mx-5" />
        <CardContent className="pt-4 flex flex-col gap-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Field label="代理服务器" hint="留空则不使用代理">
              <Input
                value={proxyServer}
                onChange={e => setProxyServer(e.target.value)}
                placeholder="http://127.0.0.1:7890 或 socks5://127.0.0.1:1080"
                className="font-mono text-xs"
              />
            </Field>
            <Field label="不走代理的地址" hint="逗号分隔">
              <Input
                value={proxyBypass}
                onChange={e => setProxyBypass(e.target.value)}
                placeholder="localhost,127.0.0.1,.internal.corp"
                className="font-mono text-xs"
              />
            </Field>
            <Field label="代理用户名" hint="可选">
              <Input
                value={proxyUser}
                onChange={e => setProxyUser(e.target.value)}
                placeholder="留空跳过认证"
                className="text-xs"
              />
            </Field>
            <Field label="代理密码" hint="可选">
              <Input
                type="password"
                value={proxyPass}
                onChange={e => setProxyPass(e.target.value)}
                placeholder="••••••••"
                className="text-xs"
              />
            </Field>
          </div>
          {proxyServer.trim() && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              代理已启用：所有页面请求将通过 <span className="font-mono font-medium">{proxyServer.trim()}</span> 转发
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 保存 ── */}
      <div className="flex items-center gap-3">
        <Button onClick={saveConfig} disabled={saving} className="px-6">
          {saving ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              保存中…
            </>
          ) : "保存配置"}
        </Button>
        <span className="text-xs text-muted-foreground">修改后需重启浏览器才能生效</span>
      </div>

    </div>
  )
}
